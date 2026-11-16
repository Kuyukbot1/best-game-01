// Lumen Drift — the simulation: ship, gravity, shards, mines, hunters,
// waves, boons and scoring. One clear job: the rules of the game. It knows
// nothing about the DOM or the canvas; the renderer reads its state.

import { VIEW, SHIP, GRAVITY, WAVES, SCORE, BOONS } from './config.js';
import { makeRandom } from './random.js';

const TAU = Math.PI * 2;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function clampSpeed(vx, vy, max) {
  const speed = Math.hypot(vx, vy);
  if (speed <= max) return [vx, vy];
  const k = max / speed;
  return [vx * k, vy * k];
}

/** A fresh world. `best` is the saved best score, shown on the title. */
export function createWorld(seed, best = 0) {
  const rng = makeRandom(seed);
  const world = {
    seed,
    rng,
    time: 0,
    wave: 1,
    score: 0,
    best,
    combo: 1,
    comboTimer: 0,
    hull: 3,
    maxHull: 3,
    shields: 0,
    magnet: 0,
    thrust: 0,
    comboWindow: SCORE.comboWindow,
    comboCap: SCORE.comboCap,
    shardsCollected: 0,
    shardsGoal: WAVES.table[0].shards,
    shardsTotal: 0,
    bestCombo: 1,
    slingshots: 0,
    burns: 0,
    wavesCleared: 0,
    phase: 'title', // title | play | clear | boon | victory | gameover
    phaseTimer: 0,
    banner: null,
    boonOptions: [],
    ship: null,
    stars: [],
    shards: [],
    mines: [],
    hunters: [],
    particles: [],
    floaters: [],
    mineRespawns: [],
    shake: 0,
    hitStop: 0,
    flash: 0,
    muted: false,
  };
  buildWave(world, 1);
  resetShip(world, true);
  return world;
}

/** Lay out one wave's stars, shards, mines and hunters. */
export function buildWave(world, wave) {
  const spec = WAVES.table[wave - 1];
  const { rng } = world;
  world.wave = wave;
  world.shardsGoal = spec.shards;
  world.shardsCollected = 0;
  world.stars = [];
  world.shards = [];
  world.mines = [];
  world.hunters = [];
  world.mineRespawns = [];
  // Three gravity wells, spread so no two overlap the centre.
  const spots = [
    { x: 0.3, y: 0.32 },
    { x: 0.68, y: 0.62 },
    { x: 0.62, y: 0.24 },
  ];
  for (const spot of spots) {
    world.stars.push({
      x: spot.x * VIEW.width + rng.range(-50, 50),
      y: spot.y * VIEW.height + rng.range(-40, 40),
      core: GRAVITY.coreRadius,
      ring: GRAVITY.slingshotRing,
      hue: rng.pick([42, 190, 320]),
      phase: rng.angle(),
      inside: false,
    });
  }
  const farFromStars = (x, y, margin) =>
    world.stars.every((s) => dist(x, y, s.x, s.y) > s.ring + margin);
  for (let i = 0; i < spec.shards; i += 1) {
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      x = rng.range(60, VIEW.width - 60);
      y = rng.range(60, VIEW.height - 60);
      tries += 1;
    } while (tries < 40 && !farFromStars(x, y, 30));
    world.shards.push({ x, y, taken: false, bob: rng.angle(), kind: 'shard' });
  }
  for (let i = 0; i < spec.mines; i += 1) {
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      x = rng.range(80, VIEW.width - 80);
      y = rng.range(80, VIEW.height - 80);
      tries += 1;
    } while (tries < 40 && !farFromStars(x, y, 70));
    const angle = rng.angle();
    world.mines.push({
      x,
      y,
      vx: Math.cos(angle) * spec.mineSpeed,
      vy: Math.sin(angle) * spec.mineSpeed,
      r: 16,
      pulse: rng.angle(),
    });
  }
  for (let i = 0; i < spec.hunters; i += 1) {
    const edge = rng.pick(['top', 'bottom', 'left', 'right']);
    const x = edge === 'left' ? 40 : edge === 'right' ? VIEW.width - 40 : rng.range(100, VIEW.width - 100);
    const y = edge === 'top' ? 40 : edge === 'bottom' ? VIEW.height - 40 : rng.range(100, VIEW.height - 100);
    world.hunters.push({ x, y, vx: 0, vy: 0, r: 17, speed: spec.hunterSpeed, alive: true });
  }
}

/** Put the ship at a safe launch point with a fresh trail. */
export function resetShip(world, fresh = false) {
  const spot = { x: VIEW.width / 2, y: VIEW.height - 90 };
  world.ship = {
    x: spot.x,
    y: spot.y,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    trail: [],
    invuln: fresh ? 0 : SHIP.invulnerableSeconds,
    thrusting: 0,
  };
}

