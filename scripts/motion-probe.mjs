// motion-probe — captura a TIMELINE de movimento de um site (o que o visual-diff
// estático não enxerga). Instrumenta IntersectionObserver + scroll listeners,
// rola em passos capturando frames, e amostra transform/opacity das seções por
// posição de scroll (detecta scroll-reveals e scroll-linked motion).
//
// Uso:  node motion-probe.mjs --url <url> --out RECON --label original
// Saída: <out>/motion/<label>-fNN.png (frames)  +  <out>/<label>-motion.json (sinais)
//
// Gate de movimento (comparar original vs clone):
//   - PARIDADE DE SINAL: se original tem IO/scroll/transitions e o clone tem 0 → FAIL.
//   - DIFF POR FRAME: rode visual-diff em cada par de frames da timeline (não 1 frame só).
import { loadPlaywright, launchChromium } from "./lib/playwright-loader.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const url = arg("url");
const out = arg("out", "RECON");
const label = arg("label", "site");
const frames = parseInt(arg("frames", "6"), 10);   // nº de frames na timeline
const width = parseInt(arg("width", "1440"), 10);
if (!url) { console.error("--url é obrigatório"); process.exit(1); }

const dir = join(out, "motion");
mkdirSync(dir, { recursive: true });

const chromium = loadPlaywright().chromium;
const browser = await launchChromium(chromium);
const page = await browser.newPage({ viewport: { width, height: 900 } });

// instrumentar ANTES de carregar: contar IO e scroll listeners reais
await page.addInitScript(() => {
  window.__io = 0; window.__scroll = 0;
  const IO = window.IntersectionObserver;
  if (IO) window.IntersectionObserver = function (...a) { window.__io++; return new IO(...a); };
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t, ...r) { if (t === "scroll") window.__scroll++; return add.call(this, t, ...r); };
});

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const total = await page.evaluate(() => Math.max(document.body.scrollHeight - window.innerHeight, 0));
const step = frames > 1 ? total / (frames - 1) : 0;

// amostra por seção: transform + opacity — revela IO scroll-reveals (opacity 0→1, translateY)
async function sample() {
  return page.evaluate(() => [...document.querySelectorAll("main section, main .section")].slice(0, 12).map((s, i) => {
    const cs = getComputedStyle(s);
    return { i, opacity: cs.opacity, transform: cs.transform, visible: s.getBoundingClientRect().top < window.innerHeight };
  }));
}

const timeline = [];
for (let f = 0; f < frames; f++) {
  const y = Math.round(step * f);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(650); // deixa reveals dispararem
  await page.screenshot({ path: join(dir, `${label}-f${String(f).padStart(2, "0")}.png`), fullPage: false });
  timeline.push({ frame: f, scrollY: y, sections: await sample() });
}

const signals = await page.evaluate(() => {
  let withTransition = 0, withAnimation = 0;
  document.querySelectorAll("*").forEach((el) => {
    const s = getComputedStyle(el);
    if (s.transitionDuration && s.transitionDuration !== "0s") withTransition++;
    if (s.animationName && s.animationName !== "none") withAnimation++;
  });
  return { io: window.__io, scrollListeners: window.__scroll, withTransition, withAnimation };
});

const animated = signals.io > 0 || signals.scrollListeners > 0 || signals.withTransition > 3 || signals.withAnimation > 0;
const report = { url, label, width, frames, totalScroll: total, signals, animated, timeline };
writeFileSync(join(out, `${label}-motion.json`), JSON.stringify(report, null, 2));
console.log(`motion[${label}] animated=${animated} io=${signals.io} scroll=${signals.scrollListeners} transitions=${signals.withTransition} frames=${frames}`);
await browser.close();
