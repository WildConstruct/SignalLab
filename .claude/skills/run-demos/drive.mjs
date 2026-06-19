// Signal Rack demo driver — headless Chromium screenshots via the cached browser.
// Usage:  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node drive.mjs [baseURL]
// Requires: `cd /tmp && npm i playwright` (library only; browser is pre-cached).
import pkg from '/tmp/node_modules/playwright/index.js';
const { chromium } = pkg;

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';   // pre-cached; CDN is blocked
const BASE = (process.argv[2] || 'http://127.0.0.1:8123/demos').replace(/\/$/, '');
const OUT = '/tmp/shots';

// [label, path] — edit to target other demos
const pages = [
  ['launcher', '/'],
  ['fui-kit', '/fui-kit/'],
  ['glitch-distortion', '/glitch-distortion/'],
  ['transitions', '/transitions/'],
  ['kinetic-type', '/kinetic-type/'],
  ['meters', '/meters/'],
  ['particles', '/particles/'],
  ['path-scope', '/path-scope/'],
  ['field-bridge', '/field-bridge/'],
  ['field-distort', '/field-distort/'],
];

import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

for (const [name, path] of pages) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);   // let the rAF loop paint
  const shot = `${OUT}/${name}.png`;
  await page.screenshot({ path: shot });
  const drew = await page.evaluate(() => {
    const c = document.querySelector('canvas.sh-canvas') || document.querySelector('canvas.sh-thumb') || document.querySelector('canvas');
    if (!c) return 'no-canvas';
    try {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let nz = 0; for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) nz++;
      return 'painted px=' + nz;
    } catch (e) { return 'read-fail:' + e.message; }
  });
  // favicon 404 is harmless noise
  const real = errors.filter(e => !/favicon/i.test(e));
  console.log(`${name.padEnd(18)} | ${drew.padEnd(22)} | errors: ${real.length ? real.slice(0, 3).join(' || ') : 'none'}`);
  await page.close();
}
await browser.close();
console.log('screenshots in ' + OUT);
