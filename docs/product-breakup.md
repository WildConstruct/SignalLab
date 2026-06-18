# Signal Lab — Product Breakup Analysis

> Source: Wild Construct team check-in, Jun 17 2026 (Brian + Harry, Borty
> listening). Grounded against the current `tool/` web app, the `SignalRack`
> plugin scaffold, and the WGSL core. This is a strategy doc, not a spec — it
> proposes how the one big "Signal Lab" tool breaks into a product line, and how
> the visual generators become signal-driven effect tools in their own right.
>
> **Implementation status:** this analysis is now being executed. See
> [`docs/web-demos/`](web-demos/README.md) for the architecture + per-demo plans
> and [`demos/`](../demos/) for the working seven-demo suite over a shared signal
> engine. Build progress is tracked in
> [`docs/web-demos/BACKLOG.md`](web-demos/BACKLOG.md) and the Notion sub-project
> **[Signal Rack — Web Demos (Engineering)](https://app.notion.com/p/383b77d6cd4f81699963d80c643576a5)**.

---

## 0 · TL;DR

Today **Signal Lab is one tool that does two jobs at once**: it *generates and
shapes a signal*, and it *renders ~50 visualizations* (FUI HUDs, particles,
kinetic text, transitions, meters, cathode look-dev) driven by that signal. The
meeting and Brian's note both point at the same cut: **the plugin should only
publish the signal (pick-whippable outputs); the generators move out to their
own tools.**

The good news, confirmed in the code: that cut already exists. Every renderer in
`drawApplied()` consumes a tiny contract — one normalized scalar `n` plus the
raw `bufX`/`bufY` buffers. **The signal and the render are already separable; we
are formalizing a seam that's already there**, not inventing one.

So the product breakup is:

1. **Signal Rack** — the utility plugin. Generator + shaper + pick-whippable
   outputs. The "modular synth for video" / "Sound Keys for signals." *No
   eye-candy renderers ship here.*
2. **Signal Lab (web)** — the free playground / authoring / marketing funnel.
   Stays the all-in-one demo where you can *see* every generator alive.
3. **Generator tools** — FUI Kit, Glitch/Distortion, work-widget packs, etc.
   Each renders a *structure* (grid / net / field / scanlines) with its own
   controls, and lets a signal run **in the background** through **subtle shaping
   controls** to bring it to life.
4. **Look-dev plugins** (Cathode, Entropy) — already separate; they become the
   first *consumers* that prove the "reusable building block" thesis.
5. **The "big device"** — the eventual composite where *multiple* Signal Racks
   drive *multiple* distortion stages (the CRT / retro-logo-machine north star).

---

## 1 · What the meeting actually decided (signal-relevant)

Pulled from the transcript, signal-engine thread (00:49:51 → 01:08:46, plus the
glitch/pixel-sort tangent at 01:43:47):

- **It's a signal generator, full stop.** Brian: *"this is literally a waveform…
  a signal generator… it's a modular synthesizer for video."* The audio-mixing /
  Sound-Keys-style audio extraction Harry asked about is explicitly **a
  different tool.**
- **The plugin's job is outputs.** *"In the plug-in version… you'd have outputs
  you could pick-whip anything to."* Three ports (Output A/B/C) showing in the
  effect controls; grab a property, pick-whip it to a port. The engine stays in
  the shader; the target reads a plugin-written param.
- **0→100 mapping is a headline feature.** Brian called out non-linear remap as
  *"surprisingly tricky"* to do by hand in FUI and *"super easy"* here. This is
  the per-output response curve.
- **Reusable building blocks is the whole thesis.** *"We took this building block
  we built for another plugin [Cathode] and reused it over here."* The signal
  drove Cathode's look live. Sidechain already cross-modulates channels.
- **Harry: "two or three products in one."** Visual output (a *visualizer*, like
  Sound Keys accidentally became) **vs.** the utility expression tool. He wants
  the interface understood before committing — argues for splitting concerns.
- **Distortion maps / imported images** (Harry): drive an image's displacement —
  *"the retro 70s/80s logo machine."* Brian: *"one asset of what would go into
  revisiting that… the old CRT-based way all those tools worked."*
- **Surface is undecided:** popup modal vs. a panel "sidecar" vs. on-canvas. They
  did not resolve this.
- **Glitch / pixel sorting** (01:43:47): *"that's a great opportunity for where
  one of those signals would go — driving distortion and pixel sorting."*
- **Touch Designer / Houdini framing** (01:43:47): this is *"a much simpler
  version of the utility nodes"* those programs have and AE never had.
- **Business:** "shock and awe" multi-tool launch; subscription suite whose value
  grows as plugins are added; public beta w/ time-limited serial; web demo
  funnel ($25 early-access idea sitting next to Prompt Spaghetti).

Every one of these lines up with **separating the driver from the render.**

---

## 2 · The seam (grounded in the code)

The current tool is three layers. Read them as a pipeline:

| Layer | In `tool/index.html` | Portable? | Belongs to… |
|---|---|---|---|
| **Generate** | Channel X/Y: `src, rate, phase, amount, offset, smooth, seed` + per-param LFO ("o") | yes — pure math, runs in WGSL & CPU ref | **Signal Rack** |
| **Shape** | Processor (gain/bias/saturate/warp/fold/gate/quantize/lag/invert/rectify), Window, Sidechain (AM/FM/phase), Distort | yes | **Signal Rack** |
| **Combine** | `drive` = X · Y · X×Y · mix · diff · min · max → one normalized `n ∈ [0,1]` | yes | **Signal Rack** (output stage) |
| **Apply / Render** | `drawApplied()` switch — ~50 widgets in 8 categories | **no — these are renderers** | **Generator tools** |

**The contract between Shape/Combine and Render is tiny.** Look at any case in
`drawApplied()`: it reads `n` (the combined scalar), `bufX[i]`/`bufY[i]` (the raw
curves over the scope window), and `fire.thresh`. That's the entire interface.
Three scalars-over-time. That is *exactly* what the plugin already publishes as
**Output A/B/C**, and exactly what `value-codec` / the recipe JSON already carry.

> **Implication:** the breakup is low-risk. We are not re-architecting; we are
> drawing a box around layers 1–3 (the plugin) and lifting layer 4 (the
> renderers) out into separate tools that *read the same three scalars.*

### The pattern is already proven inside one widget

`fuiSynapse` (the Synapse net) is the template for everything below:

```
NODES   = 11 + floor(hash(seed)·9)        // STRUCTURE: seed → node count (11..19)
edges   = per-node degree 1..3 by hash    // STRUCTURE: seed → connectivity
act(i)  = combine(bufX[…], bufY[…])        // SIGNAL in the background
fired   = act(i) > fire.thresh             // SHAPING: threshold ("Fire ≥")
pulse travels edge at phase (t·0.6 …)      // SHAPING: signal sequences activation
```

Structure (seed) defines the *instrument*; the signal runs *underneath*; a couple
of **subtle shaping knobs** (threshold, propagation) decide *how* it comes alive.
**That triad — Structure / Signal / Shaping — is the reusable design language for
every generator tool.** (See §4.)

---

## 3 · The product line

### 3.1 Signal Rack — the utility plugin (anchor)

The flagship "weird but indispensable" utility, in the spirit Harry named (Sound
Keys), positioned against the Trapcode suite as *the thing they don't have.*

- **Generate + Shape** exactly as in the web tool (layers 1–3).
- **Outputs:** A/B/C pick-whippable ports in Effect Controls. Each output has its
  own **0→100 response curve** (linear / ease / gamma / threshold-gate / custom),
  the "surprisingly tricky" remap made trivial. Extend later to typed channels
  (`A.norm` / `A.gate` / `A.trigger`) — already flagged in the impl report.
- **Guide surface:** the scope + numeric readout as a guide layer (already
  prototyped). *This is the only "visual" that ships in the utility* — a
  diagnostic scope, not a generator.
- **Escape hatches that already exist:** bake-to-keyframes + detach; recipe JSON
  / `.wcx` import; the full self-contained AE expression (no plugin needed).
- **Chaining = pick-whip** (modular by composition), never a node graph.
- **Deliberately ships without** the FUI dots / particles / cathode look. Those
  are separate products. This keeps the utility small, fast, and legible — the
  opposite of the "bloat" they criticized.

> The gate from the impl report still holds: **prove one rack drives one AE
> property end-to-end.** That's v1. Everything else composes onto it.

### 3.2 Signal Lab (web) — the playground & funnel

Keep the current all-in-one tool as the **free web surface**, because seeing
every generator come alive *is the pitch.* Roles:

- **Demo / marketing:** "here's a toy — if we build toys that are fun, you can do
  more than you'd ever hand-write." Records video, exports JSON, shareable links.
- **Recipe authoring:** dial a signal, export a `.wcx`/recipe, import it in Signal
  Rack or any generator tool. The Lab is where setups are *made*; plugins are
  where they're *used.*
- **The funnel Brian described:** sit it next to Prompt Spaghetti and a gated
  Entropy web demo; the $25 early-access / first-look mechanism lives here.
- **Dev/preview surface for every shader.** It already hosts *two* engines
  (`signal_core.wgsl` and the `cathode-crt.js` 2-pass NTSC overlay). As generator
  plugins get their own render shaders, the Lab is the natural place to preview
  them — it becomes the multi-plugin sandbox.

### 3.3 Generator tools (where the renderers go)

The current 8 Applied categories map cleanly onto candidate products. Each is a
**renderer** that reads the signal contract from §2:

| Today's category (`APP_CATS`) | Becomes | Notes |
|---|---|---|
| **FUI** (radar, scope, arc, equalizer, reticle, wave-ring, gyro, data-stream, **synapse / packets / die**) | **FUI Kit / "Heads-Up"** | The strongest standalone — FUI artists hand-wire this constantly. Lead generator product. |
| **Visual** (glow, hue, strobe, ring-pulse, defocus, gradient sweep) + **Cathode CRT** | **Look / Distortion pack** | Signal-in-the-background archetype (§4.3). Folds toward Cathode. |
| **Particles** (fountain, shock rings, stream, orbit, confetti, starfield) | folds into **Entropy** | Entropy is the particle engine; signal becomes one of its drivers (birth-rate spikes, the "randomness multiplier graph" Harry described). |
| **Text** (kinetic wave, pump, RGB glitch, typewriter, counter, shake) | **Kinetic Type** util | Or a free taste inside the Lab. |
| **Transitions** (load bar, wipe, radial, sweep, text-reveal) | **Transition pack** | Monotonic-progress shaping already built. |
| **Meter** (bar, radial, LED, stereo, histogram, dial) | bundled with FUI Kit | Same audience. |
| **Path** (wave-runner, vectorscope dot, spirograph, rose) | Lab-only flourish | Demo candy; low standalone value. |
| **Transform** (scale/rot/pos/opacity/skew) | **stays in Signal Rack** | This *is* the pick-whip use case — no renderer needed, the signal drives a real AE property. |

### 3.4 Look-dev consumers (Cathode, Entropy) — already separate

These prove the thesis at launch. Brian *already* drove Cathode's look from the
signal live. Signal Rack → Cathode (sync drift / chroma phase / dropout gate) and
Signal Rack → Entropy (birth-rate / size spikes) are the two demos that show
"reusable building blocks across plugins" — the suite's core selling point.

### 3.5 The "big device" (north star)

The composite Brian keeps pointing at: a CRT / retro-logo-machine / distortion
box where **several Signal Racks drive several distortion stages over time.** Not
v1 — but the architecture (signal as a portable channel, generators as renderers
that read channels) is exactly what makes it buildable later by composition.

---

## 4 · The generator pattern: signal in the background + subtle shaping

This is the heart of the request. The design rule, generalized from `fuiSynapse`:

> **A generator renders a *structure*. The signal runs *underneath* it. The
> interesting controls are the *subtle* ones that decide how the signal maps onto
> the structure — not a single global "make it bigger" knob.**

A radar that just scales with the signal is boring. A synapse net where the
signal selects *which* nodes fire and *ripples* activation along edges is alive.
The value is in **selection, sequencing, and displacement across a structure**,
not global gain.

### 4.1 Three control tiers (every generator follows this)

1. **Structure** — the static identity of the instrument. *Grid size, rows/cols,
   node count, edge density/connectivity, shape (grid / radial / spiral / free),
   complexity, lane count, band count, seed, palette.* These define **what** is
   drawn. They are the controls the user asked about ("grid size / complexity /
   shape"). Off-signal, the structure still looks good (sells standalone).
2. **Signal ports** — pick-whippable inputs (Signal A/B/C). **Default: empty →
   static structure.** Pick-whip a Signal Rack output (or use the built-in
   lightweight source) → it animates. This is the "signal in the background."
3. **Shaping / mapping** — the subtle layer, where the craft lives:
   - **Field mapping** — uniform, or spatial: a wave that *sweeps* across the
     grid (per-cell phase = position), a radial pulse from center, per-node
     stagger so cells fire in sequence. (Synapse already does edge-phase
     propagation; Data packets already offset by lane.)
   - **Response** — the 0→100 remap, `Fire ≥` threshold, gamma/ease, peak-hold.
   - **Depth / amount** — how far the signal displaces / brightens / jitters,
     **subtle by default** so it reads as "alive," not "flailing."
   - **Target** — *which* aspect the signal touches: brightness, scale,
     displacement, hue, which-cells-fire, jitter amplitude, scanline drift.

A generator's UI is then: a **Structure** group (always visible), a thin
**Signal** group (the ports), and a **Shaping** group (the subtle mappers). The
signal lives in the background of the UI exactly as it lives in the background of
the render.

### 4.2 Catalog of signal-driven effects (Structure → Signal-shaping hooks)

Grounded in widgets that exist today, plus the natural extensions:

| Generator | Structure controls | Signal-shaping hooks (subtle) |
|---|---|---|
| **Synapse net** *(exists)* | node count, connectivity/degree, layout, seed | activation threshold (`Fire ≥`), edge-propagation speed, per-node phase stagger |
| **Data packets** *(exists)* | lane count, packet size, spacing, label format | spawn rate, which lanes run "hot," packet velocity, hot-lane threshold |
| **Processor die / grid** *(exists)* | grid size (cols × rows), gap, frame | which cells light, scan pattern (sweep / radial / random), brightness ramp |
| **Equalizer / bars** *(exists)* | band count, spacing, cap style | per-band offset → **travelling wave across bands**, peak-hold decay |
| **Radar** *(exists)* | ring count, sweep arc, grid | blip placement (signal → bearing/range), sweep speed, contact intensity |
| **Gyro rings** *(exists)* | ring count, radii, speeds | spin rate, lock/precess, ring "charge" by signal |
| **Data stream / matrix** *(exists)* | column width, glyph set, trail length | fall speed, density, head brightness, per-column phase from signal |
| **Particle field** *(→ Entropy)* | emitter shape, count, gravity | birth-rate spikes (the "randomness multiplier graph"), burst threshold, spread |
| **Cathode / CRT** *(→ Look pack, §4.3)* | scanline density, mask, bloom, curvature | **sync drift, chroma phase, dropout gate, h-displacement** driven subtly |
| **Image displacement** *(Harry's ask — new)* | imported image, displacement scale, axis | signal drives the displacement field over time → **retro logo machine** |
| **Pixel sort / glitch** *(01:43:47 — new)* | sort axis, span, mask | signal drives sort **threshold** and band selection → "data corruption" |
| **Grid warp / lens** *(new)* | grid resolution, warp type | signal drives a warp center / amplitude that ripples across the grid |
| **Type field** *(exists, Text cat)* | word, font, layout | per-letter stagger, shake amplitude on peaks, glitch threshold |

### 4.3 The purest "signal in the background" case: Cathode / distortion

This is the archetype the user described. The **image is the foreground**; the
signal is invisible and **subtly warps it** — sync drift, chroma bleed, dropout,
horizontal jitter. The `cathode-crt.js` 2-pass NTSC shader already exists and was
already driven by the signal in Brian's demo. Promote that wiring to a first-class
pattern: **any look-dev plugin exposes a small set of "distortion params," and
each is pick-whippable from a Signal Rack output.** That single move turns the
entire visual catalog into "signal-driven effects" without new render code.

### 4.4 Standalone vs. pick-whip — the key embedding decision

**Recommendation: every generator ships with a built-in lightweight signal source
(so it's useful and sellable alone), but every shaping control is pick-whippable
so a real Signal Rack can take over for power users.** This is the suite logic
Harry wanted — *useful alone, more powerful together* — and it drives the
subscription upsell: own FUI Kit standalone; add Signal Rack and suddenly one
driver coordinates the net, the packets, and the cathode look in lockstep.

---

## 5 · Architecture to support the breakup

Nothing here departs from the existing WebGPU-first / Dawn-bridge plan; it
extends it.

1. **Keep the WGSL core as the shared signal engine** (`signal_core.wgsl`).
   Unchanged. It already runs in browser (Lab) and natively (Dawn).
2. **Formalize the signal channel transport.** Outputs A/B/C as plugin-written
   params (bake = guaranteed; value-strip + `sampleImage` = live, codec already
   proven). This is the wire every generator reads. Consider the richer typed
   channels (`norm`/`gate`/`trigger`) before Entropy/Cathode need them.
3. **Each generator plugin = its own render shader + the same Dawn bridge + a
   signal input.** It either reads a pick-whipped Signal Rack output, or runs its
   own embedded mini-source (§4.4). Same device, same build system, same `.wcx`
   envelope — the "reuse the company runtime" win from the impl report.
4. **The Lab hosts all render shaders** as the dev/preview surface (it already
   hosts two). New generator → new tab/preset in the Lab first, then promoted to
   a plugin. This *is* the WebGPU-first workflow.
5. **Recipe JSON / `.wcx`** carries setups across tools. A look authored in the
   Lab opens in Signal Rack and feeds a generator unchanged.

> Net: the only genuinely new infrastructure is **(a)** publishing the output
> channel robustly (mostly done) and **(b)** a thin "generator reads a channel"
> convention. The renderers themselves already exist as the `drawApplied()`
> catalog — they get ported to WGSL and split into products.

---

## 6 · Packaging & sequencing (ties to the business decisions)

Maps to "shock and awe" multi-tool launch + a suite subscription whose value
grows over time:

- **Free / web:** Signal Lab playground (the funnel + recipe authoring).
- **Anchor utility:** **Signal Rack** — cheap, indispensable, Sound-Keys-shaped.
- **Generator packs:** **FUI Kit** (lead), Transition pack, Kinetic Type, then
  Glitch/Distortion.
- **Look-dev plugins:** **Cathode**, **Entropy** (particles fold in here).
- **Suite subscription:** value compounds as packs ship (Harry's model);
  individual licenses available; manage price-increase grandfathering carefully
  (their flagged concern).

**Recommended order**, because it proves the thesis fastest:

1. **Signal Rack v1** — pass the gate (one rack → one AE property, end-to-end).
2. **One visible consumer at launch** — **Cathode driven by Signal Rack** (the
   demo already half-exists) — to *show* reusable building blocks, not just claim
   it.
3. **FUI Kit** — the generator pack with the clearest standalone demand, built on
   the §4 Structure/Signal/Shaping pattern.
4. Then Transitions / Type / Glitch / image-displacement as the suite fills out.

---

## 7 · Open decisions for Brian & Harry

1. **Surface for the in-plugin generator:** modal popup vs. docked "sidecar"
   panel vs. on-canvas. (Debated, unresolved. The web Lab sidesteps it for
   authoring; the *plugin* still needs an answer.)
2. **Output channels:** 3 ports confirmed — but do FUI generators want more, or
   typed sub-channels (`A.norm`/`A.gate`/`A.trigger`) sooner?
3. **Standalone embedding:** confirm "built-in source + pick-whippable shaping"
   for every generator (§4.4), so each sells alone and upsells the suite.
4. **First consumer demo:** is Cathode the right "look, we reused a building
   block" proof for launch? (Recommend yes — it's already wired.)
5. **Where Particles live:** fold the Particle category into Entropy, or ship a
   small standalone? (Recommend: into Entropy as a signal-driven driver.)
6. **Naming:** "Signal Rack" (utility) vs. "Signal Lab" (web) vs. "FUI Kit"
   (generators) — lock the family names before marketing.
7. **Audio:** confirmed *out of scope* for Signal Rack (it's a generator, not an
   analyzer). Track the audio-reactive idea as a *separate future tool* (Harry's
   "free react utility" reference).
```
