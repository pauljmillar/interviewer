export function lzwEncode(indices: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const eofCode   = clearCode + 1;
  let codeSize = minCodeSize + 1, nextCode = eofCode + 1, table = new Map<number, number>();

  const bytes: number[] = [];
  let bitBuf = 0, bitLen = 0;
  const emit = (code: number) => {
    bitBuf |= code << bitLen; bitLen += codeSize;
    while (bitLen >= 8) { bytes.push(bitBuf & 0xFF); bitBuf >>>= 8; bitLen -= 8; }
  };
  const reset = () => {
    table = new Map(); codeSize = minCodeSize + 1; nextCode = eofCode + 1; emit(clearCode);
  };

  emit(clearCode);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = (prefix << 8) | indices[i];
    const found = table.get(k);
    if (found !== undefined) {
      prefix = found;
    } else {
      emit(prefix);
      if (nextCode < 4096) {
        table.set(k, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else { reset(); }
      prefix = indices[i];
    }
  }
  emit(prefix); emit(eofCode);
  if (bitLen > 0) bytes.push(bitBuf & 0xFF);
  return bytes;
}

export function buildGIF(
  frames: Uint8Array[],
  width: number,
  height: number,
  palette: [number, number, number][],
  delayCs: number
): Uint8Array {
  const out: number[] = [];
  const word = (w: number) => out.push(w & 0xFF, (w >> 8) & 0xFF);
  const ctPow = Math.max(1, Math.ceil(Math.log2(Math.max(2, palette.length))));
  const ctLen = 1 << ctPow;

  [0x47,0x49,0x46,0x38,0x39,0x61].forEach(b => out.push(b));
  word(width); word(height);
  out.push(0x80 | (ctPow - 1), 0, 0);
  for (const [r,g,b] of palette) out.push(r, g, b);
  for (let i = palette.length; i < ctLen; i++) out.push(0, 0, 0);
  out.push(0x21, 0xFF, 0x0B,
    78,69,84,83,67,65,80,69,50,46,48,
    3, 1, 0, 0, 0);

  const minCodeSize = Math.max(2, ctPow);
  for (const frame of frames) {
    out.push(0x21, 0xF9, 0x04, 0x00); word(delayCs); out.push(0x00, 0x00);
    out.push(0x2C); word(0); word(0); word(width); word(height); out.push(0x00);
    out.push(minCodeSize);
    const lzw = lzwEncode(frame, minCodeSize);
    for (let i = 0; i < lzw.length; i += 255) {
      const end = Math.min(i + 255, lzw.length);
      out.push(end - i);
      for (let j = i; j < end; j++) out.push(lzw[j]);
    }
    out.push(0x00);
  }
  out.push(0x3B);
  return new Uint8Array(out);
}

export function nearestIdx(r: number, g: number, b: number, pal: [number, number, number][]): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const dr = r - pal[i][0], dg = g - pal[i][1], db = b - pal[i][2];
    const d = dr*dr + dg*dg + db*db;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
