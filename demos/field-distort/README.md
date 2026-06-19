# Field Distort (demo) — Etheros as a distorter

The inverse of **Field Bridge**. There a signal *drives* a field; here the field
is the **instrument that distorts something else**. A FUI plate (reticle / grid /
type / rings) is warped by the Etheros field used as a **displacement map**:

- the field's local **gradient** offsets the source pixels (organic warp),
- the signal `n` **pulses the distortion amount** over time,
- a **chroma split** along the displacement gives a film-burn / sensor-interference
  fringe, and **Heat rise** adds a value-driven vertical shimmer.

```
plate (FUI vector art)  ──displaced by──>  Etheros field  ──pulsed by──> signal
```

Runs on CPU (`etheros-lite`) so the displacement field can be sampled at arbitrary
points for the gradient; warped at reduced resolution and scaled up smoothly. This
is the Capsule/rig composition again — an Etheros field as a *distortion source*
for another instrument, not a generator.

> Next steps: imported-image target (bring your own plate), a GPU warp path
> (field + image both as textures), and routing the field's **gradient/flow**
> output as a first-class displacement signal.
