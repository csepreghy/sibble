import { useLayoutEffect, useRef } from "react";
import { LETTER_VALUES } from "@/lib/scrabble";
import type { Enhancement, StoryTile } from "@/lib/story/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  compact?: boolean;
  capacity?: number;
  /** false hides the tile shine (used by the decorative Bookstore row). */
  gloss?: boolean;
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
  compact,
  capacity = 7,
  gloss = true,
}: StoryRackProps) {
  const rackRef = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, number>());
  const order = tiles.map((t) => t.id).join(",");
  useLayoutEffect(() => {
    const root = rackRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    root.querySelectorAll<HTMLElement>("[data-rack-tile-id]").forEach((el) => {
      const id = el.dataset["rackTileId"]!;
      const left = el.offsetLeft;
      next.set(id, left);
      const prev = positions.current.get(id);
      if (!reduce && prev !== undefined && prev !== left) {
        el.animate(
          [{ transform: `translateX(${prev - left}px)` }, { transform: "translateX(0)" }],
          { duration: 380, easing: "cubic-bezier(0.2,0.8,0.2,1)" },
        );
      }
    });
    positions.current = next;
  }, [order]);
  return (
    <div ref={rackRef} aria-label="Letter rack" className={cn("relative flex items-center justify-center gap-1 rounded-xl border border-border bg-secondary/60 p-1.5 sm:gap-1.5 sm:p-2", compact && "story-rack")} style={compact ? { ["--rack-capacity" as string]: capacity } : undefined}>
      {tiles.length === 0 ? (
        <span className="px-2 py-3 text-sm text-muted-foreground">No tiles left</span>
      ) : (
        tiles.map((tile) => (
          <Button
            key={tile.id}
            type="button"
            variant="ghost"
            data-draggable-tile="true"
            data-rack-tile-id={tile.id}
            style={{ touchAction: "none" }}
            onClick={() => onSelect(tile.id)}
            onPointerDown={(event) => onTilePointerDown?.(tile.id, event)}
            className={cn(
              "relative flex h-auto aspect-square w-10 shrink-0 items-center justify-center rounded-[4px] p-0 text-lg font-bold transition-all duration-150 hover:-translate-y-1 hover:text-tile-foreground hover:shadow-lg active:scale-95 sm:w-12 sm:rounded-md sm:text-xl",
              compact && "story-rack-tile",
              tile.enhancement ? ENH_CLASS[tile.enhancement] : "tile-face",
              gloss && "tile-gloss",
              selectedId === tile.id && !discardMode && "-translate-y-1.5 ring-[1.5px] ring-primary",
              discardMode && discardSelection.includes(tile.id) && "-translate-y-1.5 ring-[1.5px] ring-accent",
              draggingId === tile.id && "opacity-30",
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
          </Button>
        ))
      )}
    </div>
  );
}
