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

- Story mode (singleplayer roguelike) lives in `src/lib/story/` (engine, scoring, boards, pens, upgrades, placement, storage) with routes `src/routes/_authenticated/story.tsx` and `story_.play.tsx`. Run state persists in localStorage (`sibble:story:v1`), never in the database — it's per-device and needs no auth or sync.
- Story scoring is separate from multiplayer scoring: `src/lib/story/scoring.ts` computes Base × Mult and returns an event list the UI animates step by step, so the animation always matches the maths. Multiplayer `src/lib/scrabble.ts` is untouched by Story mode.
- Story scoring presentation delays each numeric update until its contribution flight arrives; flight coordinates use live visible board/score-box bounds, while count-up and arrival pulses remain presentation-only and respect reduced motion.
- Story boards are size-parameterized (5×5–15×15); don't reuse `SIZE`-bound helpers from `src/lib/scrabble.ts` there — use `src/lib/story/placement.ts`.
- Story responsive presentation uses one mounted gameplay route and shared board/rack/shop controls, selected by the presentation-only layout helper; this preserves pending placements and discard selections across orientation changes. Compact sizing uses the visual viewport and safe areas, with secondary information in overlays.
- Story live word inspection uses the existing placement validator and scoring pipeline with no Pens; shared score-display components keep gameplay and Bookstore score presentation consistent without changing committed scoring.
- Story rack presentation excludes pending tile IDs; placement validation rejects duplicate physical IDs, and whole-word overlays use grid tracks so they stay aligned while zooming. Owned Pen and shop inspectors share the same detail-tile shell to keep their appearance consistent.
