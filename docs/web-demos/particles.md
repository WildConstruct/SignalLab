# Demo Plan — Particles

**Positioning:** signal-driven emitters. Standalone in the Lab, but the real home
is **Entropy** — the signal becomes one of Entropy's drivers (birth-rate spikes,
the "randomness multiplier graph" Harry described for confetti/size spikes).
This demo is the bridge that proves Signal Rack → Entropy.

## Variants (port from `drawApplied()` Particles category)
Fountain (`particles`), Shock rings (`partRings`), Stream field (`partStream`),
Orbit swarm (`partOrbit`), Confetti fall (`partFall`), Starfield warp (`partStars`).

## Controls
- **Structure:** emitter shape; max count; gravity; lifetime; size; palette.
- **Signal:** built-in driver or external recipe.
- **Shaping:** birth-rate response (curved: quiet→sparse, peaks→eruption);
  burst threshold (`Fire ≥` for shock rings); spread/velocity depth.

## MVP (first loop slice)
Fountain (port `particles`): driver energy `n` → curved birth rate (`e*e`) +
spread; particles inherit hue from energy. One preset.

## Roadmap
1. MVP fountain. 2. Shock rings (peak-triggered burst threshold). 3. Stream
field (density/speed). 4. Orbit + confetti + starfield. 5. Response curve +
external signal; document the Entropy driver mapping for handoff.

## Notes
Keep the emitter param names aligned with Entropy's so a recipe transfers. This
demo's value is mostly as the **Entropy integration proof**, not a standalone SKU.
