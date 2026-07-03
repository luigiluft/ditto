---
name: ditto
description: >-
  Clone/replicate ANY website (design, theme, animation, layout, WebGL) and
  rebuild it as your own — over a vendored recon+mirror+DNA+verify engine,
  parallel builder dispatch, an own-3D-asset route, and a rebrand mode wired to
  your brand tokens. Use when the user wants to clone, replicate, rebuild, or
  reverse-engineer a site: "make a site like this one", "clone this front",
  "copy this animation 1:1", "use this site as the base for project X", or
  "pixel-perfect clone". Takes 1+ URLs. Do NOT use to build a site from scratch
  with no reference (that's a design skill) nor to rip proprietary 3D assets.
---

# ditto — clone a site → rebuild it as your own

Like the Pokémon that transforms into anything: point it at a site, it studies the
real thing, then rebuilds it wearing your brand. A conductor over three engines no
single tool combines: a **recon+mirror+DNA+verify engine** (MIT web-clone scripts,
vendored in `scripts/`), **parallel builder dispatch → Next.js** (the
ai-website-cloner-template pattern), and **two additions** — own-3D-asset generation
and rebrand with your brand tokens. Runs on Windows/macOS/Linux (Chromium via
Playwright; portable loader finds it in the npx cache or a project install).

## Iron law (non-negotiable)

> **Real source first. NEVER copy code an AI "thought was there".**

Any AI-written clone analysis: the conceptual skeleton is a hint, but **every
executable code block is a hallucination until verified against real source, line by
line.** See `references/marbles-case.md`: an AI described ray-marching+SDF; the real
implementation was analytic sphere-ray intersection + an SVG `feDisplacementMap`
refracting the live DOM — completely different algorithms; the wrong one runs far
slower and looks nothing like the original. Tuning a constant never fixes an
algorithmic error.

**Evidence gate** (detail in `references/effect-extraction.md`): every technical
conclusion is tagged `SOURCE` (real code / source-map / runtime dump / frame capture /
network response with hash) · `PARTIAL` (name/slice, needs more work) · `GUESS` (visual
fit / magic number). **Unmarked = GUESS. GUESS-level code cannot be implemented until
it becomes SOURCE.**

## The 7 stages

Each stage points at a vendored script. Run from the clone project root. If Playwright
doesn't resolve, `npm i -D playwright` in the project (the loader also finds one in the
npx cache).

1. **SOURCE FIRST** — before scraping, hunt the real code on GitHub
   (`gh search repos`, `gh search code`; vercel/netlify/github.io slugs often match a
   repo name). Found + license allows → skip straight to rebuild. `sourcemap-hunt.mjs`
   tries source-maps from the bundles. Saves hours.
2. **RECON** — `recon-site.mjs --url <target> --out RECON --label original`. Detects
   framework (Three/GSAP/Lenis/React/Vue/Next), counts canvas/video/image, 3 screenshots
   (1440/768/390), console errors. → classify complexity **L1–L6** (`assessment.md`).
3. **FREEZE** — pick the route from recon:
   - Pure static → `mirror-site.mjs` (downloads every same-origin asset, incl. runtime
     `.glb/.wasm`; the true 1:1 clone of a static site).
   - SPA/SaaS data-driven → `network-capture.mjs` (API fixtures).
   - Multi-page → `route-crawl.mjs` (route map + screenshot per route).
   - Interactions → `interaction-probe.mjs` (before/after state on scroll/hover/click).
   - Assets → `asset-harvest.mjs --recon RECON/original-recon.json`.
4. **DNA** — `dna-scaffold.mjs --recon RECON/original-recon.json --out design-dna.json`.
   Generates the 3 layers (design_system / design_style / visual_effects). Annotate the
   `""` fields from the screenshots. Schema in `references/design-dna.md`. **Only for
   visual-rewrite / content-rewrite modes** — a faithful clone uses the real source as
   truth.
5. **CODE/RECIPE** — rebuild by route:
   - Content site (React/Vue/Next) → **parallel builder dispatch** (below).
   - Heavy WebGL/Canvas → reverse-engineer with the evidence gate
     (`reverse-engineering.md`) + **baseline-first**: raw replay of the minimal captured
     fact → frame-by-frame match gate → only then refactor. Live frame capture:
     Spector.js (`BabylonJS/Spector.js`) or patch `WebGLRenderingContext`.
6. **3D ASSET (our addition)** — if the target uses a proprietary mesh you will NOT
   rip: generate your own equivalent via Higgsfield (image→GLB, ~US$0.86) and apply your
   own material in the engine. Full recipe + gotchas in `references/higgsfield-3d-route.md`.
