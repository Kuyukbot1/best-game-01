// Lumen Drift — boot and the game loop.
// One clear job: own the screens (title, play, boon choice, victory, game
// over, pause), run the world on a fixed 1/60 s step, and hand the renderer
// one frame at a time. Screenshot mode (?shot=…) renders one fixed scene.

import { VIEW } from './config.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { createWorld, buildWave, updatePlay, updateTitle, drawBoons, applyBoon, resetShip } from './world.js';
import { makeStarfield, render } from './render.js';
import { buildShotScene, readShotQuery } from './shots.js';

const BEST_KEY = 'lumen-drift-best';
const STEP = 1 / 60;

function loadBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage unavailable (private mode, file://): the best is session-only.
  }
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const sound = new SoundEngine();

const shot = readShotQuery();
let world;
let mode;
let paused = false;
let starfield;

if (shot) {
  // Screenshot mode: one deterministic scene, rendered once, then flagged.
  document.body.classList.add('shot');
  const scene = buildShotScene(shot.shot, shot.seed);
  if (scene) {
    world = scene.world;
    mode = scene.mode;
    starfield = makeStarfield(world.seed);
    render(ctx, world, starfield, mode, false);
    window.__shotReady = true;
  } else {
    document.body.textContent = `unknown shot scene: ${shot.shot}`;
  }
} else {
  world = createWorld(20261116, loadBest());
  mode = 'title';
  starfield = makeStarfield(world.seed);
  world.phase = 'title';

  // A read-only handle for automated playtests (and curious players):
  // the live world, the current screen, the pause flag and the pointer.
  window.__lumen = {
    get world() {
      return world;
    },
    get mode() {
      return mode;
    },
    get paused() {
      return paused;
    },
    get mouse() {
      return { x: input.mouse.x, y: input.mouse.y, down: input.mouse.down };
    },
  };

  let last = performance.now();
  let acc = 0;

  function startGame() {
    sound.unlock();
    sound.click();
    world = createWorld((Math.random() * 0xffffffff) >>> 0, loadBest());
    starfield = makeStarfield(world.seed);
    mode = 'play';
    world.phase = 'play';
    paused = false;
  }

  function startWaveAfterBoon() {
    buildWave(world, world.wave + 1);
    resetShip(world, true);
    world.phase = 'play';
    mode = 'play';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (paused) {
      // The loop below never runs while paused, so the resume and mute
      // keys are handled here or a pause could never be left.
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
        paused = false;
        sound.click();
      }
      if (input.wasPressed('KeyM')) {
        sound.unlock();
        sound.setMuted(!sound.muted);
        world.muted = sound.muted;
      }
      render(ctx, world, starfield, mode, true);
      input.consume();
      return;
    }
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      acc -= STEP;
      steps += 1;
      step(STEP);
    }
    if (steps === 5) acc = 0;
    render(ctx, world, starfield, mode, false);
    input.consume();
  }

  function step(dt) {
    // Global keys, on every screen.
    if (input.wasPressed('KeyM')) {
      sound.unlock();
      sound.setMuted(!sound.muted);
      world.muted = sound.muted;
    }
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      if (mode === 'play' || mode === 'clear') {
        paused = !paused;
        sound.click();
        return;
      }
    }
    if (mode === 'title') {
      updateTitle(world, dt);
      if (input.clicked || input.wasPressed('Enter') || input.wasPressed('Space')) {
        startGame();
      }
      return;
    }
    if (mode === 'play') {
      updatePlay(world, input, dt, sound);
      if (world.phase === 'gameover') {
        mode = 'gameover';
        saveBest(world.best);
      } else if (world.phase === 'victory') {
        mode = 'victory';
        saveBest(world.best);
      } else if (world.phase === 'clear') {
        mode = 'clear';
        world.phaseTimer += dt;
        if (world.phaseTimer > 1.6) {
          drawBoons(world);
          world.phase = 'boon';
          mode = 'boon';
        }
      }
      return;
    }
    if (mode === 'clear') {
      world.phaseTimer += dt;
      if (world.phaseTimer > 1.6) {
        drawBoons(world);
        world.phase = 'boon';
        mode = 'boon';
      }
      return;
    }
    if (mode === 'boon') {
      // Hover a card with the mouse, or press its number key.
      const card = hoveredBoonCard();
      world.hoverBoon = card;
      let picked = -1;
      if (input.clicked && card >= 0) picked = card;
      for (let i = 0; i < world.boonOptions.length; i += 1) {
        if (input.wasPressed(`Digit${i + 1}`)) picked = i;
      }
      if (picked >= 0) {
        sound.unlock();
        sound.boon();
        applyBoon(world, world.boonOptions[picked]);
        startWaveAfterBoon();
      }
      return;
    }
    if (mode === 'gameover' || mode === 'victory') {
      if (input.clicked || input.wasPressed('Enter') || input.wasPressed('Space')) {
        startGame();
      }
      return;
    }
  }

  /** Which boon card the mouse is over, or -1. */
  function hoveredBoonCard() {
    const cardW = 300;
    const cardH = 190;
    const gap = 28;
    const total = cardW * 3 + gap * 2;
    const x0 = (VIEW.width - total) / 2;
    const y0 = 250;
    const { x, y } = input.mouse;
    if (y < y0 || y > y0 + cardH) return -1;
    for (let i = 0; i < 3; i += 1) {
      const cx = x0 + i * (cardW + gap);
      if (x >= cx && x <= cx + cardW) return i;
    }
    return -1;
  }

  // The title screen's world must already be moving on the first frame.
  canvas.addEventListener('mousedown', () => sound.unlock());
  window.addEventListener('keydown', () => sound.unlock(), { once: true });
  requestAnimationFrame(frame);
}
