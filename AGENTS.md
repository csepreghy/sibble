<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Story rack returns commit pending-placement removal immediately; the shared rack reserves the destination and animates a presentation-only tile clone from the board bounds while its existing FLIP animation makes space, respecting reduced motion.

- Owned Story Pens use one shared sortable control for touch, mouse and keyboard; persist reordered instances in the existing local run so gameplay and shopping share order and bonuses.

- Pen explanations use a shared presentation component backed by the Pen definitions, with live scaling bonuses passed from Pen instances, so every inspector stays consistent without altering scoring.
- Story mode (singleplayer roguelike) lives in `src/lib/story/` (engine, scoring, boards, pens, upgrades, placement, storage) with routes `src/routes/_authenticated/story.tsx` and `story_.play.tsx`. Run state persists in localStorage (`sibble:story:v1`), never in the database — it's per-device and needs no auth or sync.
- Story scoring is separate from multiplayer scoring: `src/lib/story/scoring.ts` computes Base × Mult and returns an event list the UI animates step by step, so the animation always matches the maths. Multiplayer `src/lib/scrabble.ts` is untouched by Story mode.
- Story scoring presentation uses per-device animation mode independent of speed: Normal follows contribution arrivals, Reduced filters to authoritative word/results and counts Base/Mult together before the shared finale; all presentation respects OS reduced motion and never recalculates scores.
- Reduced Story total counters and their pre-finale wait share the same number-dependent timing helper, so each box finishes independently and the finale never interrupts the longer count.
- Story Pen purchase flights use the inspected item's live bounds and the destination Pen slot; purchases commit immediately and only their flight/arrival pulse is presentation state, with reduced-motion support.
- Story boards are size-parameterized (5×5–15×15); don't reuse `SIZE`-bound helpers from `src/lib/scrabble.ts` there — use `src/lib/story/placement.ts`.
- Story responsive presentation uses one mounted gameplay route and shared board/rack/shop controls, selected by the presentation-only layout helper; this preserves pending placements and discard selections across orientation changes. Compact sizing uses the visual viewport and safe areas, with secondary information in overlays.
- Story live word inspection uses the existing placement validator and scoring pipeline with no Pens; shared score-display components keep gameplay and Bookstore score presentation consistent without changing committed scoring.
- Story rack presentation excludes pending tile IDs; placement validation rejects duplicate physical IDs, and whole-word overlays use grid tracks so they stay aligned while zooming. Owned Pen and shop inspectors share the same detail-tile shell to keep their appearance consistent.
- Any element given the `tile-gloss` shine must also be `relative` (or otherwise positioned): its shine is an absolutely positioned pseudo-element and escapes to the viewport otherwise, painting a sheen over the whole screen.
- Story completed-page reviews use immutable board, tile, upgrade and scored-word snapshots captured at completion in the per-device run; reviewing a snapshot must never mutate the live page or its pending placements.
- Story statistics live in `src/lib/story/stats.ts`, persisted per device in localStorage (`sibble:story:stats:v1`) and recorded from the play route after commits — never in the database, never recalculated from presentation state.
- `/lobby` is the mode chooser; `/story` and `/multiplayer` use the shared centered `ModeMenu`. `AppNav` derives the mode from the path and shows Play/History/Statistics/Theme without a mode toggle; Play contains mode-specific start/resume actions, keeping navigation consistent while preserving existing game and run storage.
- Story word-length starting Mult comes only from `wordLengthMult()` in `src/lib/story/scoring.ts`; UI must never assume Mult equals word length, so balance changes stay in one table.
