// Goutte de chargement : découpe le logo (site/Dropamine-Logo.png) en deux images, sans dépendance.
//   site/img/drop-frame.png  la bordure du logo, intérieur transparent (posée au-dessus du liquide animé)
//   + le contour intérieur en chemin SVG (coordonnées 0-512), à coller dans DROP_CLIP (app.js) et le #splash (index.html)
// L'intérieur = tout ce qu'on atteint depuis le centre sans traverser le filet sombre qui borde la goutte.
// Relancer après un changement de logo : node scripts/drop-frame.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');

function readPng(buf) {
  let p = 8, w, h, type, depth; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; if (d[12]) throw new Error('PNG entrelacé'); }
    if (t === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const ch = { 6: 4, 2: 3 }[type]; if (!ch || depth !== 8) throw new Error(`PNG non géré (type ${type}, ${depth} bits)`);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * ch, out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      line[x] = (line[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
    for (let x = 0; x < w; x++) for (let k = 0; k < 4; k++) out[(y * w + x) * 4 + k] = k < ch ? line[x * ch + k] : 255;
    prev = line;
  }
  return { w, h, px: out };
}
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function writePng({ w, h, px }) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const img = readPng(readFileSync(join(SITE, 'Dropamine-Logo.png')));
const { w, h, px } = img;
const lum = i => 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
const DARK = 34;                       // le filet sombre qui ferme l'intérieur
const inside = new Uint8Array(w * h);
const stack = [Math.round(h * 0.65) * w + Math.round(w / 2)];
while (stack.length) {
  const i = stack.pop(); if (inside[i] || lum(i) < DARK || px[i * 4 + 3] < 200) continue;
  inside[i] = 1; const x = i % w;
  if (x > 0) stack.push(i - 1); if (x < w - 1) stack.push(i + 1); if (i >= w) stack.push(i - w); if (i < w * (h - 1)) stack.push(i + w);
}
// 1 px de plus vers le filet, pour que le liquide passe bien sous lui (pas de liseré de l'ancien liquide)
const grow = Uint8Array.from(inside);
for (let i = 0; i < w * h; i++) if (!inside[i]) { const x = i % w; if ((x > 0 && inside[i - 1]) || (x < w - 1 && inside[i + 1]) || inside[i - w] || inside[i + w]) grow[i] = 1; }
const frame = Buffer.from(px);
let n = 0;
for (let i = 0; i < w * h; i++) {
  if (grow[i]) { frame[i * 4 + 3] = inside[i] ? 0 : 110; n += inside[i]; }   // liseré : à demi transparent, le filet reste net
}
if (n < w * h * 0.15) throw new Error(`intérieur trop petit (${n} px) : filet sombre non fermé ?`);
writeFileSync(join(SITE, 'img/drop-frame.png'), writePng({ w, h, px: frame }));
// contour : bord gauche de haut en bas, puis bord droit de bas en haut (une ligne sur 4, demi-pixel près)
const L = [], R = [];
for (let y = 0; y < h; y += 4) {
  let a = -1, b = -1;
  for (let x = 0; x < w; x++) if (grow[y * w + x]) { if (a < 0) a = x; b = x + 1; }
  if (a >= 0) { L.push([a, y]); R.push([b, y]); }
}
const pts = [...L, ...R.reverse()];
const d = 'M' + pts.map(([x, y]) => x + ' ' + y).join('L') + 'z';
console.log(d);
console.error(`${w}×${h} : intérieur ${n} px (${(100 * n / (w * h)).toFixed(1)} %) → img/drop-frame.png ; contour ci-dessus (${pts.length} points)`);
