# Drive Control Companion App

Offline-first, touch-friendly mobile web companion for the Drive Control tabletop game (Yahtzee-style dice + football downs + play deck). Built with vanilla HTML/CSS/JS and no dependencies. Team-only mode (A vs B) with 2–4 players and a clock-based game (no drive limits).

## Run locally
```bash
# from repo root
python3 -m http.server 8000
# then open http://localhost:8000
```
Any static file server works.

## Offline/PWA
- The app registers `sw.js` to cache all assets. Load once while online, then it works in airplane mode.
- `manifest.json` enables install to home screen; click the Install button in the top bar (or your browser's install prompt).

## Usage
1. Setup: add 2–4 players, assign teams (2p 1v1, 3p 2v1, 4p 2v2). Configure clock (quarter length, number of quarters), pace preset (Arcade/Standard/Sim), running clock toggle, who receives first, and optional solo-team momentum bonus (3-player).
2. Possession starts at own 20; downs/first downs unchanged. Clock runs after each play based on play type/outcome and pace multiplier. No drive limits.
3. Active offense player rotates each possession within that team. Peek/Select keeps play cards private on one device.
4. Audible once per drive to redraw all three cards.
5. Spend momentum to arm a one-time turnover cancel token for the current drive.
6. Undo restores the last resolved play state.
7. Game ends when the clock hits 0 in the final quarter; if tied, overtime starts at 3:00 sudden death (repeat OTs if still tied). Touchdown ends overtime immediately.

## Dev Sim & Balance Lab (for tuning)
- In Setup, tap the ⚙ Dev link to reveal the Dev Sim panel.
- Configure game count, seed, clock, pace, offense/defense strategies, then run sims. JSON results can be copied or downloaded; balance helper suggests tweaks based on targets.

## Files
- `index.html` – layout and screens
- `styles/style.css` – styling
- `scripts/deck.js` – 30-card deck data
- `scripts/rules.js` – pattern detection and play outcome logic
- `scripts/state.js` – match state, persistence, undo, and flow
- `scripts/app.js` – UI wiring and interactions
- `scripts/ui.js` – small rendering helpers
- `manifest.json`, `sw.js`, `icons/` – PWA assets