/** Pick three distinct boons for the between-wave choice. */
export function drawBoons(world) {
  const pool = [...BOONS];
  const options = [];
  while (options.length < 3 && pool.length > 0) {
    const i = Math.floor(world.rng.next() * pool.length);
    options.push(pool.splice(i, 1)[0]);
  }
  world.boonOptions = options;
  return options;
}

export function applyBoon(world, boon) {
  boon.apply(world);
}

function addScore(world, base, x, y, label) {
  const gained = base * world.combo;
  world.score += gained;
  world.floaters.push({ x, y, text: `+${gained}${label ? ` ${label}` : ''}`, life: 1.1, maxLife: 1.1 });
  return gained;
}

export function burst(world, x, y, color, count, speed, size = 3) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng.angle();
    const v = world.rng.range(speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: world.rng.range(0.4, 0.9),
      maxLife: 0.9,
      size: world.rng.range(size * 0.5, size * 1.4),
      color,
      drag: 2.2,
    });
  }
}

function ringBurst(world, x, y, color) {
  for (let i = 0; i < 26; i += 1) {
    const angle = (i / 26) * TAU;
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * 190,
      vy: Math.sin(angle) * 190,
      life: 0.55,
      maxLife: 0.55,
      size: 3,
      color,
      drag: 1.4,
    });
  }
}

function hurtShip(world, sound, cause) {
  if (world.ship.invuln > 0 || world.phase !== 'play') return;
  if (world.shields > 0) {
    world.shields -= 1;
    world.ship.invuln = SHIP.invulnerableSeconds;
    world.shake = Math.max(world.shake, 7);
    burst(world, world.ship.x, world.ship.y, '#7dffb2', 22, 260);
    sound.hit();
    world.floaters.push({ x: world.ship.x, y: world.ship.y - 30, text: 'SHIELD DOWN', life: 1.0, maxLife: 1.0 });
    return;
  }
  world.hull -= 1;
  world.combo = 1;
  world.comboTimer = 0;
  world.shake = 14;
  world.hitStop = 0.12;
  world.flash = 0.35;
  burst(world, world.ship.x, world.ship.y, '#ff5d73', 42, 340, 4);
  sound.explosion();
  if (world.hull <= 0) {
    world.phase = 'gameover';
    world.phaseTimer = 0;
    world.best = Math.max(world.best, world.score);
    sound.gameOver();
    return;
  }
  resetShip(world);
  world.floaters.push({ x: world.ship.x, y: world.ship.y - 30, text: cause, life: 1.2, maxLife: 1.2 });
}

