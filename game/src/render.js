// Lumen Drift — everything drawn on the canvas.
// One clear job: turn the world's state into a picture. It never changes
// the world, except for reading the time it needs for animation.

import { VIEW, PALETTE, SHIP, GRAVITY, SCORE } from './config.js';

const TAU = Math.PI * 2;

/** The starfield behind the game, laid out once per seed. */
export function makeStarfield(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const stars = [];
  for (let layer = 0; layer < 3; layer += 1) {
    for (let i = 0; i < 46 - layer * 10; i += 1) {
      stars.push({
        x: next() * VIEW.width,
        y: next() * VIEW.height,
        r: 0.6 + layer * 0.55 + next() * 0.7,
        tw: next() * TAU,
        layer,
      });
    }
  }
  return stars;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world, starfield) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, PALETTE.spaceTop);
  g.addColorStop(1, PALETTE.spaceBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Nebula blobs, fixed to the world so they never jump.
  const blobs = [
    { x: 240, y: 150, r: 260, c: PALETTE.nebulaA },
    { x: 1020, y: 560, r: 300, c: PALETTE.nebulaB },
    { x: 980, y: 120, r: 200, c: PALETTE.nebulaC },
    { x: 180, y: 600, r: 220, c: PALETTE.nebulaB },
  ];
  for (const b of blobs) {
    const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    rg.addColorStop(0, b.c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  for (const s of starfield) {
    const tw = 0.55 + 0.45 * Math.sin(world.time * 1.4 + s.tw);
    ctx.globalAlpha = tw * (0.5 + s.layer * 0.2);
    ctx.fillStyle = '#cfe4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStar(ctx, star, time) {
  const pulse = 1 + 0.06 * Math.sin(time * 2 + star.phase);
  // Slingshot ring.
  ctx.strokeStyle = 'rgba(255, 233, 168, 0.28)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(star.x, star.y, star.ring, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  // Glow + core.
  const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.core * 3.2);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
  glow.addColorStop(0.4, 'rgba(255, 170, 80, 0.28)');
  glow.addColorStop(1, 'rgba(255, 170, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(star.x, star.y, star.core * 3.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.starCore;
  ctx.beginPath();
  ctx.arc(star.x, star.y, star.core * pulse, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff9d4d';
  ctx.beginPath();
  ctx.arc(star.x, star.y, star.core * 0.55 * pulse, 0, TAU);
  ctx.fill();
}

function drawShip(ctx, ship, time) {
  const blink = ship.invuln > 0 && Math.floor(time * 12) % 2 === 0;
  if (blink) return;
  // Trail.
  const trail = ship.trail;
  for (let i = 0; i < trail.length; i += 1) {
    const p = trail[i];
    const k = i / trail.length;
    ctx.globalAlpha = k * 0.5;
    ctx.fillStyle = PALETTE.ship;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + k * 5, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.shadowColor = PALETTE.ship;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#0b2a3a';
  ctx.strokeStyle = PALETTE.ship;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, 10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dffaff';
  ctx.beginPath();
  ctx.arc(3, 0, 3.4, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Engine flame while thrusting.
  if (ship.thrusting > 0.15) {
    const flick = 10 + Math.random() * 10;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.fillStyle = 'rgba(255, 190, 90, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-12, 5);
    ctx.lineTo(-12 - flick, 0);
    ctx.lineTo(-12, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawShard(ctx, shard, time) {
  const y = shard.y + Math.sin(shard.bob) * 4;
  const tw = 0.75 + 0.25 * Math.sin(time * 4 + shard.bob);
  ctx.save();
  ctx.translate(shard.x, y);
  ctx.rotate(Math.sin(shard.bob * 0.7) * 0.35);
  ctx.shadowColor = PALETTE.shard;
  ctx.shadowBlur = 14 * tw;
  ctx.fillStyle = PALETTE.shard;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(7, 0);
  ctx.lineTo(0, 11);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(3.5, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-3.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMine(ctx, mine) {
  const r = mine.r + Math.sin(mine.pulse) * 1.5;
  ctx.save();
  ctx.translate(mine.x, mine.y);
  ctx.shadowColor = PALETTE.mine;
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#2a0a1e';
  ctx.strokeStyle = PALETTE.mine;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(mine.pulse * 0.4);
  ctx.strokeStyle = PALETTE.mine;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7));
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd7e6';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawHunter(ctx, hunter, time) {
  if (!hunter.alive) return;
  ctx.save();
  ctx.translate(hunter.x, hunter.y);
  ctx.shadowColor = PALETTE.hunter;
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#1d0a2e';
  ctx.strokeStyle = PALETTE.hunter;
  ctx.lineWidth = 2.5;
  const wob = Math.sin(time * 5) * 0.12;
  ctx.rotate(Math.atan2(hunter.vy, hunter.vx) + wob);
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-14, 12);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff5d73';
  ctx.beginPath();
  ctx.arc(4, 0, 3.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.min(1, f.life / 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#35f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function heart(ctx, x, y, size, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -4, -5, -11, 0, -5);
  ctx.bezierCurveTo(5, -11, 9, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, world) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Top-left: score and best.
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SCORE', 20, 30);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(String(world.score).padStart(6, '0'), 20, 60);
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`BEST  ${Math.max(world.best, world.score)}`, 20, 82);
  // Top-centre: wave and shards.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} / 10`, VIEW.width / 2, 34);
  ctx.fillStyle = PALETTE.shard;
  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`◆ ${world.shardsCollected} / ${world.shardsGoal} shards`, VIEW.width / 2, 58);
  // Top-right: hull, shields, combo.
  ctx.textAlign = 'right';
  for (let i = 0; i < world.maxHull; i += 1) {
    heart(ctx, VIEW.width - 24 - i * 26, 30, 17, i < world.hull ? '#ff5d73' : 'rgba(255,93,115,0.18)');
  }
  if (world.shields > 0) {
    ctx.fillStyle = '#7dffb2';
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`⬢ SHIELD ×${world.shields}`, VIEW.width - 20, 62);
  }
  if (world.combo > 1) {
    const frac = world.comboTimer / world.comboWindow;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO ×${world.combo}`, VIEW.width - 20, 92);
    ctx.fillStyle = 'rgba(255,209,102,0.25)';
    ctx.fillRect(VIEW.width - 140, 100, 120, 6);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(VIEW.width - 140, 100, 120 * frac, 6);
  }
  // Bottom hint.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(143, 168, 200, 0.75)';
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Mouse steers · hold to boost · Shift brakes · P pause · M mute', VIEW.width / 2, VIEW.height - 14);
}

function drawBanner(ctx, world) {
  if (!world.banner) return;
  const alpha = Math.min(1, world.banner.life / 0.5);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 22;
  ctx.fillText(world.banner.text, VIEW.width / 2, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(world.banner.sub, VIEW.width / 2, 244);
  ctx.globalAlpha = 1;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(3, 6, 22, 0.42)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 92px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#35f0ff';
  ctx.shadowBlur = 34;
  ctx.fillText('LUMEN DRIFT', VIEW.width / 2, 250);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.ship;
  ctx.font = '600 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Ride the gravity. Steal the light. Survive ten waves.', VIEW.width / 2, 296);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', VIEW.width / 2, 392);
  ctx.globalAlpha = 1;
  panel(ctx, VIEW.width / 2 - 300, 430, 600, 132);
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('MOUSE steers · HOLD mouse / SPACE to boost · SHIFT brakes', VIEW.width / 2, 466);
  ctx.fillText('Slingshot around stars for bonus · lure hunters into stars', VIEW.width / 2, 494);
  ctx.fillText('Collect every shard to clear a wave · P pause · M mute', VIEW.width / 2, 522);
  if (world.best > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST SCORE  ${world.best}`, VIEW.width / 2, 606);
  }
}

function drawBoonChoice(ctx, world) {
  ctx.fillStyle = 'rgba(3, 6, 22, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} CLEAR`, VIEW.width / 2, 150);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Choose one upgrade', VIEW.width / 2, 190);
  const cardW = 300;
  const cardH = 190;
  const gap = 28;
  const total = cardW * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  const y0 = 250;
  world.boonOptions.forEach((boon, i) => {
    const x = x0 + i * (cardW + gap);
    const hover = world.hoverBoon === i;
    ctx.fillStyle = hover ? 'rgba(28, 52, 96, 0.95)' : PALETTE.panel;
    ctx.strokeStyle = hover ? PALETTE.ship : PALETTE.panelEdge;
    ctx.lineWidth = hover ? 2.5 : 1.5;
    roundRect(ctx, x, y0, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`PRESS ${boon.key}`, x + cardW / 2, y0 + 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(boon.name, x + cardW / 2, y0 + 76);
    ctx.fillStyle = PALETTE.dimText;
    ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
    wrapText(ctx, boon.blurb, x + cardW / 2, y0 + 112, cardW - 36, 22);
  });
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line !== '') lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}

function drawStats(ctx, world, y0) {
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = '600 19px "Segoe UI", system-ui, sans-serif';
  const rows = [
    `Waves cleared   ${world.wavesCleared} / 10`,
    `Shards gathered   ${world.shardsTotal}`,
    `Slingshots   ${world.slingshots}    Hunter burns   ${world.burns}`,
    `Best combo   ×${world.bestCombo}`,
  ];
  rows.forEach((row, i) => ctx.fillText(row, VIEW.width / 2, y0 + i * 30));
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(10, 4, 16, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d73';
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#ff5d73';
  ctx.shadowBlur = 26;
  ctx.fillText('THE LIGHT FADES', VIEW.width / 2, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`You reached wave ${world.wave} — the nebula keeps its shards.`, VIEW.width / 2, 256);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE  ${world.score}`, VIEW.width / 2, 330);
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = '600 19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`BEST  ${Math.max(world.best, world.score)}`, VIEW.width / 2, 366);
  drawStats(ctx, world, 420);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO FLY AGAIN', VIEW.width / 2, 590);
  ctx.globalAlpha = 1;
}

function drawVictory(ctx, world) {
  ctx.fillStyle = 'rgba(4, 12, 26, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 68px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 30;
  ctx.fillText('THE NEBULA IS LIT', VIEW.width / 2, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Ten waves ridden. Every shard gathered. The Lumen shines on.', VIEW.width / 2, 256);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE  ${world.score}`, VIEW.width / 2, 330);
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = '600 19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`BEST  ${Math.max(world.best, world.score)}`, VIEW.width / 2, 366);
  drawStats(ctx, world, 420);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO PLAY AGAIN', VIEW.width / 2, 590);
  ctx.globalAlpha = 1;
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(3, 6, 22, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, 350);
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press P to resume', VIEW.width / 2, 392);
}

/** Draw one frame. `mode` is the game's current screen. */
export function render(ctx, world, starfield, mode, paused) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world, starfield);
  for (const star of world.stars) drawStar(ctx, star, world.time);
  for (const shard of world.shards) {
    if (!shard.taken) drawShard(ctx, shard, world.time);
  }
  for (const mine of world.mines) drawMine(ctx, mine);
  for (const hunter of world.hunters) drawHunter(ctx, hunter, world.time);
  if (world.ship) drawShip(ctx, world.ship, world.time);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 93, 115, ${world.flash * 0.45})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  ctx.restore();
  if (mode === 'play' || mode === 'clear' || mode === 'boon') drawHud(ctx, world);
  drawBanner(ctx, world);
  if (mode === 'title') drawTitle(ctx, world);
  if (mode === 'boon') drawBoonChoice(ctx, world);
  if (mode === 'gameover') drawGameOver(ctx, world);
  if (mode === 'victory') drawVictory(ctx, world);
  if (paused) drawPaused(ctx);
}
