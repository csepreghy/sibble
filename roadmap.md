# Roadmap — Sibble Story Mode (singleplayer roguelike)

Source spec: uploaded `Sibble_-_Singleplayer_Story_Mode_pasted.md`. Multiplayer stays untouched.

## Coin bonus terminology
- [ ] Rename visible bonuses to Page Bonus and Coin Upgrades without changing gameplay.
- [ ] Show actual excess Ink percentage and capped reward in the compact Page Complete breakdown.
- [ ] Verify reward tests and signed-in completion/upgrade displays.

## Two-mode lobby redesign
- [x] Replace lobby with centered logo and shiny Story Mode / Multiplayer buttons.
- [x] Add centered per-mode menus with Play, History, Statistics and Theme, without a mode toggle.
- [x] Allow solo practice for every authenticated user; verified ownership-only insert policy, signed-in creation and regression test without role lookup.
- [x] Verify signed-in navigation, personal theme change, starting both modes and phone layout; all 50 checks pass.

## Large-screen Story scaling
- [x] Enlarge desktop scores/status, Pens, rack and actions using bounded desktop-only sizing and fixed typography tiers.
- [x] Preserve exact board/workspace bounds at 1280×900, 1830×1177, 2560×1440 and 390×852; compact and Bookstore styling excluded.
- [x] Verify desktop rack drag/return and orientation-preserved pending placement; WITED committed 81 Ink through the scoring animation, no runtime errors, 49 Story checks pass and preview clean.

## Returning letters and centre logo
- [x] Animate tapped pending Story letters back into their rack slot while other rack letters make space.
- [x] Use the sharpest matching centre logo edge-to-edge on both boards, cropping transparent margins from the existing 512px icon.
- [x] Verify signed-in phone/desktop returns, reserved slots, original rack order, reduced motion and logo sizing; 16 Story tests pass and build clean.

## Story statistics and mode navigation
- [x] Persist per-device Story stats (longest word, best single word, highest page score, top 3 letters, stories started/won/lost, finished-story history) in localStorage.
- [x] Record stats on every committed word, page completion, story start and story end (including manual End this Story).
- [x] Add `/story/stats` and `/story/history` pages with head metadata.
- [x] Redo AppNav: Sibble / Story Mode toggle top-right, per-mode Home/History/Statistics tabs, primary New game / Start-Continue Story button; theme selector only in Sibble mode; lobby drops duplicated cards.
- [x] Verify signed-in: stats accumulate after a scored word, both new pages render, mode toggle switches navigation on phone and desktop.

## Animation modes
- [x] Remove Reduced initial counting flashes/addition tags; retain final impacts. Signed-in 3× scoring verified no early impacts, both final impacts and full 0.8s confetti before modal in both modes; 23 tests pass.
- [x] Add saved Normal/Reduced setting independently of speed.
- [x] Reduced counts Base and Mult together without contribution flights; preserve final box transfers and scoring.
- [x] Signed-in CAT scored 130 in both modes; Reduced showed simultaneous counts and only two finale flights; 22 tests pass and build clean.

## Bookstore controls and Pen ordering
- [x] Restore settings top-right; bottom controls ordered page/bag menu, coins, Continue Story.
- [x] Drag-reorder owned Pens in shopping and gameplay, preserving bonuses and saved order.
- [x] Verify phone touch and desktop mouse ordering, inspectors, reload persistence and layout; 20 Story tests pass and build clean.

## Pen explanation update
- [x] Replace all ten descriptions with the supplied text; share inline scoring colors and separate live scaling bonuses across shop/details/Run Info.
- [x] Verify all ten shop descriptions, owned bonus growth after scoring APPLE (+8/+9), and Run Info readback in the signed-in game; 17 existing Story tests pass and preview build is clean.

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
- [x] Pink enhancement whole-card border; restore effect-colored inner tiles.
- [x] Purchased Pen flight into its slot, with reduced-motion support.
- [x] Twist below Chapter/Page; coins left and remaining counters right below board.
- [x] Matte blank-letter picker.
- [x] Verify signed-in purchase persistence, visible Pen flight/owned slot, blank selection, and phone/desktop layout; 8 Story tests pass and preview build is clean.

## Completed Story pages
- [x] Preserve completed boards, played words and page stats in the current device's run; older discarded boards cannot be recovered.
- [x] Add chapter-grouped page review to bottom controls and Run Info without interrupting play.
- [x] Verify signed-in CAT completion, review, closing/reopening, reload persistence and preserved pending placements on phone/desktop; 17 tests pass and build clean.
