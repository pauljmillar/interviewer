import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import type { ArtConfig } from './config';
import { makePRNG, rnd, rndInt, pick, rgba } from './prng';
import { buildGIF, nearestIdx } from './gif';

export function composePNG(seed: number, bgIndex: number, config: ArtConfig): Buffer {
  const { width: W, height: H } = config.canvas;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const rand = makePRNG(seed);
  const paletteEntries = Object.entries(config.palette);
  const bgKey = config.bgOrder[bgIndex % config.bgOrder.length];
  const bg = config.palette[bgKey] ?? paletteEntries[0][1];
  const accents = paletteEntries.filter(([k]) => k !== bgKey).map(([, v]) => v);

  // 1. Background fill
  ctx.fillStyle = rgba(bg, 1);
  ctx.fillRect(0, 0, W, H);

  // 2. Massive solid circles
  const numCircles = rndInt(rand, config.still.circleCount[0], config.still.circleCount[1]);
  for (let i = 0; i < numCircles; i++) {
    const c = pick(rand, accents);
    const x = rnd(rand, -W * 0.35, W * 1.35);
    const y = rnd(rand, -H * 0.35, H * 1.35);
    const r = rnd(rand, W * config.still.circleSize[0], W * config.still.circleSize[1]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(c, 1);
    ctx.fill();
  }

  // 3. Bold architectural straight lines
  const numLines = rndInt(rand, config.still.lineCount[0], config.still.lineCount[1]);
  for (let i = 0; i < numLines; i++) {
    const c = pick(rand, accents);
    ctx.strokeStyle = rgba(c, 1);
    ctx.lineWidth = rnd(rand, config.still.lineWeight[0], config.still.lineWeight[1]);
    ctx.lineCap = 'square';
    ctx.beginPath();
    const mode = rndInt(rand, 0, 2);
    if (mode === 0) {
      const y = rnd(rand, H * 0.08, H * 0.92);
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    } else if (mode === 1) {
      const x = rnd(rand, W * 0.08, W * 0.92);
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
    } else {
      ctx.moveTo(rnd(rand, -W * 0.1, W * 0.35), rnd(rand, -H * 0.1, H * 1.1));
      ctx.lineTo(rnd(rand, W * 0.65, W * 1.1), rnd(rand, -H * 0.1, H * 1.1));
    }
    ctx.stroke();
  }

  // 4. Large partial arcs
  const numArcs = rndInt(rand, config.still.arcCount[0], config.still.arcCount[1]);
  for (let i = 0; i < numArcs; i++) {
    const c = pick(rand, accents);
    const cx = rnd(rand, -W * 0.15, W * 1.15);
    const cy = rnd(rand, -H * 0.15, H * 1.15);
    const r  = rnd(rand, W * 0.28, W * 0.72);
    const a0 = rnd(rand, 0, Math.PI * 2);
    const sweep = rnd(rand, Math.PI * 0.25, Math.PI * 1.1);
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a0 + sweep);
    ctx.strokeStyle = rgba(c, 1);
    ctx.lineWidth = rnd(rand, config.still.arcWeight[0], config.still.arcWeight[1]);
    ctx.lineCap = 'butt';
    ctx.stroke();
  }

  // 5. Vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.82);
  vg.addColorStop(0, rgba(bg, 0));
  vg.addColorStop(1, rgba(bg, config.still.vignetteOpacity));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  return canvas.toBuffer('image/png');
}

interface Mover {
  type: 'line' | 'circle';
  c: [number, number, number];
  angle?: number;
  len?: number;
  lw?: number;
  cx0: number;
  cy0: number;
  amplitude: number;
  phase: number;
  r?: number;
  dirX?: number;
  dirY?: number;
}