/** One fixed simulation step while playing. */
export function updatePlay(world, input, dt, sound) {
  const ship = world.ship;
  world.time += dt;
  if (world.hitStop > 0) {
    world.hitStop -= dt;
    return;
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 1.4);

  // Steering: the mouse pulls the ship; WASD/arrows push it too. The pull
  // eases off as the ship nears the cursor (full power while boosting), so
  // the ship settles on the cursor instead of orbiting it forever.
  const boosting = input.mouse.down || input.held('Space');
  let ax = 0;
  let ay = 0;
  const toMouseX = input.mouse.x - ship.x;
  const toMouseY = input.mouse.y - ship.y;
  const mouseDist = Math.hypot(toMouseX, toMouseY);
  if (mouseDist > 24) {
    const ease = boosting ? 1 : 0.3 + 0.7 * Math.min(1, mouseDist / 220);
    const pull = SHIP.accel * (1 + world.thrust * 1.0) * ease;
    ax += (toMouseX / mouseDist) * pull;
    ay += (toMouseY / mouseDist) * pull;
  }
  const keyX = (input.held('KeyD', 'ArrowRight') ? 1 : 0) - (input.held('KeyA', 'ArrowLeft') ? 1 : 0);
  const keyY = (input.held('KeyS', 'ArrowDown') ? 1 : 0) - (input.held('KeyW', 'ArrowUp') ? 1 : 0);
  if (keyX !== 0 || keyY !== 0) {
    const len = Math.hypot(keyX, keyY);
    ax += (keyX / len) * SHIP.accel * 1.15;
    ay += (keyY / len) * SHIP.accel * 1.15;
  }
  if (boosting && mouseDist > 24) {
    const pull = SHIP.boostAccel * (1 + world.thrust * 1.0);
    ax += (toMouseX / mouseDist) * pull;
    ay += (toMouseY / mouseDist) * pull;
  }
  if (input.held('ShiftLeft', 'ShiftRight')) {
    const k = Math.exp(-SHIP.brake * dt);
    ship.vx *= k;
    ship.vy *= k;
  }
  // Gravity from every star.
  for (const star of world.stars) {
    const dx = star.x - ship.x;
    const dy = star.y - ship.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 1;
    if (d > star.core) {
      const pull = Math.min(GRAVITY.pull / d2, 900);
      ax += (dx / d) * pull;
      ay += (dy / d) * pull;
    }
    // Slingshot: crossing into the ring scores once per visit.
    if (d < star.ring && !star.inside && d > star.core) {
      star.inside = true;
      world.slingshots += 1;
      addScore(world, SCORE.slingshot, ship.x, ship.y - 24, 'SLINGSHOT');
      world.combo = Math.min(world.combo + 1, world.comboCap);
      world.comboTimer = world.comboWindow;
      ringBurst(world, star.x, star.y, '#35f0ff');
      sound.slingshot();
    } else if (d > star.ring + 24) {
      star.inside = false;
    }
    if (d <= star.core) {
      hurtShip(world, sound, 'BURNED BY A STAR');
      return;
    }
  }
  ship.vx += ax * dt;
  ship.vy += ay * dt;
  const dragK = Math.exp(-SHIP.drag * dt);
  ship.vx *= dragK;
  ship.vy *= dragK;
  [ship.vx, ship.vy] = clampSpeed(ship.vx, ship.vy, SHIP.maxSpeed);
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  // Settle on the cursor: heavy damping very close to it, so the ship
  // stops on a shard instead of orbiting just outside pickup range.
  if (mouseDist < 56) {
    const k = Math.exp(-5 * dt);
    ship.vx *= k;
    ship.vy *= k;
  }
  // Soft bounce off the arena edges.
  if (ship.x < SHIP.radius) { ship.x = SHIP.radius; ship.vx = Math.abs(ship.vx) * 0.6; }
  if (ship.x > VIEW.width - SHIP.radius) { ship.x = VIEW.width - SHIP.radius; ship.vx = -Math.abs(ship.vx) * 0.6; }
  if (ship.y < SHIP.radius) { ship.y = SHIP.radius; ship.vy = Math.abs(ship.vy) * 0.6; }
  if (ship.y > VIEW.height - SHIP.radius) { ship.y = VIEW.height - SHIP.radius; ship.vy = -Math.abs(ship.vy) * 0.6; }
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > 40) {
    const target = Math.atan2(ship.vy, ship.vx);
    let diff = target - ship.angle;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    ship.angle += Math.max(-SHIP.turn * dt, Math.min(SHIP.turn * dt, diff));
  }
  ship.thrusting = boosting ? 1 : Math.min(1, mouseDist / 320);
  sound.setThrust(ship.thrusting);
  if (ship.invuln > 0) ship.invuln -= dt;
  ship.trail.push({ x: ship.x, y: ship.y });
  if (ship.trail.length > SHIP.trailLength) ship.trail.shift();
  if (Math.random() < 0.6) {
    world.particles.push({
      x: ship.x - Math.cos(ship.angle) * 14,
      y: ship.y - Math.sin(ship.angle) * 14,
      vx: -ship.vx * 0.08 + (Math.random() - 0.5) * 30,
      vy: -ship.vy * 0.08 + (Math.random() - 0.5) * 30,
      life: 0.35,
      maxLife: 0.35,
      size: 2.5,
      color: '#35f0ff',
      drag: 1,
    });
  }

  // Combo clock.
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 1;
  }

  // Shards: bob, magnet, collect.
  const pickupRadius = 30 * (1 + world.magnet);
  for (const shard of world.shards) {
    if (shard.taken) continue;
    shard.bob += dt * 2.2;
    const d = dist(ship.x, ship.y, shard.x, shard.y + Math.sin(shard.bob) * 4);
    if (d < pickupRadius + 10) {
      shard.taken = true;
      world.shardsCollected += 1;
      world.shardsTotal += 1;
      addScore(world, SCORE.shard, shard.x, shard.y - 18, '');
      world.combo = Math.min(world.combo + 1, world.comboCap);
      world.bestCombo = Math.max(world.bestCombo, world.combo);
      world.comboTimer = world.comboWindow;
      burst(world, shard.x, shard.y, '#ffd166', 14, 180);
      sound.pickup(world.combo);
      if (world.shardsCollected >= world.shardsGoal) {
        clearWave(world, sound);
        return;
      }
    }
  }

  // Mines: drift, bounce, collide, respawn after being destroyed.
  for (const mine of world.mines) {
    mine.x += mine.vx * dt;
    mine.y += mine.vy * dt;
    mine.pulse += dt * 3;
    if (mine.x < mine.r || mine.x > VIEW.width - mine.r) mine.vx *= -1;
    if (mine.y < mine.r || mine.y > VIEW.height - mine.r) mine.vy *= -1;
    if (dist(ship.x, ship.y, mine.x, mine.y) < mine.r + SHIP.radius - 2) {
      burst(world, mine.x, mine.y, '#ff4d8d', 30, 300, 4);
      world.mines.splice(world.mines.indexOf(mine), 1);
      world.mineRespawns.push({ timer: 3 });
      hurtShip(world, sound, 'HIT A VOID MINE');
      return;
    }
  }
  for (const respawn of world.mineRespawns) respawn.timer -= dt;
  while (world.mineRespawns.length > 0 && world.mineRespawns[0].timer <= 0) {
    world.mineRespawns.shift();
    const spec = WAVES.table[world.wave - 1];
    const edge = world.rng.pick(['top', 'bottom', 'left', 'right']);
    const x = edge === 'left' ? 40 : edge === 'right' ? VIEW.width - 40 : world.rng.range(100, VIEW.width - 100);
    const y = edge === 'top' ? 40 : edge === 'bottom' ? VIEW.height - 40 : world.rng.range(100, VIEW.height - 100);
    const angle = world.rng.angle();
    world.mines.push({ x, y, vx: Math.cos(angle) * spec.mineSpeed, vy: Math.sin(angle) * spec.mineSpeed, r: 16, pulse: 0 });
  }

  // Hunters: chase the ship, burn up in a star.
  for (const hunter of world.hunters) {
    if (!hunter.alive) continue;
    const dx = ship.x - hunter.x;
    const dy = ship.y - hunter.y;
    const d = Math.hypot(dx, dy) || 1;
    hunter.vx += (dx / d) * hunter.speed * dt * 2.4;
    hunter.vy += (dy / d) * hunter.speed * dt * 2.4;
    [hunter.vx, hunter.vy] = clampSpeed(hunter.vx, hunter.vy, hunter.speed);
    hunter.x += hunter.vx * dt;
    hunter.y += hunter.vy * dt;
    for (const star of world.stars) {
      if (dist(hunter.x, hunter.y, star.x, star.y) <= star.core + 4) {
        hunter.alive = false;
        world.burns += 1;
        addScore(world, SCORE.hunterBurn, hunter.x, hunter.y - 20, 'STAR-BURN');
        burst(world, hunter.x, hunter.y, '#c86bff', 34, 320, 4);
        sound.explosion();
        break;
      }
    }
    if (hunter.alive && dist(ship.x, ship.y, hunter.x, hunter.y) < hunter.r + SHIP.radius - 2) {
      hunter.alive = false;
      burst(world, hunter.x, hunter.y, '#c86bff', 30, 300, 4);
      hurtShip(world, sound, 'CAUGHT BY A HUNTER');
      return;
    }
  }

  updateParticles(world, dt);
}

