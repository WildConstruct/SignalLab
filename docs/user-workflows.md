# User Workflows

How a motion designer actually uses Signal Rack. The product feel: *create a
signal, see it, choose what it outputs, pick-whip it into motion, chain if
needed, bake when necessary.* No node graph.

## 1 — One signal drives one property
1. Apply **Signal Rack** to a control layer (auto-named `SR · Pulse Driver`).
2. Source = **Pulse**, Output A profile = **Percentage**, range **90–110**.
3. Pick-whip the logo's **Scale** to **Output A**. Logo pulses.
4. The guide-layer scope shows the waveform; the readout shows the live value.

## 2 — One signal drives several properties
Same Pulse rack: Output A = Scale %, Output B = Glow intensity, Output C = Gate.
Pick-whip scale, glow, and a blur toggle to A/B/C. One signal coordinates the
move — three interpreted outputs from a single dispatch.

## 3 — Luma probe drives particles
Probe a pulsing beam: Output A = raw luma (Normalized), Output B = smoothed and
remapped to **Entropy Birth Rate (0–250)**, Output C = threshold **Gate**. The
beam now drives particle bursts. (Bake for final renders — probing is preview-grade live.)

## 4 — Sidechained audio bounce
Rack 1 = audio transient → Output C **Trigger**. Rack 2 = **Needle Bounce**,
Input A pick-whipped to Rack 1 Output C; Output A = scale overshoot, B = rotation
kick. Type bounces on hits. No cables — just one pick-whip.

## 5 — Cathode sync drift
`Broadcast Sync Drift` recipe: slow random-walk → Output A = sync drift (px),
B = chroma phase (°), C = dropout gate. Pick-whip into Cathode params. Ships as a
`.wcx` preset.

## 6 — Technical chain (modular-by-composition)
`Clock → Divider → Gate → Type Reveal`. Each is a rack; each link is a pick-whip
of one Input slider. You get modular-synth behaviour without a modular-synth UI.

---

### The two mapping styles (pick the safer one)
- **Output-side (preferred):** set the range on the rack via the output profile;
  the pick-whip is math-free and the value is correct at the source.
- **Target-side:** `linear(s, 0, 1, lo, hi)` on the target. Use only for one-off
  retargets where you don't want to change the rack.

### The escape hatch
Anything live can be **baked** to keyframes and **detached** from the rack via
the binding helper — so a Signal Rack rig can always be handed off, archived, or
rendered on a machine without the plugin.
