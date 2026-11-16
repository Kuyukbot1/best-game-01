// Lumen Drift — a best-game-01 entry (Node 22, standard library only).
//
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library and
// no network request). This program hands it in: it copies game/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library (vendor/makefun-game.ts, shipped unchanged from the kit).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The scorer's own caps (the kit's gate.json): only text_max_bytes shapes
 * the bytes; the others refuse an entry the scorer would refuse. */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const IMAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function fail(message: string): never {
  process.stderr.write(`lumen drift: ${message}\n`);
  process.exit(1);
}

const gameDir = join(here, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing: hand in 3 or 4 renders of the game');
const shotNames = readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  fail(`screenshots/ holds ${shotNames.length} images: hand in 3 or 4`);
}
for (const name of shotNames) {
  if (!IMAGE_NAME.test(name)) fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
  const size = statSync(join(shotsDir, name)).size;
  if (size > CAPS.screenshots.max_bytes) fail(`screenshots/${name} is ${size} bytes: at most 262144`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The dossier is written last: the scorer rebuilds it from this /output and
// compares bytes, so it must be the last thing written.
writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));

process.stdout.write(
  `lumen drift: wrote ${join(out, 'game')}, ${join(out, 'screenshots')} (${shotNames.join(', ')}) and ${join(out, 'dossier.json')}\n`,
);
