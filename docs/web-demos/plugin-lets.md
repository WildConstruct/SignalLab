# Signal Rack → Plugin-lets: curation is the product

> 2026-06-19 · Scopes the WC Component / plugin-let thesis to Signal Rack + the
> demo framework. Source: Notion **"WC Components, OGraf, Entropy Live, and the
> Effect Compiler"** (2026-06-19). (Notion copy of this note pending write
> approval; this repo doc is the source of record.)

## The reframe: authoring superset vs. delivered plugin-let

The component doc defines the product object as a **plugin-let** — *"a focused
procedural instrument: does one thing well, exposes a small number of polished
controls."* That clarifies what the `demos/` are vs. what we ship.

- **The demos = the authoring/exploration SUPERSET.** Every widget, every
  control, the whole engine exposed. Good for us + power-authoring (FUI Kit = 13
  widgets; Path & Scope exposes attractors, lissajous, etc.).
- **A plugin-let = a curated SUBSET.** One instrument, a handful of intuitive
  controls, signals pre-wired, a default that already looks good. Power lives in
  the engine; the plugin-let is the tasteful window onto it.

> The most important act is not adding capability. It is **curation**. Don't make
> plugins overpowered — that reads as complicated. Be intuitive enough to make
> someone want to play. *(Brian, 2026-06-19)*

## Multi-signal decision

Multi-signal (several drivers → several transform channels, proven by the Kinetic
Type **3D multi-signal** demo) is:

- **An ENGINE capability** — first-class, wired-in. ✓
- **NOT a default.** We do **not** add always-on "N signal panels" to the host.
  That is the over-powered trap.
- **Opt-in per plugin-let,** and even then it exposes **curated knobs** ("Z fly
  amount", "Rotate amount") — not raw signal buses. The 3D-text demo is already
  the right shape: A/B/C pre-wired, artist dials amounts.
- Most plugin-lets want **one signal + three sliders.**

## Manifest v0 (Signal Rack-scoped)

The component doc calls for a Component Manifest above `plugin.params.json`. We
already have the raw materials in the demo framework — a manifest just *selects
and polishes*:

| Manifest field | Provided today by |
|---|---|
| Identity / version | demo dir + title |
| Public controls (label, range, default) | the three-tier control schema |
| Locked / hidden controls | `when`-gating in `controls.js` (curation primitive) |
| Wired signals + routing | driver config + (opt-in) aux drivers |
| Default look | presets |
| Actions (ignite/pulse/burst…) | not yet — future |
| Bake policy / host targets | not yet — future (compiler concern) |

So a Signal Rack plugin-let manifest = *pick which controls are public + polished
labels/ranges + which signals are wired + a default preset (+ later: actions,
bake policy, targets).*

## Next artifact: a "Publish as plugin-let" view

A curated publish mode in the demo host: same engine + render underneath, but the
panel shows **only the manifest's public controls** with the chosen default — the
preset-as-product. Proves *curation = product* without forking any rendering
code. The bridge from authoring demo → WC Component.

Sketch: `?publish=<presetName>` (or a manifest) hides the full panel, shows a
compact public surface (the preset's chosen controls + label overrides), keeps
the canvas + ƒ AE export. A "Publish" toggle in the host flips between authoring
and plugin-let views.

## Why this fits the larger thesis
- Keeps Entropy / launch focus intact (no new runtime).
- Operationalizes the compiler's "decide what stays procedural / reduced / exposed."
- A plugin-let can later compile to AE preset, OGraf wrapper, ComfyUI node, or a
  baked presentation — but the **curated control surface is authored here.**

## Status
- [ ] Publish-view prototype in the demo host (curated subset from a manifest).
- [ ] Manifest v0 schema doc (extends `plugin.params.json`).
- [ ] Pick a reference plugin-let to curate first (candidate: a single FUI widget
      as a focused instrument, or the 3D-text as the multi-signal exemplar).
