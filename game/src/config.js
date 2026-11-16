// Lumen Drift — tuning, palette and wave table.
// One clear job: every number the game balances on lives here, so tuning
// never means hunting through the simulation or the renderer.

export const VIEW = { width: 1280, height: 720 };

export const PALETTE = {
  spaceTop: '#0a1030',
  spaceBottom: '#04061a',
  nebulaA: 'rgba(88, 60, 220, 0.20)',
  nebulaB: 'rgba(20, 180, 190, 0.16)',
  nebulaC: 'rgba(255, 77, 141, 0.10)',
  star: '#ffe9a8',
  starCore: '#fff6d8',
  ship: '#35f0ff',
  shipGlow: 'rgba(53, 240, 255, 0.55)',
  shard: '#ffd166',
  shardGlow: 'rgba(255, 209, 102, 0.6)',
  mine: '#ff4d8d',
  mineGlow: 'rgba(255, 77, 141, 0.55)',
  hunter: '#c86bff',
  hunterGlow: 'rgba(200, 107, 255, 0.55)',
  text: '#eaf6ff',
  dimText: '#8fa8c8',
  gold: '#ffd166',
  danger: '#ff5d73',
  ok: '#7dffb2',
  panel: 'rgba(8, 14, 38, 0.82)',
  panelEdge: 'rgba(120, 200, 255, 0.35)',
};

export const SHIP = {
  radius: 13,
  accel: 340, // px/s^2 steering toward the cursor
  boostAccel: 720, // px/s^2 while boosting
  drag: 0.35, // exponential velocity loss per second, always
  maxSpeed: 560,
  turn: 9.0, // radians/s the nose chases the velocity
  brake: 3.2, // exponential velocity loss per second while braking
  invulnerableSeconds: 2.0,
  trailLength: 26,
};

export const GRAVITY = {
  pull: 420000, // G * star mass, px^3/s^2: a real curve near the ring
  slingshotRing: 118, // px from a star's centre: crossing it scores
  coreRadius: 34, // px: touching the core burns the hull
  respawnMargin: 90,
};

export const WAVES = {
  count: 10,
  // shards to collect, mines, hunters, mine drift speed, hunter speed
  table: [
    { shards: 6, mines: 2, hunters: 0, mineSpeed: 14, hunterSpeed: 0 },
    { shards: 7, mines: 3, hunters: 0, mineSpeed: 16, hunterSpeed: 0 },
    { shards: 8, mines: 3, hunters: 1, mineSpeed: 18, hunterSpeed: 62 },
    { shards: 8, mines: 4, hunters: 1, mineSpeed: 20, hunterSpeed: 68 },
    { shards: 9, mines: 4, hunters: 2, mineSpeed: 22, hunterSpeed: 74 },
    { shards: 9, mines: 5, hunters: 2, mineSpeed: 24, hunterSpeed: 80 },
    { shards: 10, mines: 5, hunters: 2, mineSpeed: 27, hunterSpeed: 86 },
    { shards: 10, mines: 6, hunters: 3, mineSpeed: 30, hunterSpeed: 92 },
    { shards: 11, mines: 6, hunters: 3, mineSpeed: 33, hunterSpeed: 98 },
    { shards: 12, mines: 7, hunters: 3, mineSpeed: 36, hunterSpeed: 104 },
  ],
};

export const SCORE = {
  shard: 100,
  slingshot: 50,
  hunterBurn: 250,
  waveClear: 500,
  waveClearPerWave: 100,
  comboWindow: 3.0, // seconds a pickup keeps the combo alive
  comboCap: 8,
};

export const BOONS = [
  {
    id: 'shield',
    key: '1',
    name: 'Shield Cell',
    blurb: 'Absorb one hit. Stacks.',
    apply: (s) => { s.shields += 1; },
  },
  {
    id: 'magnet',
    key: '2',
    name: 'Magnet Coil',
    blurb: '+70% shard pickup radius.',
    apply: (s) => { s.magnet += 0.7; },
  },
  {
    id: 'thrusters',
    key: '3',
    name: 'Ion Thrusters',
    blurb: '+25% thrust and boost.',
    apply: (s) => { s.thrust += 0.25; },
  },
  {
    id: 'hull',
    key: '4',
    name: 'Hull Plate',
    blurb: '+1 max hull, and repair 1.',
    apply: (s) => { s.maxHull += 1; s.hull = Math.min(s.maxHull, s.hull + 1); },
  },
  {
    id: 'lens',
    key: '5',
    name: 'Combo Lens',
    blurb: 'Combo window +1.5s, cap +2.',
    apply: (s) => { s.comboWindow += 1.5; s.comboCap += 2; },
  },
];

export const AUDIO = {
  master: 0.5,
  music: 0.16,
  sfx: 0.9,
};
