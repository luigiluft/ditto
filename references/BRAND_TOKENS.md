# Rebrand mode: "keep the DNA, swap the skin"

The `design-dna.json` (schema in `design-dna.md`) captures the target's **structure +
choreography** generically. Rebrand mode maps those generic roles onto **your own
brand**: their skeleton and rhythm, your skin. It's the difference between a portfolio
clone and a site you'd actually ship.

## Flow

1. Generate `design-dna.json` from the target (`dna-scaffold.mjs` + human annotation).
2. **Do not** implement the target's colors/fonts. Instead, map the DNA *roles*
   (`primary`, `accent`, `neutral`, `surface`, `heading font`, `body font`, `mono`) to
   your project's tokens.
3. Keep from the DNA: layout, spacing rhythm, motion (easing/duration), effect_intensity,
   composition, hierarchy. Swap: palette, typography, copy, assets.
4. Implement as CSS custom properties (real sites already expose tokens as `--vars`).

## Wiring your own tokens

Create a `brand.tokens.json` for each of your brands and keep it out of the public repo.
Shape it by ROLE, not by raw hex — the roles are what the DNA maps onto:

```json
{
  "name": "acme",
  "color": {
    "primary":   "#___",
    "accent":    "#___",
    "ink":       "#___",   // main text
    "surface":   "#___",   // page background
    "surface_2": "#___",   // card / elevated
    "rule":      "#___"    // borders (usually with low alpha)
  },
  "font": {
    "heading": "Your Display Serif",
    "body":    "Your Sans",
    "mono":    "Your Mono"
  }
}
```

**Extract real tokens before you invent them.** If the brand already has a live site,
run `recon-site.mjs` on it and read `cssVariables` from the recon JSON, or open the
site's `/assets/index-*.css` and copy the `--custom-props` verbatim. Don't eyeball hex
from a screenshot — you'll drift.

## The rule

Rebrand ≠ recoloring by eye. Map ROLES (primary/accent/neutral/surface + the three font
families), not hex-by-hex. The DNA guarantees the target's rhythm and hierarchy survive
the skin swap — that's the whole reason you extract a DNA instead of just changing
colors. A `brand.tokens.json` per brand makes the swap a one-line role remap.
