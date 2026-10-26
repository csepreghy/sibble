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

export interface ReturningRackTile {
  tileId: string;
  from: { left: number; top: number; width: number; height: number };
}

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
  returningTiles?: ReturningRackTile[];
  onReturnEnd?: (tileId: string) => void;
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
  returningTiles = [],
  onReturnEnd,
}: StoryRackProps) {
  const rackRef = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, number>());
  const flights = useRef(new Map<string, { clone: HTMLElement; animation: Animation }>());
  const returnEnd = useRef(onReturnEnd);
  returnEnd.current = onReturnEnd;
  const order = tiles.map((t) => t.id).join(",");
  useLayoutEffect(() => {
    const root = rackRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    root.querySelectorAll<HTMLElement>("[data-rack-tile-id]").forEach((el) => {
      const id = el.dataset["rackTileId"];
      if (!id) return;
      const left = el.offsetLeft;
      next.set(id, left);
      const prev = positions.current.get(id);
      if (!reduce && prev !== undefined && prev !== left) {
        el.animate(
          [{ transform: `translateX(${prev - left}px)` }, { transform: "translateX(0)" }],
          { duration: 300, easing: "cubic-bezier(0.2,0.8,0.2,1)" },
        );
      }
    });
    positions.current = next;
  }, [order]);

  useLayoutEffect(() => {
    const root = rackRef.current;
    if (!root) return;
    for (const returning of returningTiles) {
      if (flights.current.has(returning.tileId)) continue;
      const target = [...root.querySelectorAll<HTMLElement>("[data-rack-tile-id]")]
        .find(el => el.dataset["rackTileId"] === returning.tileId);
      if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        returnEnd.current?.(returning.tileId);
        continue;
      }
      const to = target.getBoundingClientRect();
      const from = returning.from;
      const clone = target.cloneNode(true) as HTMLElement;
      clone.removeAttribute("disabled");
      clone.removeAttribute("data-rack-tile-id");
      clone.removeAttribute("data-draggable-tile");
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("data-returning-tile", returning.tileId);
      clone.tabIndex = -1;
      Object.assign(clone.style, {
        position: "fixed", left: `${to.left}px`, top: `${to.top}px`,
        width: `${to.width}px`, height: `${to.height}px`, margin: "0",
        visibility: "visible", pointerEvents: "none", zIndex: "100",
        transition: "none", transformOrigin: "center", opacity: "1",
      });
      root.appendChild(clone);
      const dx = from.left + from.width / 2 - to.left - to.width / 2;
      const dy = from.top + from.height / 2 - to.top - to.height / 2;
      const distance = Math.hypot(dx, dy);
      const bend = Math.min(42, distance * 0.12);
      const controlX = dx / 2 + (distance ? -dy / distance * bend : 0);
      const controlY = dy / 2 + (distance ? dx / distance * bend : 0);
      const keyframes = Array.from({ length: 25 }, (_, step) => {
        const t = step / 24;
        const remaining = 1 - t;
        const x = remaining * remaining * dx + 2 * remaining * t * controlX;
        const y = remaining * remaining * dy + 2 * remaining * t * controlY;
        const sx = 1 + remaining * (from.width / to.width - 1);
        const sy = 1 + remaining * (from.height / to.height - 1);
        return { transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})`, opacity: 1, offset: t };
      });
      // Fixed timing: the rack-return flight ignores the animation-speed setting.
      const animation = clone.animate(keyframes, { duration: 420, easing: "cubic-bezier(.3,.1,.5,1)", fill: "both" });
      flights.current.set(returning.tileId, { clone, animation });
      animation.finished.then(() => {
        clone.remove();
        flights.current.delete(returning.tileId);
        returnEnd.current?.(returning.tileId);
        target.animate([{ transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 180, easing: "ease-out" });
      }).catch(() => {});
    }
  }, [returningTiles]);

  useLayoutEffect(() => () => {
    for (const { clone, animation } of flights.current.values()) {
      animation.cancel();
      clone.remove();
    }
    flights.current.clear();
  }, []);
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
            disabled={returningTiles.some(item => item.tileId === tile.id)}
            style={{ touchAction: "none", visibility: returningTiles.some(item => item.tileId === tile.id) ? "hidden" : undefined }}
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
