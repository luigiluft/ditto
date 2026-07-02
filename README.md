# Ditto

**Point it at any website. It studies the real thing, then rebuilds it wearing your brand.**

Named after the Pokémon that transforms into anything it sees. Ditto is a Claude Code skill that reverse-engineers a site's design, theme, animation, and even WebGL, then reconstructs it as your own codebase — not a screenshot trace, not AI-hallucinated code, the real recipe.

Most "clone this site" tools do one of two things: mirror the HTML (dead copy, breaks on any SPA) or ask an AI to *guess* the code from a screenshot (plausible, and wrong the moment you run it). Ditto does neither. It captures the real source first, grades every finding by evidence, and only builds from what it can prove.

```
recon → freeze → DNA → recipe → (3D asset) → rebuild → verify
```

---

## Why this exists

There are two great open-source clone tools, and each has a hole the other fills:

- **[ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)** (25k★) — brilliant at *rebuilding*: it dispatches parallel builder agents to reconstruct a content site into Next.js + shadcn. But it ignores WebGL/Canvas and has no rebrand or verification pass.
- **[claude-skill-web-clone](https://github.com/Jane-xiaoer/claude-skill-web-clone)** — brilliant at *rigor*: a real-source-first methodology with runnable probes, WebGL reverse-engineering, and a versionable design-DNA. But it has no scaffold, no parallel builders, and can't generate a 3D asset.

Ditto is the conductor that unites both and adds the three pieces neither has:

1. **Own-3D-asset route.** When the target ships a proprietary mesh you shouldn't rip, Ditto generates an *equivalent* asset from the extracted recipe (image→GLB, ~$0.86) instead.
2. **Rebrand mode.** Map the target's design-DNA roles onto *your* brand tokens: their structure and choreography, your skin.
3. **A verify gate that scores.** Pixel-diff the clone against the original at four breakpoints, 1–5, so "done" is a number, not a vibe.

---

## The two gates (this is the whole point)

**Iron law — real source first.** Any AI-written "here's how that effect works" is a *hint*, not code. Every executable block is treated as hallucinated until verified against real source, line by line. Case in point ([`references/marbles-case.md`](references/marbles-case.md)): an AI confidently described a glass-marble effect as *ray-marching + SDF*; the real implementation was *analytic sphere-ray intersection + an SVG `feDisplacementMap` refracting the live DOM*. Two entirely different algorithms. Copy the wrong one and it runs many times slower and looks nothing like the original.

Every technical finding gets an evidence tag:

| Tag | Meaning |
|---|---|
| `SOURCE` | Real code, source-map, runtime dump, frame capture, or network response with a hash |
| `PARTIAL` | A name or slice — a handle for the next probe, not a conclusion |
| `GUESS` | Visual fit, a magic number, "looks right" |

**Unmarked defaults to GUESS. GUESS-level code cannot be implemented until it becomes SOURCE.** No tuning a constant to mask an algorithmic error.

**Verify gate.** The clone isn't done until `visual-diff.mjs` scores it against the original in a real browser. Identical → `visualScore: 5`; wildly off → `1`. Run it at 1440 / 768 / 390. Honestly record anything you couldn't verify — never claim "should work."

---

## The 7 stages

1. **Source first** — hunt the real code on GitHub before scraping (`gh search`, source-map recovery). Found + license permits → skip straight to rebuild.
2. **Recon** — `recon-site.mjs` detects the framework (Three / GSAP / Lenis / React / Vue / Next), counts canvas/video/image, snaps three viewports, then classifies complexity L1–L6.
3. **Freeze** — pick the route: `mirror-site.mjs` (static, downloads even runtime `.glb`/`.wasm`), `network-capture.mjs` (SPA fixtures), `route-crawl.mjs` (multi-page), `interaction-probe.mjs` (scroll/hover/click state).
4. **DNA** — `dna-scaffold.mjs` distills a `design-dna.json` (design_system / design_style / visual_effects). For rewrite/rebrand modes; a faithful clone uses the real source as truth.
5. **Recipe** — content sites → parallel builder dispatch (spec-per-section → agents in worktrees → sequential merge). Heavy WebGL → reverse-engineer with the evidence gate + baseline-first replay.
6. **3D asset** *(Ditto's addition)* — generate your own equivalent mesh instead of ripping theirs. Recipe in [`references/higgsfield-3d-route.md`](references/higgsfield-3d-route.md).
7. **Verify** — pixel-diff + `compare-recon` + `audit-clone` (strips tracking and target-brand residue). Score it, then ship.

---

## Install

Ditto is a Claude Code skill. Drop it where your agent looks for skills:

```bash
# Global (available in every project)
git clone https://github.com/luigiluft/ditto ~/.claude/skills/ditto

# Or per-project
git clone https://github.com/luigiluft/ditto .claude/skills/ditto
```

The recon/verify scripts use Playwright. If it isn't already on your machine, install it once in your clone project:

```bash
npm i -D playwright && npx playwright install chromium
```

The loader also auto-discovers a Playwright that a connected Playwright MCP server has cached, so on many setups you need nothing.

---

## Use

In Claude Code, just describe the job:

> *"clone this landing page and rebrand it for my project"* — with a URL
> *"copy this scroll animation 1:1"*
> *"use gsap.com as the base and swap in my content"*

Or invoke the skill directly and pass one or more target URLs. Ditto walks the seven stages, keeps a `NOTES.md` / `TEARDOWN.md` of what it found (with evidence tags), and won't declare the clone finished until the verify gate passes.

**Don't** use it to build a site from scratch with no reference, or to rip a proprietary 3D mesh — those are out of scope by design.

---

## What's inside

**Engine** (`scripts/`, runnable Node + Playwright): `recon-site` · `mirror-site` · `asset-harvest` · `network-capture` · `interaction-probe` · `route-crawl` · `sourcemap-hunt` · `dna-scaffold` · `visual-diff` · `compare-recon` · `audit-clone` · `init-clone`.

**External arsenal** the skill reaches for instead of reimplementing: [webappanalyzer](https://github.com/enthec/webappanalyzer) (stack fingerprint), [browsertrix-crawler](https://github.com/webrecorder/browsertrix-crawler) (faithful WACZ archive), [webcrack](https://github.com/j4k0xb/webcrack) (unminify bundles), [Spector.js](https://github.com/BabylonJS/Spector.js) (live WebGL inspection), [glTF-Transform](https://github.com/donmccurdy/glTF-Transform) (process GLB), [snapdom](https://github.com/zumerlab/snapdom), [css-to-tailwind](https://github.com/hymhub/css-to-tailwind), [crawlee](https://github.com/apify/crawlee).

---

## Credits

Ditto stands on two excellent projects, both MIT:

- **[Jane-xiaoer/claude-skill-web-clone](https://github.com/Jane-xiaoer/claude-skill-web-clone)** — the engine and the real-source-first methodology. The `scripts/` and most `references/` are vendored from it. ★ their repo.
- **[JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)** — the parallel-builder-dispatch pattern for content sites. ★ their repo too.

## License

MIT. See [LICENSE](LICENSE) for the full text and third-party attributions.
