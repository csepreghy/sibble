# Roadmap — Sibble Story Mode (singleplayer roguelike)

Source spec: uploaded `Sibble_-_Singleplayer_Story_Mode_pasted.md`. Multiplayer stays untouched.

- [x] Story engine lib: types, boards (5×5→15×15, 9 pages, 3 plot twists), scoring pipeline (Base×Mult, enhancements, 10 pens, plot twists), bookstore offer generation, upgrades, localStorage persistence
- [x] Story routes: `/story` intro + `/story/play` (board, left run-info sidebar, right pens sidebar, bottom rack/actions, bookstore phase, victory/defeat screens)
- [x] Scoring animation sequence (step-through events, blue Base / orange Mult)
- [x] Tap-to-inspect explainers (tiles, pens, squares, offers, plot twist)
- [x] Nav entry + head metadata; portrait rotate message
- [x] Verify: build clean, Playwright smoke test of a full Page 1 loop (placed IT, scored 8 Ink with centre DW)

## Responsive SibbleBook redesign
- [x] Preserve shared game state and desktop presentation; select compact/desktop/rotation layouts.
- [x] Compact HUD, horizontal Pens, fixed board viewport, rack/actions and overlay settings.
- [x] Portrait Bookstore with scrolling two-column offers and accessible coins/Continue.
- [x] Verify device layouts, multiple grid sizes, scoring, discards, purchases and orientation persistence (Chromium device emulation; physical Safari browser controls not available here).

## Balatro-inspired Story score presentation
- [x] Shared blue/orange number boxes, separate target/current score, and words-left near rack.
- [x] Green/red pending-word highlights and pre-Pen Ink preview with invalid X tag.
- [x] Verify preview scoring tests and mobile/desktop gameplay (7 tests pass; signed-in IT previews 8 Ink and scores 16 with its Pen; 393×664 and 393×852 controls fit; desktop verified).

## Story refinements
- [x] Scoring contribution flights, arrival glow/pulse and fast count-up; inset Words/Discards counters together (phone flight screenshots, intermediate counts and arrival pulses observed; desktop scoring commits correct Ink; 8 tests pass).
- [x] Remove pending rack tiles and prevent duplicate use; verify return/drag/scoring (8 tests pass; signed-in drag/tap placement and rack return checked).
- [x] Shop-style glowing owned Pen inspector without purchase price (shared detail shell, verified after opening animation).
- [x] Whole-word validation outlines and side-by-side glossy pink/purple Ink containers (phone, short phone and desktop verified; scoring still previews 8 and commits 16 Ink with the Pen).
