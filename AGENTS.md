- Subdirectories have their own `AGENTS.md`; read them before changing files there (Story rules: `src/lib/story/AGENTS.md`).
- Multiplayer Story is server-authoritative: full state (incl. private racks) lives in `story_matches` (service-role only) and changes only through `src/lib/story/match.functions.ts` calling pure transitions in `src/lib/story/multiplayer.ts` with version-checked writes; clients read the sanitized `story_match_feed` mirror (participants-only RLS, realtime). This keeps racks private and moves/purchases unforgeable and non-duplicable.

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
- `/lobby` is the mode chooser; `/story` and `/multiplayer` use the shared centered `ModeMenu`. `AppNav` derives the mode from the path and shows Play/History/Statistics/Settings without a mode toggle; `MenuSettings` reuses existing per-device Story preferences and the shared theme submenu for Multiplayer, keeping settings consistent without changing game or run storage. Play contains mode-specific start/resume actions. The Story Collection modal reads all Pen/upgrade definitions and reuses Bookstore visuals, the detail shell and Pen descriptions without creating or mutating a run.
- On bun DNSResolveFailed, use `npm install --no-package-lock --no-save --ignore-scripts`; keep the bun lockfile.
- Stale route chunks get one guarded reload per minute; preserve game/session storage and offer manual Refresh for persistent/offline failures.
- Upgrade display names may change without changing their persisted IDs or engine reward fields, so existing per-device runs retain ownership and benefits.
