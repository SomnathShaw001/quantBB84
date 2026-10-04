---
name: no-ai-look-ui
description: >-
  MANDATORY for any HTML, CSS, JS, chart, PDF-report or other visible UI work in
  the BB84 simulator repo. Enforces the "Physics Lab Notebook / Research
  Instrument" visual direction and bans the stereotypical AI-generated website
  look (glassmorphism, blue/purple/neon, glow, gradient text, blobs, generic
  SaaS layout). Also read the global `anti-ai-slop-ui` skill if available.
---

# no-ai-look-ui — BB84 Lab visual guardrail

The UI must look like a **physics lab notebook crossed with a measurement
instrument**, not like an AI-generated SaaS template. If a designer would say
"an AI made this", the work is not done.

## 1. Banned (zero tolerance unless the user approves in writing)

- Glassmorphism, frosted panels, `backdrop-filter`, translucent cards
- Blue / purple / indigo / violet / cyan / magenta as primary or accent colour;
  purple→blue gradients of any kind
- Neon glow, glowing `box-shadow`, `text-shadow` glow, "quantum sparkle"
- Dark navy/black "space" backgrounds, particles, starfields, aurora, blobs,
  mesh gradients
- Gradient text
- Centered hero → subtitle → 2 CTAs → 3 feature cards → CTA layout
- Bento grids as decoration; rows of identical equal-weight cards
- Emoji as icons; AI sparkle icons
- `border-radius` > 4px (exception: true circles such as Bloch/state glyphs)
- Hover-lift on every card; scroll-reveal on every section
- Inter / Geist / Poppins as unexamined defaults
- Hype copy: "Unlock the power of quantum", "Revolutionary", "Next-gen"
- Fake testimonials, fake statistics, fake logos, giant marketing hero
- Every section wrapped in a rounded box; decorative cards with no data
- Any visual effect with no explanatory purpose

## 2. Required direction — "Physics Lab Notebook / Research Instrument"

### Palette (colour encodes meaning only)
| Token | Hex | Meaning |
|---|---|---|
| `--paper` | `#F4F1EA` | page background |
| `--paper-2` | `#ECE7DC` | recessed areas, table stripes |
| `--ink` | `#1B1B1B` | text, Z/rectilinear basis (+) |
| `--ink-2` | `#55524B` | secondary text |
| `--rule` | `#C9C2B3` | 1px rules, grid |
| `--ochre` | `#B7791F` | X/diagonal basis (×) |
| `--vermilion` | `#C2410C` | Eve, error, abort |
| `--green` | `#2F6B3A` | match, kept bit, accepted |

Nothing else gets colour. Charts use the same tokens.

### Type
- Headings: **Source Serif 4** (serif)
- Body/UI: **IBM Plex Sans**
- Bits, bases, data, numbers: **IBM Plex Mono**

### Structure
- 1px rules, ruled tables, numbered sections (§1, §2 …), figure captions
  ("Fig. 2 — QBER vs interception fraction"), margin notes
- Graph-paper grid only behind the channel/workbench
- Asymmetric workbench: controls left, channel centre, ledger right
- Dense and information-first; the instrument *is* the hero

### Motion (functional only)
- Photon pulse travelling the channel, Eve measurement flash, bits sliding into
  the sifted key, QBER value updating
- Durations 120–400ms, `ease-out`; honour `prefers-reduced-motion`
- Always provide "skip animation"

## 3. Quality gate (run before finishing any UI phase)

1. Run `python scripts/ui_gate.py frontend` (checks banned patterns).
2. Manually score AI-Slop 0–10 (one point each: purple/blue accent, glass,
   glow, gradient text, generic hero+cards, big radii, emoji icons, default
   font, decorative motion, decorative cards). **≥5 → redesign.**
3. Ask: "Would a designer instantly say an AI made this?" If yes → revise.
4. Accessibility: contrast ≥ 4.5:1, colour never the only signal (glyph + text),
   visible focus, keyboard reachable.
