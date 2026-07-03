// anim-verify — valida se a ANIMAÇÃO está 1:1, não só o frame estático.
// Usa relógio determinístico (page.clock) pra congelar/avançar o tempo, amostra a
// CURVA de movimento (translateX/Y, scale, opacity) de um elemento ao longo do tempo
// nos dois lados, e dá dump do getAnimations() (duração/easing/delay reais). Compara
// timing + trajetória — pega easing/duração errados que um diff de endpoints não vê.
//
// Uso: node anim-verify.mjs --original <url> --clone <url> --selector "<css>" \
//        [--trigger-class play] [--trigger-selector body] [--duration 1200] [--steps 24] --out r.json
import { loadPlaywright, launchChromium } from "./lib/playwright-loader.mjs";
import { writeFileSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const origURL = arg("original"), cloneURL = arg("clone"), selector = arg("selector");
const triggerClass = arg("trigger-class", ""), triggerSel = arg("trigger-selector", "body");
const duration = parseInt(arg("duration", "1200"), 10), steps = parseInt(arg("steps", "24"), 10);
const outPath = arg("out", "anim-verify.json");
if (!origURL || !cloneURL || !selector) { console.error("--original, --clone, --selector obrigatórios"); process.exit(1); }

const chromium = loadPlaywright().chromium;
const browser = await launchChromium(chromium);

// amostra a curva de movimento de `selector` — SEEK determinístico via Web Animations
// API (getAnimations → pause → setar currentTime). Não depende do relógio dirigir CSS.
async function sampleCurve(url) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  const result = await page.evaluate(({ sel, ts, tc, duration, steps }) => {
    const el = document.querySelector(sel);
    if (!el) return { err: "selector não achou elemento" };
    // dispara a animação (adiciona a classe) e força reflow pra a transição registrar
    if (tc) { document.querySelector(ts)?.classList.add(tc); void el.offsetHeight; }
    const anims = el.getAnimations();
    anims.forEach((a) => a.pause());
    const spec = anims.map((a) => {
      const t = a.effect?.getTiming?.() || {};
      return { duration: t.duration, delay: t.delay, easing: t.easing, fill: t.fill,
        props: [...new Set((a.effect?.getKeyframes?.() || []).flatMap((k) => Object.keys(k).filter((p) => !["offset","composite","easing"].includes(p))))] };
    });
    const read = () => {
      const cs = getComputedStyle(el);
      const m = new DOMMatrixReadOnly(cs.transform === "none" ? "" : cs.transform);
      return { tx: m.m41, ty: m.m42, sx: m.a, sy: m.d, opacity: parseFloat(cs.opacity) };
    };
    const step = duration / steps, samples = [];
    for (let i = 0; i <= steps; i++) {
      const t = i * step;
      anims.forEach((a) => { try { a.currentTime = t; } catch {} }); // SEEK exato
      samples.push({ t: Math.round(t), ...read() });
    }
    return { spec, samples, animCount: anims.length };
  }, { sel: selector, ts: triggerSel, tc: triggerClass, duration, steps });
  await page.close();
  if (result.err) { console.error(result.err); process.exit(1); }
  return result;
}

const [O, C] = [await sampleCurve(origURL), await sampleCurve(cloneURL)];

// compara trajetória: normaliza cada canal pela amplitude do ORIGINAL, mede erro médio por amostra
function curveError(a, b) {
  const chans = ["ty", "tx", "sx", "opacity"];
  const out = {};
  for (const ch of chans) {
    const vals = a.map((s) => s[ch] ?? 0);
    const range = Math.max(...vals) - Math.min(...vals) || 1;
    let err = 0, n = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      err += Math.abs((a[i][ch] ?? 0) - (b[i][ch] ?? 0)) / Math.abs(range); n++;
    }
    out[ch] = n ? err / n : 0;
  }
  out.max = Math.max(...Object.values(out));
  return out;
}

const err = curveError(O.samples, C.samples);
// spec compare (timing/easing)
const specO = O.spec?.[0] || {}, specC = C.spec?.[0] || {};
const timingMatch = { duration: specO.duration === specC.duration, easing: specO.easing === specC.easing, delay: specO.delay === specC.delay };
// score: curva idêntica (<3% erro) + timing igual = 1:1
const curveScore = err.max <= 0.03 ? 5 : err.max <= 0.07 ? 4 : err.max <= 0.15 ? 3 : err.max <= 0.30 ? 2 : 1;
const pass = curveScore >= 4 && timingMatch.duration && timingMatch.easing;

const report = {
  selector, duration, steps,
  timing: { original: specO, clone: specC, match: timingMatch },
  curveError: err, curveScore,
  verdict: pass ? "MATCH (animação 1:1)" : "DIVERGE (movimento difere)",
  curves: { t: O.samples.map((s) => s.t), original_ty: O.samples.map((s) => s.ty), clone_ty: C.samples.map((s) => s.ty),
    original_opacity: O.samples.map((s) => s.opacity), clone_opacity: C.samples.map((s) => s.opacity) },
};
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`anim-verify [${selector}]: ${report.verdict} | curveScore ${curveScore}/5 | max curve-err ${(err.max * 100).toFixed(1)}% | timing dur=${timingMatch.duration?"✓":"✗"} easing=${timingMatch.easing?"✓":"✗"}`);
console.log(`  easing original: ${specO.easing || "?"} | clone: ${specC.easing || "?"}`);
await browser.close();
