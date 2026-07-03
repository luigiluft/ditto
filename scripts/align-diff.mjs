// align-diff — visual-diff que AUTO-ALINHA verticalmente antes de comparar.
// Lição paga no mirror do apple.com: um offset de poucos px (banner de geo que só
// existe num lado) desloca o frame inteiro e infla o diff (1:1 real marcou 15.6%).
// Este script varre deslocamentos verticais, escolhe o que MINIMIZA o diff, e
// reporta o score alinhado + o offset achado. Puro (canvas), sem depender de DOM.
//
// Uso: node align-diff.mjs --original a.png --clone b.png --out r.json [--range 90] [--threshold 0.08]
import { loadPlaywright, launchChromium } from "./lib/playwright-loader.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const origPath = arg("original"), clonePath = arg("clone"), outPath = arg("out", "align-diff.json");
const range = parseInt(arg("range", "90"), 10);        // ± px de busca vertical
const threshold = parseFloat(arg("threshold", "0.08")); // limiar por canal
if (!origPath || !clonePath) { console.error("--original e --clone são obrigatórios"); process.exit(1); }

const b64 = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");

const chromium = loadPlaywright().chromium;
const browser = await launchChromium(chromium);
const page = await browser.newPage();

const result = await page.evaluate(async ({ oURI, cURI, range, threshold }) => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const [o, c] = await Promise.all([load(oURI), load(cURI)]);
  const W = Math.min(o.width, c.width), H = Math.min(o.height, c.height);
  const draw = (img) => { const cv = new OffscreenCanvas(W, H); const x = cv.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, W, H).data; };
  const A = draw(o), B = draw(c);

  // diff da B deslocada verticalmente por dy, sobre a região sobreposta
  function diffAt(dy) {
    let changed = 0, counted = 0, sumAbs = 0;
    const y0 = Math.max(0, dy), y1 = Math.min(H, H + dy);
    for (let y = y0; y < y1; y++) {
      const by = y - dy;
      for (let x = 0; x < W; x++) {
        const ai = (y * W + x) * 4, bi = (by * W + x) * 4;
        const dr = Math.abs(A[ai] - B[bi]) / 255, dg = Math.abs(A[ai + 1] - B[bi + 1]) / 255, db = Math.abs(A[ai + 2] - B[bi + 2]) / 255;
        const d = (dr + dg + db) / 3; sumAbs += d; counted++;
        if (dr > threshold || dg > threshold || db > threshold) changed++;
      }
    }
    return { dy, ratio: counted ? changed / counted : 1, mean: counted ? sumAbs / counted : 1 };
  }

  // busca grossa (passo 4) depois fina (passo 1) em torno do melhor
  let best = diffAt(0);
  for (let dy = -range; dy <= range; dy += 4) { const r = diffAt(dy); if (r.ratio < best.ratio) best = r; }
  for (let dy = best.dy - 3; dy <= best.dy + 3; dy++) { const r = diffAt(dy); if (r.ratio < best.ratio) best = r; }
  const raw = diffAt(0);
  return { W, H, raw: { ratio: raw.ratio, mean: raw.mean }, best };
}, { oURI: b64(origPath), cURI: b64(clonePath), range, threshold });

const score = (r) => r <= 0.01 ? 5 : r <= 0.03 ? 4.5 : r <= 0.06 ? 4 : r <= 0.12 ? 3 : r <= 0.20 ? 2 : 1;
const report = {
  original: origPath, clone: clonePath, dimensions: [result.W, result.H],
  rawDiffRatio: result.raw.ratio, rawScore: score(result.raw.ratio),
  alignedOffsetY: result.best.dy, alignedDiffRatio: result.best.ratio,
  alignedMeanAbsDiff: result.best.mean, alignedScore: score(result.best.ratio),
};
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`align-diff: raw ${(result.raw.ratio * 100).toFixed(1)}% → aligned ${(result.best.ratio * 100).toFixed(1)}% @ offset ${result.best.dy}px (score ${report.alignedScore}/5)`);
await browser.close();