function clearWave(world, sound) {
  const bonus = SCORE.waveClear + SCORE.waveClearPerWave * world.wave;
  world.score += bonus;
  world.wavesCleared = world.wave;
  sound.waveClear();
  burst(world, world.ship.x, world.ship.y, '#ffd166', 40, 320, 4);
  if (world.wave >= WAVES.count) {
    world.phase = 'victory';
    world.phaseTimer = 0;
    world.best = Math.max(world.best, world.score);
    sound.victory();
    return;
  }
  world.phase = 'clear';
  world.phaseTimer = 0;
  world.banner = { text: `WAVE ${world.wave} CLEAR`, sub: `+${bonus} bonus`, life: 1.8, maxLife: 1.8 };
}

/** Ambient title flight: the ship orbits the middle star, no danger. */
export function updateTitle(world, dt) {
  world.time += dt;
  const ship = world.ship;
  const star = world.stars[1];
  const t = world.time * 0.24;
  const rx = 250;
  const ry = 165;
  ship.x = star.x + Math.cos(t) * rx;
  ship.y = star.y + Math.sin(t * 1.3) * ry;
  ship.vx = -Math.sin(t) * rx * 0.24;
  ship.vy = Math.cos(t * 1.3) * ry * 0.24 * 1.3;
  ship.angle = Math.atan2(ship.vy, ship.vx);
  ship.thrusting = 0.5;
  ship.trail.push({ x: ship.x, y: ship.y });
  if (ship.trail.length > SHIP.trailLength) ship.trail.shift();
  for (const shard of world.shards) shard.bob += dt * 2.2;
  for (const mine of world.mines) {
    mine.x += mine.vx * dt * 0.4;
    mine.y += mine.vy * dt * 0.4;
    mine.pulse += dt * 3;
    if (mine.x < mine.r || mine.x > VIEW.width - mine.r) mine.vx *= -1;
    if (mine.y < mine.r || mine.y > VIEW.height - mine.r) mine.vy *= -1;
  }
  updateParticles(world, dt);
}

function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.life -= dt;
    const k = Math.exp(-p.drag * dt);
    p.vx *= k;
    p.vy *= k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floaters) {
    f.life -= dt;
    f.y -= 34 * dt;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);
  if (world.banner) {
    world.banner.life -= dt;
    if (world.banner.life <= 0) world.banner = null;
  }
}
