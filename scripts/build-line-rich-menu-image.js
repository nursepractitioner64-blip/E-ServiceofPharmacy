#!/usr/bin/env node
'use strict';
// Rebuilds the PNG from an SVG source using ImageMagick (magick/convert).
// The committed PNG is ready to publish; this utility is only needed to regenerate it.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'public/assets/images/line-rich-menu.png');
const labels = [
  ['SESSION', 'บันทึกการใช้งาน E-StockScan'], ['DISPENSE', 'จ่ายเวชภัณฑ์'],
  ['TEMPERATURE', 'บันทึกอุณหภูมิ'], ['EQUIPMENT CHECK', 'ตรวจสอบอุปกรณ์'],
  ['DASHBOARD', 'ภาพรวมระบบ'], ['REPORTS', 'รายงาน'], ['NOTIFICATIONS', 'การแจ้งเตือน']
];
const W = 2500, H = 1686, top = 160, row = 509;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#effaf8"/><rect width="100%" height="${top}" fill="#12424c"/><text x="72" y="92" font-family="Noto Sans Thai" font-size="64" font-weight="bold" fill="white">NURSE STATION HUB</text>`;
svg += `<text x="76" y="140" font-family="Noto Sans Thai" font-size="30" fill="#c3e7e1">ระบบบริหารจัดการและบริการทางการพยาบาล</text>`;
const boxes = [];
for (let r=0;r<3;r++) { const count=r===0?3:2, y=top+r*row, h=r===2?H-y:row; for(let c=0;c<count;c++){const w=W/count; boxes.push({x:c*w,y,w,h});}}
boxes.forEach((g,i)=>{const [en,th]=labels[i],cx=g.x+g.w/2,cy=g.y+112;svg+=`<rect x="${g.x+16}" y="${g.y+16}" width="${g.w-32}" height="${g.h-32}" rx="34" fill="white" stroke="#b7ded7" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="52" fill="#148784"/><text x="${cx}" y="${cy+13}" text-anchor="middle" font-family="DejaVu Sans" font-size="36" font-weight="bold" fill="white">0${i+1}</text><text x="${cx}" y="${g.y+260}" text-anchor="middle" font-family="DejaVu Sans" font-size="${en.length>13?40:48}" font-weight="bold" fill="#12424c">${en}</text><text x="${cx}" y="${g.y+340}" text-anchor="middle" font-family="Noto Sans Thai" font-size="40" font-weight="bold" fill="#507778">${th}</text><rect x="${cx-55}" y="${g.y+g.h-72}" width="110" height="12" rx="6" fill="#148784"/>`;});
svg += '</svg>';
const svgPath = path.join(root, 'public/assets/images/line-rich-menu.svg');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(svgPath, svg);
const cmd = process.platform === 'win32' ? 'magick' : 'magick';
const result = spawnSync(cmd, [svgPath, '-strip', '-define', 'png:compression-level=9', target], { stdio: 'inherit' });
if (result.error || result.status !== 0) {
  console.error('Could not render PNG. Install ImageMagick and ensure `magick` is on PATH.');
  process.exit(1);
}
console.log(`Created ${target}`);
