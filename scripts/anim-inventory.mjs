// anim-inventory — enumera o que um site REALMENTE anima, pra você não INVENTAR
// movimento (lição paga: reconstruí um scroll-reveal no clone do apple.com que o
// original NÃO tem — os tiles são estáticos; só o carrossel e hovers animam).
// Instrumenta Element.animate (WAAPI) + transitionrun (CSS) e rola a página inteira,
// logando cada animação que dispara com sua spec real (duração/easing/propriedade).
//
// Uso: node anim-inventory.mjs --url <url> [--hover] [--out inv.json]
// Rode ANTES de reconstruir animação: se um elemento não aparece aqui, ele é estático —
// não invente reveal. anim-verify valida as que EXISTEM; anim-inventory diz quais existem.
import { loadPlaywright, launchChromium } from "./lib/playwright-loader.mjs";
import { writeFileSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const url = arg("url"); const doHover = process.argv.includes("--hover"); const outPath = arg("out", "anim-inventory.json");
if (!url) { console.error("--url é obrigatório"); process.exit(1); }

const chromium = loadPlaywright().chromium;
const browser = await launchChromium(chromium);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.addInitScript(() => {
  window.__waapi = []; window.__trans = [];
  const orig = Element.prototype.animate;
  Element.prototype.animate = function (kf, opts) {
    try { window.__waapi.push({ tag: this.tagName?.toLowerCase(), cls: (this.className || "").toString().slice(0, 40),
      duration: typeof opts === "object" ? opts?.duration : opts, easing: opts?.easing }); } catch {}
    return orig.call(this, kf, opts);
  };
  addEventListener("transitionrun", (e) => {
    if (window.__trans.length >= 200) return;
    const el = e.target; const cs = getComputedStyle(el);
    window.__trans.push({ tag: el.tagName?.toLowerCase(), cls: (el.className || "").toString().slice(0, 36),
      prop: e.propertyName, dur: cs.transitionDuration, easing: cs.transitionTimingFunction });
  }, true);
}, {});

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1000);
const total = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y <= total; y += 500) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(250); }
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);

// opcional: hover em elementos interativos pra capturar hover-transitions
if (doHover) {
  const els = await page.$$("a, button, [role=button]");
  for (const el of els.slice(0, 20)) { try { await el.hover({ timeout: 500 }); await page.waitForTimeout(60); } catch {} }
}

const raw = await page.evaluate(() => ({ waapi: window.__waapi, trans: window.__trans }));
// dedup transitions por (cls, prop, dur, easing)
const seen = new Set(); const transitions = [];
for (const t of raw.trans) { const k = `${t.cls}|${t.prop}|${t.dur}|${t.easing}`; if (!seen.has(k)) { seen.add(k); transitions.push(t); } }

const report = {
  url,
  waapiAnimateCalls: raw.waapi.length, waapiSample: raw.waapi.slice(0, 10),
  cssTransitionsUnique: transitions.length, transitions: transitions.slice(0, 40),
  verdict: (raw.waapi.length + transitions.length) === 0
    ? "ESTÁTICO — nada anima no scroll. Não invente reveal."
    : `${raw.waapi.length} WAAPI + ${transitions.length} tipos de transition. Reconstrua SÓ estes; valide com anim-verify.`,
};
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`anim-inventory [${url}]: WAAPI=${report.waapiAnimateCalls} · CSS-transitions=${report.cssTransitionsUnique} tipos`);
console.log("  " + report.verdict);
for (const t of transitions.slice(0, 6)) console.log(`  · ${t.cls || t.tag}: ${t.prop} ${t.dur} ${t.easing}`);
await browser.close();
