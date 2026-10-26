# Roadmap — Sibble Story Mode (singleplayer roguelike)

Source spec: uploaded `Sibble_-_Singleplayer_Story_Mode_pasted.md`. Multiplayer stays untouched.

- [ ] Story engine lib: types, boards (5×5→15×15, 9 pages, 3 plot twists), scoring pipeline (Base×Mult, enhancements, 10 pens, plot twists), bookstore offer generation, upgrades, localStorage persistence
- [ ] Story routes: `/story` intro + `/story/play` (board, left run-info sidebar, right pens sidebar, bottom rack/actions, bookstore phase, victory/defeat screens)
- [ ] Scoring animation sequence (step-through events, blue Base / orange Mult)
- [ ] Tap-to-inspect explainers (tiles, pens, squares, offers, plot twist)
- [ ] Nav entry + head metadata; portrait rotate message
- [ ] Verify: build clean, Playwright smoke test of a full Page 1 loop