7. **VERIFY (DOUBLE gate, not optional)** — static AND motion. Recon the local clone:
   ```
   node scripts/recon-site.mjs --url http://127.0.0.1:<port>/ --out RECON --label clone
   node scripts/visual-diff.mjs --original RECON/screenshots/original-1440.png \
        --clone RECON/screenshots/clone-1440.png --out RECON/diff-1440.json --diff RECON/diff-1440.png
   node scripts/compare-recon.mjs --original RECON/original-recon.json \
        --clone RECON/clone-recon.json --out CLONE_REPORT.md
   node scripts/audit-clone.mjs --project . --brand "<target-brand>" --out CLONE_AUDIT.md
   ```
   `visual-diff` gives `diffPixelRatio` + a 1–5 `visualScore` per breakpoint. But **one
   static frame is BLIND to animation** (lesson paid on the Apple clone: 3/5 static, zero
   motion). If recon flagged the target as animated (IO/scroll/transitions), the static
   gate does NOT close on its own — run the **motion gate**:
   ```
   node scripts/motion-probe.mjs --url <original> --out RECON --label original --frames 6
   node scripts/motion-probe.mjs --url http://127.0.0.1:<port>/ --out RECON --label clone --frames 6
   # (a) signal parity: clone.animated must match original.animated (IO/scroll/transitions)
   # (b) per-frame diff: visual-diff each pair RECON/motion/original-fNN.png × clone-fNN.png
   ```
   **Real-browser verification is mandatory** — never claim "should work"; honestly
   record what you couldn't verify. Animated WebGL scene: tab IN FOCUS (background rAF freezes).
   - **ALIGN BEFORE DIFFING (3rd lesson, proven on the Apple mirror).** `visual-diff` is a raw
     pixel compare: a few-px vertical offset (a geo banner present on only one side, a spacer)
     shifts the WHOLE frame and inflates the diff — a 1:1 mirror of apple.com scored 15.2%
     purely from a 70px banner. **Fix:** screenshot both with a `clip` starting at a common
     ANCHOR (each side's `<nav>`: `clip:{x:0,y:navTop,width,height:H}`), same height. Nav-
     anchored, that same mirror scored **1.0% / 4.5-of-5**. High diff + matching content =
     an alignment problem, not a fidelity problem — anchor and re-measure before concluding.

## Parallel builder dispatch (content-site route)

The ai-website-cloner-template pattern, for stage 5 of React/Vue/Next sites:

1. **Spec per section before any code.** For each section (top→bottom): isolated
   screenshot + `getComputedStyle()` of every element + verbatim content + interaction
   model (`static | click | scroll | time`). Multiple states = extract state A → fire
   trigger → extract state B → **diff = the behavior spec**. Save to
   `docs/components/<name>.spec.md` (≤ ~150 lines; over → split the section).
   - **RENDERED GEOMETRY, not just tokens (lesson paid on the Apple clone).** The asset
     URL is not enough. For images/heros, capture the *real box*: `getBoundingClientRect`
     (rendered w/h/top) + `object-fit` + `object-position` + `transform` (Apple shows a
     3008px hero in a 1440px box with `object-fit:fill` + `translateX(-1504px)` to reveal
     the *center slice* at 1:1 — `width:100%;max-width:…` squeezes it and kills the asset)
     + the full `<picture>`/`srcset` (5+ variants; the right one depends on width AND
     height). Reproduce the BOX, not just the asset. Never eyeball hero layout.
2. **Builder receives the spec inline** (not "read the file") + screenshot path + shared
   imports (`icons.tsx`, `cn()`, primitives). Run in a worktree, `npx tsc --noEmit`
   before finishing. Complex (3+ subcomponents) = 1 agent per subcomponent + 1 wrapper.
3. **Extract section N+1 while section N's builders work** (pipeline, no barrier).
   Sequential merge; the orchestrator resolves conflicts. `npm run build` after each
   merge (non-negotiable).

## Rebrand mode (our addition)

"Keep the DNA, swap the skin": map the roles in `design-dna.json` (primary/accent/
neutral/surface + three font families) onto your own brand tokens. Their structure +
rhythm + motion, your colors + type + copy. How to wire a `brand.tokens.json` per brand
in `references/BRAND_TOKENS.md`.

## External arsenal (call as a tool, don't reimplement)

| Stage | Tool | Use |
|---|---|---|
| Recon | `enthec/webappanalyzer` | stack fingerprint before choosing a route |
| Freeze faithfully | `webrecorder/browsertrix-crawler` + `replayweb.page` | WACZ archive + offline replay with JS |
| Unminify | `j4k0xb/webcrack` | minified bundle → readable code (stage 5) |
| WebGL live | `BabylonJS/Spector.js` | see every draw call/shader/texture (stage 5) |
| 3D asset | `donmccurdy/glTF-Transform` | process/compress GLB (yours + harvested) |
| DOM screenshot | `zumerlab/snapdom` | reinforces the visual-diff gate |
| Tokens→Tailwind | `hymhub/css-to-tailwind` | extracted CSS → classes (shadcn world) |
| Crawl at scale | `apify/crawlee` | large multi-page |

## Limits (what NOT to do)

- Don't rip the target's proprietary 3D mesh (obscure, slow, copyright) — use stage 6.
- Don't copy backend/auth/payment — a clone is a read-only replica of the presentation layer.
- Don't claim success without the verify gate run. Don't implement GUESS-level code.
- **A STATIC clone of an ANIMATED site = INCOMPLETE**, not 1:1. If recon finds IO/scroll/
  transitions, a still screenshot proves nothing — run the motion gate (stage 7).
- Don't eyeball hero geometry — extract the rendered box (stage 5, geometry item).
- A site from scratch with NO reference → not here; use a design skill.

## Vendored scripts (MIT, from web-clone — `references/LICENSE-web-clone-jane`)

`recon-site` · `mirror-site` · `asset-harvest` · `network-capture` · `interaction-probe`
· `route-crawl` · `sourcemap-hunt` · `dna-scaffold` · `visual-diff` · `compare-recon` ·
`audit-clone` · `init-clone` (+ portable `lib/playwright-loader`). Complex-route detail
(L4–L6) in `references/complex-playbooks.md`; delivery templates (NOTES/TEARDOWN/REPORT)
in `references/deliverables.md`.

**Ditto additions** (not vendored): `motion-probe` (scroll-timeline capture + IO/scroll/
transition detection for the motion gate) · the 3D-asset route (`references/higgsfield-3d-route.md`)
· rebrand mode (`references/BRAND_TOKENS.md`).
