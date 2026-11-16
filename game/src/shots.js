// Lumen Drift — deterministic screenshot scenes.
// One clear job: build a fixed, good-looking state for each screenshot the
// entry hands in (?shot=title|play|victory|gameover&seed=N), with a seeded
// world and a fixed amount of simulated time, then say the frame is ready.

import { VIEW } from './config.js';
import { createWorld, buildWave, updatePlay, updateTitle } from './world.js';

const SHOT_SEED = 20261116;

/** A simulated play state: ship mid-orbit, shards half-collected, mines near. */
function playState(seed) {
  const world = createWorld(seed, 18400);
  world.phase = 'play';
  world.score = 12450;
  world.combo = 4;
  world.comboTimer = 2.2;
  world.shardsCollected = 4;
  world.ship.x = 560;
  world.ship.y = 430;
  world.ship.vx = 240;
  world.ship.vy = -160;
  // Half the shards already gathered, for a lived-in HUD.
  world.shards.slice(0, 4).forEach((s) => { s.taken = true; });
  // A few sparkles near the ship so the frame reads as action.
  for (let i = 0; i < 10; i += 1) {
    const a = world.rng.angle();
    world.particles.push({
      x: world.ship.x + Math.cos(a) * 60,
      y: world.ship.y + Math.sin(a) * 60,
      vx: Math.cos(a) * 90,
      vy: Math.sin(a) * 90,
      life: 0.6,
      maxLife: 0.6,
      size: 3,
      color: '#ffd166',
      drag: 1,
    });
  }
  return world;
}

/** A finished run's numbers for the end screens. */
function endState(seed, victory) {
  const world = createWorld(seed, 24800);
  world.score = victory ? 31200 : 18750;
  world.wavesCleared = victory ? 10 : 6;
  world.wave = victory ? 10 : 7;
  world.shardsTotal = victory ? 92 : 54;
  world.slingshots = victory ? 31 : 18;
  world.burns = victory ? 7 : 3;
  world.bestCombo = victory ? 8 : 6;
  world.hull = victory ? 2 : 0;
  world.phase = victory ? 'victory' : 'gameover';
  world.best = 24800;
  return world;
}

/**
 * Build the world for one shot scene and run it a fixed number of steps so
 * trails, bobs and particles settle. Returns { world, mode }.
 */
export function buildShotScene(scene, seed = SHOT_SEED) {
  if (scene === 'title') {
    const world = createWorld(seed, 18400);
    world.phase = 'title';
    for (let i = 0; i < 240; i += 1) updateTitle(world, 1 / 60);
    return { world, mode: 'title' };
  }
  if (scene === 'play') {
    const world = playState(seed);
    // Settle the ship's trail and the shard bobs.
    for (let i = 0; i < 90; i += 1) {
      world.time += 1 / 60;
      for (const shard of world.shards) shard.bob += (1 / 60) * 2.2;
      world.ship.trail.push({ x: world.ship.x - i * 2.4, y: world.ship.y + i * 1.6 });
      if (world.ship.trail.length > 26) world.ship.trail.shift();
    }
    return { world, mode: 'play' };
  }
  if (scene === 'victory') {
    const world = endState(seed, true);
    buildWave(world, 10);
    world.shards.forEach((s) => { s.taken = true; });
    return { world, mode: 'victory' };
  }
  if (scene === 'gameover') {
    const world = endState(seed, false);
    buildWave(world, 7);
    return { world, mode: 'gameover' };
  }
  return null;
}

/** Read ?shot=<scene>&seed=<n> from the page URL, if present. */
export function readShotQuery() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const seed = Number.parseInt(params.get('seed') || String(SHOT_SEED), 10);
  return { shot, seed: Number.isFinite(seed) ? seed : SHOT_SEED };
}
