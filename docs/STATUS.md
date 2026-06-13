# STATUS — pre-pivot checkpoint

**Date:** 2026-06-13

This commit is a **work-in-progress checkpoint**, not the intended architecture.

## What changed in direction
Per Wild Construct convention, tools are **developed in WebGPU first**, then the
host-facing system (the After Effects plugin) is **exposed via the Dawn bridge**.
The standalone ExtendScript/expression engine drafted here is being **replaced**:
WebGPU/WGSL becomes the sole signal engine, and the AE side is generated through
the Dawn bridge rather than hand-written expressions.

## Blocked on
Reading the Notion tool-structure + Dawn-bridge conventions (Notion MCP auth
pending). The restructure should follow those conventions for file layout,
binding/naming, and bridge surface — so it is intentionally **not** started yet
to avoid building against guessed conventions.

## Disposition of current files
| File / dir | Fate |
|---|---|
| `prototypes/browser-lab/` | **Keep** — becomes the WebGPU dev/preview surface (the "develop first" layer). To be re-authored as WGSL compute. |
| `schemas/`, `schemas/examples/` | **Keep** — recipe + output-profile schemas are engine-agnostic. |
| `docs/ae-implementation-options.md` | **Keep, revise** — add the WebGPU-first + Dawn-bridge decision as the chosen path. |
| `prototypes/ae-expressions/signal-engine.jsx` | **Retire** as the engine (kept temporarily for reference/zero-install preview). |
| `prototypes/ae-script/SignalRack.jsx` | **Shrink** to a thin host/binding helper over the bridged effect; drop the embedded engine string. |

The browser-lab signal logic is validated (`node validate.js` → 10/10 passing),
so the math is sound; the pivot is about where the engine *lives*, not whether it works.
