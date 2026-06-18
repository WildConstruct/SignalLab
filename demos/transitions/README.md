# Transitions (demo)
Signal-shaped animate-ins. MVP: a **loading bar** whose fill pace is shaped by the
signal while staying monotonic (never regresses). Roadmap (wipe, radial, text
reveal) in `docs/web-demos/transitions.md`.

`python3 -m http.server` → `/demos/transitions/`

- **Structure** — *Bar width*. **Signal** — source/rate/combine/speed.
- **Shaping** — *Signal pace*: how much the signal accelerates the climb.
