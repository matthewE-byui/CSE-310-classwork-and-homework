/**
 * generate-icons.js
 * Run once with Node.js to create the required extension icons.
 * Usage:  node generate-icons.js
 * Requires:  npm install canvas   (or use the pre-built icons in icons/)
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const SIZES = [16, 32, 48, 128];
const OUT   = path.join(__dirname, "icons");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext("2d");

  // Background circle
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fillStyle = "#4f46e5";
  ctx.fill();

  // White "lines" icon — three horizontal bars at different widths
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";

  const lw  = Math.max(1, size * 0.09);
  ctx.lineWidth = lw;

  const x1 = size * 0.22;
  const x2 = size * 0.78;
  const x3 = size * 0.50; // short right-aligned line

  const y1 = size * 0.33;
  const y2 = size * 0.50;
  const y3 = size * 0.67;

  // line 1 — full width
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
  // line 2 — full width
  ctx.beginPath(); ctx.moveTo(x1, y2); ctx.lineTo(x2, y2); ctx.stroke();
  // line 3 — short (suggests truncated list)
  ctx.beginPath(); ctx.moveTo(x1, y3); ctx.lineTo(x3, y3); ctx.stroke();

  const buf = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(OUT, `icon${size}.png`), buf);
  console.log(`Written icon${size}.png`);
}
