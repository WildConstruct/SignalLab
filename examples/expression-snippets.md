# Expression Snippets (target side)

The engine is the WGSL/plugin — these are the **tiny** AE expressions a user (or
the binding helper) puts on a *target* property to read a rack's output. They are
intentionally one-liners; no signal math lives here.

## Read an output (output-side mapping — preferred)
The rack's output profile already set the range, so the target just reads it:
```js
thisComp.layer("SR · Pulse Driver").effect("Signal Rack")("Output A")
```

## Sidechain: Rack 2 Input A reads Rack 1 Output A
Put this on Rack 2's **Input A** param (the helper's "Chain" does it):
```js
thisComp.layer("SR · Audio Transient").effect("Signal Rack")("Output C")
```

## Target-side remap (only for one-off retargets)
When you don't want to change the rack, remap a normalized output on the target:
```js
s = thisComp.layer("SR · Pulse Driver").effect("Signal Rack")("Output A");
linear(s, 0, 1, 80, 120)   // e.g. scale 80%..120%
```

## Why output-side is safer
- The value is correct **at the source**, so every consumer agrees.
- The pick-whip stays math-free and readable.
- Changing the range is one control on the rack, not edits across N targets.

Use target-side `linear()` only when a single target needs a different range
than the rack's profile provides.

> Historical note: an earlier prototype put the *entire* signal engine in an
> expression on the output slider. That approach is retired — the engine is now
> `shaders/signal_core.wgsl` behind the plugin. These snippets are all that
> remains on the AE expression side, by design.
