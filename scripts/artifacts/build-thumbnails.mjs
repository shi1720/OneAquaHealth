import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Original layouts using Rill's existing logo, local typefaces and a genuine
// application capture. No generated artwork, external assets or remote requests.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const assets = path.join(root, 'output/assets');
await mkdir(assets, { recursive: true });
const data = async (file, mime) =>
  `data:${mime};base64,${(await readFile(path.join(root, file))).toString('base64')}`;
const [logo, screen, manrope, dmSans] = await Promise.all([
  data('public/rill.svg', 'image/svg+xml'),
  data('output/assets/planner-slide.png', 'image/png'),
  data(
    'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
    'font/woff2',
  ),
  data(
    'node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',
    'font/woff2',
  ),
]);
const layouts = [
  {
    name: 'devpost-thumbnail',
    width: 1200,
    height: 800,
    left: 620,
    title: 82,
    card: 500,
    top: 225,
    screenTop: 164,
  },
  {
    name: 'youtube-thumbnail',
    width: 1280,
    height: 720,
    left: 645,
    title: 84,
    card: 540,
    top: 200,
    screenTop: 124,
  },
];
const browser = await chromium.launch({ headless: true });
try {
  for (const spec of layouts) {
    const page = await browser.newPage({
      viewport: { width: spec.width, height: spec.height },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face{font-family:Manrope;src:url('${manrope}');font-weight:200 800}
      @font-face{font-family:DM Sans;src:url('${dmSans}');font-weight:100 1000}
      *{box-sizing:border-box}body{margin:0;width:${spec.width}px;height:${spec.height}px;overflow:hidden;background:#f5f6f1;color:#214b3c;font-family:'DM Sans',sans-serif}
      .left{position:absolute;inset:0 auto 0 0;width:${spec.left}px;background:#214b3c}
      .brand{position:absolute;left:53px;top:44px;display:flex;gap:13px;align-items:center;color:#f5f6f1;font:800 56px Manrope;letter-spacing:-3px}.brand img{width:57px;height:57px}.dot{color:#ddecad}
      .eyebrow{position:absolute;left:66px;top:${spec.top - 48}px;color:#b8c9bf;font-size:16px;font-weight:650;letter-spacing:2px}
      h1{position:absolute;left:62px;top:${spec.top}px;margin:0;width:560px;color:#f5f6f1;font:650 ${spec.title}px/1.14 Manrope;letter-spacing:-4.5px}
      h1 span{color:#ddecad}.subtitle{position:absolute;left:67px;top:${spec.top + 216}px;margin:0;width:470px;color:#dce5dd;font-size:26px;line-height:1.36}
      .credit{position:absolute;left:67px;bottom:50px;font-size:22px;color:#f5f6f1}.credit b{font-weight:650}
      .event{position:absolute;left:${spec.left + 38}px;top:57px;line-height:1.6;font-size:17px;letter-spacing:.25px}.event b{display:block;font-family:Manrope;font-size:20px}
      .product{position:absolute;left:${spec.left + 38}px;top:${spec.screenTop}px;width:${spec.card}px;background:#fff;border:1px solid #dbe3d5;border-radius:16px;overflow:hidden;box-shadow:0 19px 40px #214b3c18}
      .product img{display:block;width:100%;height:auto}.capture-label{position:absolute;left:${spec.left + 42}px;top:${spec.screenTop + (spec.card * 628) / 819 + 21}px;font-size:14px;color:#667369}
      .promise{position:absolute;left:${spec.left + 40}px;bottom:51px;font:600 25px/1.27 Manrope;letter-spacing:-.7px}
      .rule{display:block;width:44px;height:5px;background:#c88b56;margin-bottom:17px}
    </style></head><body>
      <div class="left"></div>
      <div class="brand"><img src="${logo}" alt="Rill logo"><div>rill<span class="dot">.</span></div></div>
      <div class="eyebrow">FROM STREAM REPORT TO NEXT STEP</div>
      <h1>Two hours.<br><span>A clear plan.</span></h1>
      <p class="subtitle">Make the next check count.<br>Keep the follow-through visible.</p>
      <div class="credit"><b>Shivam Gupta</b><br><span style="font-size:16px;color:#b8c9bf">Project creator</span></div>
      <div class="event"><b>OneAquaHealth</b>IEEE Global Hackathon 2026 · Track 2</div>
      <div class="product"><img src="${screen}" alt="Actual Rill planner showing three visits within 120 minutes"></div>
      <div class="capture-label">Actual interface · Synthetic demonstration</div>
      <div class="promise"><span class="rule"></span>Observe. Review. Recheck.</div>
    </body></html>`,
      { waitUntil: 'load' },
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    const invalidText = await page
      .locator('h1,.subtitle,.credit,.event,.capture-label,.promise')
      .evaluateAll((elements) =>
        elements
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.x < 0 || rect.y < 0 || rect.right > innerWidth || rect.bottom > innerHeight;
          })
          .map((el) => el.className || el.tagName),
      );
    if (invalidText.length) throw new Error(`Thumbnail text overflows: ${invalidText.join(', ')}`);
    await page.screenshot({ path: path.join(assets, `${spec.name}.png`), type: 'png' });
    console.log(`${spec.name}.png: ${spec.width}x${spec.height}`);
    await page.close();
  }
} finally {
  await browser.close();
}