export function composeGIF(seed: number, bgIndex: number, config: ArtConfig): Uint8Array {
  const { width: W, height: H } = config.canvas;
  const GIF_DURATION = config.gif.duration;

  const rand = makePRNG(seed);
  const paletteEntries = Object.entries(config.palette);
  const bgKey = config.bgOrder[bgIndex % config.bgOrder.length];
  const bg = config.palette[bgKey] ?? paletteEntries[0][1];
  const accents = paletteEntries.filter(([k]) => k !== bgKey).map(([, v]) => v);

  // Static offscreen layer
  const off = createCanvas(W, H);
  const oCtx = off.getContext('2d');

  oCtx.fillStyle = rgba(bg, 1);
  oCtx.fillRect(0, 0, W, H);

  // Two static circles
  for (let i = 0; i < 2; i++) {
    const c = pick(rand, accents);
    oCtx.beginPath();
    oCtx.arc(rnd(rand, -W*0.3, W*1.3), rnd(rand, -H*0.3, H*1.3), rnd(rand, W*0.25, W*0.62), 0, Math.PI * 2);
    oCtx.fillStyle = rgba(c, 1);
    oCtx.fill();
  }

  // One static line
  {
    const c = pick(rand, accents);
    oCtx.strokeStyle = rgba(c, 1);
    oCtx.lineWidth = rnd(rand, config.gif.staticLineWeight[0], config.gif.staticLineWeight[1]);
    oCtx.lineCap = 'square';
    oCtx.beginPath();
    if (rand() < 0.5) {
      const y = rnd(rand, H*0.12, H*0.88); oCtx.moveTo(0, y); oCtx.lineTo(W, y);
    } else {
      const x = rnd(rand, W*0.12, W*0.88); oCtx.moveTo(x, 0); oCtx.lineTo(x, H);
    }
    oCtx.stroke();
  }

  // Animated mover 1: line segment
  const movers: Mover[] = [];
  {
    const c = pick(rand, accents);
    const angle = pick(rand, [0, Math.PI / 4, Math.PI / 2, -Math.PI / 4]);
    const len = rnd(rand, W * config.gif.lineLength[0], W * config.gif.lineLength[1]);
    const lw = rnd(rand, config.gif.lineWeight[0], config.gif.lineWeight[1]);
    const perpOff = rnd(rand, -Math.min(W, H) * 0.28, Math.min(W, H) * 0.28);
    const cx0 = W / 2 + perpOff * (-Math.sin(angle));
    const cy0 = H / 2 + perpOff * Math.cos(angle);
    const amplitude = rnd(rand, W * config.gif.lineAmplitude[0], W * config.gif.lineAmplitude[1]);
    const phase = rnd(rand, 0, Math.PI * 2);
    movers.push({ type: 'line', c, angle, len, lw, cx0, cy0, amplitude, phase });
  }

  // Animated mover 2: circle
  {
    const c = pick(rand, accents);
    const dir = rnd(rand, 0, Math.PI * 2);
    movers.push({
      type: 'circle',
      c,
      r: rnd(rand, W * config.gif.circleRadius[0], W * config.gif.circleRadius[1]),
      cx0: rnd(rand, W * 0.25, W * 0.75),
      cy0: rnd(rand, H * 0.25, H * 0.75),
      amplitude: rnd(rand, W * config.gif.circleAmplitude[0], W * config.gif.circleAmplitude[1]),
      dirX: Math.cos(dir),
      dirY: Math.sin(dir),
      phase: rnd(rand, 0, Math.PI * 2),
    });
  }

  function drawMovers(c: SKRSContext2D, t: number) {
    c.save();
    c.beginPath(); c.rect(0, 0, W, H); c.clip();

    for (const m of movers) {
      if (m.type === 'line') {
        const offset = m.amplitude * Math.sin(2 * Math.PI * t / GIF_DURATION + m.phase);
        const cx = m.cx0 + Math.cos(m.angle!) * offset;
        const cy = m.cy0 + Math.sin(m.angle!) * offset;
        const dx = Math.cos(m.angle!) * m.len! / 2;
        const dy = Math.sin(m.angle!) * m.len! / 2;
        c.beginPath();
        c.moveTo(cx - dx, cy - dy);
        c.lineTo(cx + dx, cy + dy);
        c.strokeStyle = rgba(m.c, 1);
        c.lineWidth = m.lw!;
        c.lineCap = 'square';
        c.stroke();
      } else if (m.type === 'circle') {
        const offset = m.amplitude * Math.sin(2 * Math.PI * t / GIF_DURATION + m.phase);
        c.beginPath();
        c.arc(m.cx0 + m.dirX! * offset, m.cy0 + m.dirY! * offset, m.r!, 0, Math.PI * 2);
        c.fillStyle = rgba(m.c, 1);
        c.fill();
      }
    }
    c.restore();
  }

  function drawVignette(c: SKRSContext2D) {
    const vg = c.createRadialGradient(W/2, H/2, W*0.14, W/2, H/2, W*0.82);
    vg.addColorStop(0, rgba(bg, 0));
    vg.addColorStop(1, rgba(bg, 0.55));
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
  }

  const FPS = config.gif.fps;
  const frameCount = FPS * GIF_DURATION;
  const palette = Object.values(config.palette);
  const frames: Uint8Array[] = [];

  const tmp = createCanvas(W, H);
  const tCtx = tmp.getContext('2d');

  for (let f = 0; f < frameCount; f++) {
    const t = f / FPS;
    tCtx.drawImage(off, 0, 0);
    drawMovers(tCtx, t);
    drawVignette(tCtx);
    const px = tCtx.getImageData(0, 0, W, H).data;
    const idx = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      idx[i] = nearestIdx(px[i*4], px[i*4+1], px[i*4+2], palette);
    }
    frames.push(idx);
  }

  return buildGIF(frames, W, H, palette, Math.round(100 / FPS));
}
