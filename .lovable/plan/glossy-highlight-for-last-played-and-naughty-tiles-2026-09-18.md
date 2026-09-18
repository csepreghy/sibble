# Glossy highlight for last-played and naughty tiles

Replace the colored outlines on the board with ClimbQuest-style glossy fills:

- **Last-played tiles** (currently teal ring): fill the tile background with the teal
  accent color, as a gradient fading into a darker teal toward the bottom.
- **Naughty tiles** (currently pink ring): same treatment with the pink color
  fading into a darker pink.
- On top of both, add the exact inner gloss layer from ClimbQuest's `.tile-3d::before`:
  an inset diagonal white-to-transparent shine (top/left/right inset 5px, 27% height,
  135° gradient, screen blend, pointer-events none).
- Keep the existing drop shadow (`tile-face` shadow). Remove the old teal/pink rings
  on these tiles so the fill replaces the border, not stacks on it.

## Changes

1. `src/styles.css`
   - Add darker shade tokens: `--accent-deep` (darker teal) and `--naughty-deep`
     (darker pink) next to the existing tokens.
   - Add utilities:
     - `.tile-gloss` — the ClimbQuest `::before` shine (inset white gradient,
       `mix-blend-mode: screen`, `pointer-events: none`, z-index above the letter).
     - `.tile-teal-fill` — background `linear-gradient(180deg, var(--accent), var(--accent-deep))`,
       text color `--accent-foreground`.
     - `.tile-pink-fill` — same with `--naughty` → `--naughty-deep`, text `--naughty-foreground`.

2. `src/components/scrabble/Board.tsx`
   - Cell class logic:
     - naughty tile → `tile-pink-fill tile-gloss` (pink wins over teal if both apply),
       drop `ring-naughty`.
     - last-played tile → `tile-teal-fill tile-gloss`, drop `ring-accent`.
     - placed (pending) tiles keep their primary ring; hover ring unchanged.
   - No logic changes — presentation only.

## Verification

- `bunx tsgo --noEmit` and check the build log ends `build OK`.
- Playwright: open a game, confirm last-played and naughty tiles render as glossy
  gradient fills (element screenshot), and letters stay readable.
