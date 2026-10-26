// The artist's hands: a tiny software rasterizer and PNG encoder (node:zlib only).
// It paints a yarn-ball coin for every launch, so a launch never waits on an image model.
import { deflateSync } from 'node:zlib';

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export class Canvas {
  readonly px: Float32Array;
  readonly w: number;
  readonly h: number;
  constructor(w: number, h: number, bg: RGB = [255, 253, 248]) {
    this.w = w; this.h = h;
    this.px = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++) this.px.set([bg[0], bg[1], bg[2], 255], i * 4);
  }
  blend(x: number, y: number, c: RGB, a: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    for (let k = 0; k < 3; k++) this.px[i + k] = this.px[i + k] * (1 - a) + c[k] * a;
  }
  /** Antialiased disc. */
  disc(cx: number, cy: number, r: number, c: RGB, alpha = 1) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot(x + .5 - cx, y + .5 - cy); this.blend(x, y, c, alpha * Math.max(0, Math.min(1, r - d + .5)));
    }
  }
  /** Thick antialiased stroke along a polyline (coverage computed once per pixel, so joins never double up). */
  stroke(pts: [number, number][], width: number, c: RGB, alpha = 1, clip?: (x: number, y: number) => boolean) {
    const r = width / 2;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.floor(Math.min(...xs) - r - 1), maxX = Math.ceil(Math.max(...xs) + r + 1), minY = Math.floor(Math.min(...ys) - r - 1), maxY = Math.ceil(Math.max(...ys) + r + 1);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      if (clip && !clip(x, y)) continue;
      const px = x + .5, py = y + .5; let best = Infinity;
      for (let s = 0; s < pts.length - 1; s++) {
        const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
        if (px < Math.min(x0, x1) - r - 1 || px > Math.max(x0, x1) + r + 1 || py < Math.min(y0, y1) - r - 1 || py > Math.max(y0, y1) + r + 1) continue;
        const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2));
        const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)); if (d < best) best = d;
      }
      const a = Math.max(0, Math.min(1, r - best + .5));
      if (a > 0) this.blend(x, y, c, a * alpha);
    }
  }
  png(): Buffer {
    const raw = Buffer.alloc((this.w * 4 + 1) * this.h);
    for (let y = 0; y < this.h; y++) { raw[y * (this.w * 4 + 1)] = 0; for (let x = 0; x < this.w * 4; x++) raw[y * (this.w * 4 + 1) + 1 + x] = Math.round(this.px[y * this.w * 4 + x]); }
    const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(this.w, 0); ihdr.writeUInt32BE(this.h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  }
}

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export function crc32(b: Buffer): number { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

const PALETTES = [['#ff5fa8', '#ffd23f'], ['#3b5bff', '#b8f03a'], ['#ff8a2a', '#2fd39a'], ['#b59cff', '#ffd23f'], ['#2fd39a', '#ff5fa8']];

/** Paint a 512×512 yarn-ball coin: cream paper, ink shadow, wound strands, a loose thread and a glowing 8. */
export function yarnCoin(seedText: string, size = 512): Buffer {
  let s = [...seedText].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381);
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const [main, accent] = PALETTES[s % PALETTES.length].map(hex);
  const ink: RGB = [22, 22, 22], c = new Canvas(size, size, [243, 238, 227]);
  const cx = size / 2, cy = size / 2, R = size * .36;
  for (let y = 12; y < size; y += 24) for (let x = 12; x < size; x += 24) c.disc(x, y, 1.6, [200, 192, 178]);
  c.disc(cx + 12, cy + 16, R + 6, ink);
  c.disc(cx, cy, R + 6, ink); c.disc(cx, cy, R, main);
  const inside = (x: number, y: number) => Math.hypot(x - cx, y - cy) < R - 2;
  for (let k = 0; k < 9; k++) {
    const rot = rnd() * Math.PI, ry = R * (.25 + k * .085), pts: [number, number][] = [];
    for (let a = 0; a <= Math.PI * 2 + .01; a += .05) { const x = Math.cos(a) * R * 1.05, y = Math.sin(a) * ry; pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
    c.stroke(pts, size * .012, ink, .55, inside);
  }
  const hl: [number, number][] = []; for (let a = 3.5; a <= 4.6; a += .05) hl.push([cx - R * .1 + Math.cos(a) * R * .62, cy - R * .1 + Math.sin(a) * R * .62]);
  c.stroke(hl, size * .03, [255, 255, 255], .5);
  const tail: [number, number][] = []; for (let t = 0; t <= 1; t += .02) tail.push([cx - R * .9 - t * R * .35, cy + R * .45 + Math.sin(t * 5) * R * .12 + t * R * .4]);
  c.stroke(tail, size * .03, ink); c.stroke(tail, size * .018, main);
  // glowing "8" made of two rings
  for (const [oy, rr] of [[-.17, .13], [.15, .16]] as const) { const ring: [number, number][] = []; for (let a = 0; a <= Math.PI * 2 + .05; a += .05) ring.push([cx + Math.cos(a) * R * rr, cy + oy * R + Math.sin(a) * R * rr]); c.stroke(ring, size * .05, accent, .35); c.stroke(ring, size * .032, ink); c.stroke(ring, size * .018, [217, 255, 230]); }
  return c.png();
}
