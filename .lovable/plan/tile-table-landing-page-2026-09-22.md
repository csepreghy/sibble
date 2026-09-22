# Tile Table landing page

## Goal
Replace the current minimal home screen with a polished public landing page that demonstrates the real game, its features, and the range of personal themes while keeping sign-in and returning-player paths obvious.

## Page structure
1. **Navigation** — Tile Table wordmark, compact links to Features and Themes, plus an auth-aware “Play now” or “Your games” action.
2. **First screen** — A bold Tile Table introduction paired with a large, recognizable Scrabble board composition built from the app’s real tile and premium-square styling. Show an active move, glossy tiles, scores, and a clear sign-in/play action.
3. **Feature overview** — A concise grid covering ad-free two-player games, shareable invitations, official word checking, live turns, personal themes, notifications, history/statistics, and rematches.
4. **Theme showcase** — Several example board scenes using different existing palettes, presented as a visual gallery so visitors can compare the dark blue, purple, pink, teal, orange, and classic looks.
5. **How play works** — A simple three-step sequence: sign in, invite someone, play at your own pace.
6. **Returning players** — Preserve the existing ongoing-game list for signed-in visitors so they can continue immediately.
7. **Closing action and footer** — A final play invitation, with direct access to authentication or the game lobby.

## Visual direction
- Use the existing glossy dark-tile and light-board language as the page’s signature visual system.
- Keep the page dark, vivid, and game-focused rather than looking like a generic software landing page.
- Make theme variety visible through real miniature boards, not abstract colour swatches alone.
- Use subtle tile lifts, glow, and scroll reveals while respecting reduced-motion settings.
- Maintain strong mobile layouts: one clear action, readable board previews, and no clipped tile labels.

## Technical details
- Rebuild the public `/` page and split reusable landing visuals into focused components where useful.
- Reuse the existing theme definitions and semantic colour tokens; add landing-specific semantic tokens only if needed.
- Keep authentication, game fetching, and the signed-in continuation list unchanged in behavior.
- Keep the existing route metadata, updating its copy only where the new page warrants it.
- Verify the full page at desktop and phone sizes, including signed-out and available signed-in states, and confirm the preview build remains clean.