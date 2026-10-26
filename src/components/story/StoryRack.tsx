import { LETTER_VALUES } from "@/lib/scrabble";
import type { Enhancement, StoryTile } from "@/lib/story/types";
import { cn } from "@/lib/utils";

const ENH_CLASS: Record<Enhancement, string> = {
  DL: "tile-enh-dl",
  TL: "tile-enh-tl",
  DW: "tile-enh-dw",
  TW: "tile-enh-tw",
};

interface StoryRackProps {
  tiles: StoryTile[];
  selectedId: string | null;
  discardMode: boolean;
  discardSelection: string[];
  letterUpgrades: Record<string, number>;
  draggingId?: string | null;
  onSelect: (tileId: string) => void;
  onTilePointerDown?: (tileId: string, event: React.PointerEvent) => void;
}

export function StoryRack({
  tiles,
  selectedId,
  discardMode,
  discardSelection,
  letterUpgrades,
  draggingId,
  onSelect,
  onTilePointerDown,
}: StoryRackProps) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-xl border border-border bg-secondary/60 p-1.5 sm:gap-1.5 sm:p-2">
      {tiles.length === 0 ? (
        <span className="px-2 py-3 text-sm text-muted-foreground">No tiles left</span>
      ) : (
        tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            data-draggable-tile="true"
            style={{ touchAction: "none" }}
            onClick={() => onSelect(tile.id)}
            onPointerDown={(event) => onTilePointerDown?.(tile.id, event)}
            className={cn(
              "relative flex aspect-square w-10 items-center justify-center rounded-[4px] text-lg font-bold transition-all duration-150 hover:-translate-y-1 hover:shadow-lg active:scale-95 sm:w-12 sm:rounded-md sm:text-xl",
              tile.enhancement ? `${ENH_CLASS[tile.enhancement]} tile-gloss` : "tile-face tile-gloss",
              selectedId === tile.id && !discardMode && "-translate-y-1.5 ring-[1.5px] ring-primary",
              discardMode && discardSelection.includes(tile.id) && "-translate-y-1.5 ring-[1.5px] ring-accent",
            )}
            aria-label={`tile ${tile.letter}`}
          >
            <span className="pointer-events-none">{tile.letter === "?" ? "" : tile.letter}</span>
            <span className="pointer-events-none absolute bottom-[3px] left-[4px] text-[0.6rem] font-semibold leading-none text-base-ink sm:text-[0.7rem]">
              {tile.letter === "?" ? 0 : (LETTER_VALUES[tile.letter] ?? 0) + (letterUpgrades[tile.letter] ?? 0)}
            </span>
            {tile.enhancement ? (
              <span className="pointer-events-none absolute bottom-[3px] right-[4px] text-[0.55rem] font-bold leading-none text-mult-ink sm:text-[0.65rem]">
                {tile.enhancement}
              </span>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}
