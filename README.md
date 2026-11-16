[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Kuyukbot1/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Kuyukbot1/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

An entry for the [make.fun bounty](https://make.fun/bounty/best-game-01).

# Lumen Drift

A neon gravity-orbit arcade game. You pilot the Lumen, a small light-ship,
through a nebula: slingshot around stars for bonus points, gather every star
shard, dodge void mines, and lure void hunters into stars to burn them up.
Ten waves, each harder than the last — clear all ten and the nebula is lit.

## How to play

- **Mouse steers** — the ship thrusts toward your cursor.
- **Hold mouse / Space** — boost.
- **Shift** — brake.
- **Slingshot** — cross a star's dashed ring for a bonus and a combo step.
- **Shards** — collect them all to clear the wave; pickups chain a combo.
- **Hunters** — they chase you, but a star's core burns them: +250.
- **Between waves** — pick one of three upgrades (shield, magnet, thrusters,
  hull plate, combo lens).
- **P** pause · **M** mute · **Enter / click** start and restart.

Lose all hull and the light fades; clear wave 10 and you win. Your best
score is kept in the browser. All art is drawn in code and all sound is
synthesised with WebAudio — no assets, no network, fully offline.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

## Layout

- `game/index.html` — page shell, canvas, HUD hint
- `game/style.css` — page shell styles
- `game/src/config.js` — tuning, palette, wave table, boons
- `game/src/random.js` — seeded randomness
- `game/src/audio.js` — procedural WebAudio SFX and music
- `game/src/input.js` — keyboard and mouse state
- `game/src/world.js` — simulation: gravity, shards, mines, hunters, waves
- `game/src/render.js` — canvas drawing: sky, entities, HUD, screens
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/main.js` — screens, fixed-step loop, best score
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library
- `screenshots/` — 1 title, 2 gameplay, 3 victory, 4 game over
