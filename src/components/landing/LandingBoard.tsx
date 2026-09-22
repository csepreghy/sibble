import { cn } from "@/lib/utils";

type DemoTile = { letter: string; value: number; tone: "regular" | "last" | "naughty" | "placing" };

const VALUES: Record<string, number> = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
const PREMIUMS: Record<number, "TW" | "DW" | "TL" | "DL"> = {
  0: "TW", 7: "TW", 14: "TW", 105: "TW", 119: "TW", 210: "TW", 217: "TW", 224: "TW",
  16: "DW", 28: "DW", 32: "DW", 42: "DW", 48: "DW", 56: "DW", 64: "DW", 70: "DW", 154: "DW", 160: "DW", 168: "DW", 176: "DW", 182: "DW", 192: "DW", 196: "DW", 208: "DW",
  20: "TL", 24: "TL", 76: "TL", 80: "TL", 84: "TL", 88: "TL", 136: "TL", 140: "TL", 144: "TL", 148: "TL", 200: "TL", 204: "TL",
  3: "DL", 11: "DL", 36: "DL", 38: "DL", 45: "DL", 52: "DL", 59: "DL", 92: "DL", 96: "DL", 98: "DL", 102: "DL", 122: "DL", 126: "DL", 128: "DL", 132: "DL", 165: "DL", 172: "DL", 179: "DL", 186: "DL", 188: "DL", 213: "DL", 221: "DL",
};
const PREMIUM_CLASS = { TW: "bg-tw text-primary-foreground", DW: "bg-dw text-primary-foreground", TL: "bg-tl text-primary-foreground", DL: "bg-dl text-tile-foreground" };

function placeWord(map: Map<number, DemoTile>, word: string, row: number, col: number, direction: "across" | "down", tone: DemoTile["tone"]) {
  [...word].forEach((letter, offset) => {
    const index = direction === "across" ? row * 15 + col + offset : (row + offset) * 15 + col;
    map.set(index, { letter, value: VALUES[letter] ?? 1, tone });
  });
}

function makeBoard(variant: "hero" | "social" | "bold") {
  const tiles = new Map<number, DemoTile>();
  if (variant === "hero") {
    placeWord(tiles, "PLAY", 7, 5, "across", "last");
    placeWord(tiles, "YOUR", 5, 7, "down", "regular");
    placeWord(tiles, "WAY", 9, 7, "across", "placing");
  } else if (variant === "social") {
    placeWord(tiles, "SISTER", 7, 4, "across", "last");
    placeWord(tiles, "TURNS", 5, 7, "down", "regular");
  } else {
    placeWord(tiles, "VIVID", 7, 5, "across", "last");
    placeWord(tiles, "MOOD", 5, 7, "down", "naughty");
  }
  return tiles;
}

export function LandingBoard({ theme = "circuit", variant = "hero", compact = false, className }: { theme?: string; variant?: "hero" | "social" | "bold"; compact?: boolean; className?: string }) {
  const tiles = makeBoard(variant);
  return (
    <div data-theme={theme} className={cn("landing-board-shell", compact && "landing-board-compact", className)}>
      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[2px] rounded-md bg-board p-1.5 shadow-panel sm:gap-[3px] sm:p-2">
        {Array.from({ length: 225 }, (_, index) => {
          const tile = tiles.get(index);
          const premium = PREMIUMS[index];
          return (
            <span key={index} className={cn(
              "relative flex aspect-square min-w-0 items-center justify-center rounded-[3px] bg-board-cell text-[clamp(0.28rem,1.1vw,0.68rem)] font-bold leading-none sm:rounded-[4px]",
              premium && !tile && PREMIUM_CLASS[premium],
              tile?.tone === "last" && "tile-teal-fill tile-gloss",
              tile?.tone === "naughty" && "tile-pink-fill tile-gloss",
              tile?.tone === "placing" && "tile-placing tile-gloss",
              tile?.tone === "regular" && "tile-face tile-gloss",
            )}>
              {tile ? <><span>{tile.letter}</span><span className="absolute bottom-[1px] right-[1px] text-[0.42em] opacity-75">{tile.value}</span></> : index === 112 ? <span className="text-[0.72em]">★</span> : premium ? <span className="text-[0.5em]">{premium}</span> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}