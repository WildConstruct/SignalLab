# WC Component Manifest v0 — Signal Rack scope

> 2026-06-19 · The portable description of a **plugin-let** (a focused, curated
> instrument). Synthesizes: the component doc's manifest list (Notion "WC
> Components…"), the **Substance** exposed-parameter model, and what the demo
> framework already provides. Extends OTIS `plugin.params.json` rather than
> replacing it. v0 = pragmatic: marks what's implemented vs. future.

## Shape

A manifest is JSON. It names the engine pieces to instantiate, the **public**
(exposed) control surface, the wired signals, a default, and (future) actions /
passes / bake policy. The engine + renderer underneath are unchanged; the
manifest only *selects and polishes* — the Substance "expose a subset" move.

```jsonc
{
  "id": "fui.neural-net",            // stable id
  "name": "Neural Net",
  "version": "0.1.0",
  "engine": ">=0.1",                  // engine/contract version
  "module": "fui-kit",               // which renderer/instrument
  "variant": "synapse",              // sub-mode within the module (locked)

  // ---- exposed (public) parameters — the curated surface (Substance "Exposed") ----
  "params": [
    { "key": "_src",  "label": "Source",  "group": "Signal", "widget": "select", "options": "SRC", "default": "sine" },
    { "key": "_rate", "label": "Rate",    "group": "Signal", "widget": "slider", "min": 0.1, "max": 6, "step": 0.1, "default": 1.5, "unit": "Hz" },
    { "key": "nodes", "label": "Nodes",   "group": "Structure", "widget": "slider", "min": 6, "max": 24, "step": 1, "default": 15 },
    { "key": "fire",  "label": "Fire ≥",  "group": "Shaping",   "widget": "slider", "min": 0, "max": 1, "step": 0.01, "default": 0.45,
      "visibleIf": null }            // Substance "Visible If" == our `when:`
  ],

  // ---- signals: which drivers are wired and where they route (multi-signal opt-in) ----
  "signals": [
    { "id": "A", "role": "activation", "driver": { "x": { "src": "sine", "rate": 1.5 }, "y": { "src": "sine", "rate": 2 }, "drive": "mult" } }
  ],

  "default": "Neural Net",           // preset id baked in (Substance embedded preset)
  "presets": ["Neural Net", "Sparse Mesh"],

  // ---- future (component-doc fields not yet implemented) ----
  "actions": [],                     // ignite / pulse / burst / reset  (NOT YET)
  "passes": ["beauty"],              // beauty / alpha / luma / motion  (single canvas today)
  "render": { "realtime": true },    // render requirements
  "bake": "procedural",             // procedural | reduced | baked | media
  "targets": ["web", "ae"],          // host compatibility
  "license": { "runtime": "wc" }     // signing/licensing  (NOT YET)
}
```

## Field → where it lives today

| Manifest field | Status | Backed by |
|---|---|---|
| id / name / version / module / variant | ✅ concept | demo dir + `widget`/`variant` value |
| `params[]` (exposed, label/group/widget/range/default) | ✅ | control **schema** (`structure`/`signal`/`shaping` specs) |
| `params[].visibleIf` | ✅ | `when:` gating in `controls.js` |
| public subset selection | ✅ | `pluginlets[].controls` + `controls.setPublic()` |
| `signals[]` (wired drivers + routing) | ◑ | `driver` config; multi-signal via aux drivers (3D-text) — routing not yet declarative |
| `default` / `presets` | ✅ | presets + `applyPreset` |
| `actions[]` | ✗ | not built — the missing contract piece |
| `passes[]` | ◑ | single canvas today; multi-pass is future |
| `render` / `bake` / `targets` | ✗ | compiler concern (future) |
| `license` | ✗ | future |

## How v0 would be consumed

- **Today (prototype):** `pluginlets: [...]` inline in a demo == an inline
  manifest. `controls.setPublic(controls)` renders the exposed surface; the
  preset supplies the default + locks `variant`.
- **Now (done):** the host loads manifest JSON. A demo declares `manifests:[urls]`;
  the View picker resolves names from the files and applies on select. `?component=<url>`
  loads ANY portable component directly (host-for-any-component). Self-contained
  manifests (driver + values + controls) — no preset-name dependency. FUI Kit ships
  3 (`demos/fui-kit/manifests/*.json`). Browser-verified both paths.
- **Later (compiler):** OTIS `wc-compiler` emits this manifest + an AE adapter /
  OGraf wrapper / ComfyUI node from the authored graph (per the component doc).

## v0 decisions
- **Exposed-by-omission:** anything not in `params[]` is internal/locked. (Substance.)
- **Signals are explicit and opt-in.** Single-signal is the default shape; declare
  more only when the instrument is about multi-signal. Expose **curated knobs**
  (amounts), not raw buses.
- **`visibleIf` reuses `when:`** — no new conditional system.
- **Procedural-first**, with `bake` reserved for the compiler's reduced/baked modes.
- Keep it **above** `plugin.params.json`, sharing param semantics so AE + web agree.

## Resolved (2026-06-19)
- **Actions** ✅ — `actions:[{id,label}]` → host action bar; render reads `F.fired(id)`
  (one-shot) / `F.act(id,decay)` (envelope). Wired: FUI ⚡Pulse, Particles 💥Burst.
- **Declarative signals** ✅ — `signals:[{id,driver}]` → host builds aux drivers,
  render reads `F.sig(id, tOffset)`. 3D-text now flies from declared signals; rates
  are declarative, the panel exposes only curated *amounts* (B·Z, C·rotate). The
  signal→channel mapping stays in the renderer (it owns geometry), which is the
  right seam; only scalar-param routing remains a possible future generic layer.
- **Output passes** ✅ (v0) — host **PNG** export = beauty + alpha (canvas keeps
  transparency). Multi-pass (luma/motion) still future.

## Open questions
- Scalar-param **auto-routing** (signal → a control value, declaratively) as an
  optional generic layer beyond per-renderer use of `F.sig`.
- Multi-pass output (luma / motion-vector) for richer AE / conditioning handoff.
- Action **scheduling** (timed/seeking) per the OGraf lifecycle.
