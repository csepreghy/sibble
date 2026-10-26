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

## Mobile Bookstore layout correction
- [x] Remove gameplay-only elements from compact Bookstore (Base/Mult boxes, score caption, Play/Shuffle/Discard/Bag, words/discards counters).
- [x] Compact header (Chapter/Page Complete, title, gold coins, settings), horizontal Pen row preserved.
- [x] Compact ~123px two-column shop cards (small visual, one-line effect, price bottom-right); decorative SIBBLE rack above Continue, hidden on short screens; only the offer grid may scroll.
- [x] Verify at 393×852 and 393×664: no outer scroll, no nested scrollbars, no overlap, purchase flow intact (7→6 offers, coins deducted).

## Page-complete stats, pen color, Buy button
- [x] Page Complete modal on reaching the Ink target: Ink scored, words played, best single-word Ink, coins earned (per-page stats tracked in PageState; verified 32 Ink / 1 word / 8 Ink / +20 coins screenshot).
- [x] Pens always purple in the top bar/sidebar (shop-pen token, was orange primary).
- [x] Buy button gold with white text, 25% larger (h-10, text-base; verified purchase still deducts coins).

## Bookstore polish (hover, pens, enhancements, Continue)
- [x] Shop card hover no longer changes name color or shows orange background; light pulsing glow on hover (opened tile already pulses).
- [x] Pen bar slots show icon only; name/description appear in the opened inspector.
- [x] Enhancement shop tiles use dark tinted category backgrounds (no see-through gradient).
- [x] Buy button uses deeper, more saturated gold (--gold-button).
- [x] Compact Bookstore bottom order: narrow right-aligned shiny Continue button above the decorative SIBBLE rack at the very bottom (verified at 393×852).

## Shop and gameplay adjustments
- [ ] Pink enhancement whole-card border; restore effect-colored inner tiles.
- [ ] Purchased Pen flight into its slot, with reduced-motion support.
- [ ] Twist below Chapter/Page; coins left and remaining counters right below board.
- [ ] Matte blank-letter picker.
- [ ] Verify purchase, blank selection, and phone/desktop layout.
