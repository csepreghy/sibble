import { LETTER_VALUES } from "@/lib/scrabble";
import { cn } from "@/lib/utils";

interface RackProps {
  tiles: string[];
  selected: number | null;
  exchangeSelection: number[];
  exchangeMode: boolean;
  draggingPosition?: number | null;
  onSelect: (position: number) => void;
  onTilePointerDown?: (position: number, event: React.PointerEvent) => void;
}

export function Rack({
  tiles,
  selected,
  exchangeSelection,
  exchangeMode,
  draggingPosition,
  onSelect,
  onTilePointerDown,
}: RackProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 p-2.5">
      {tiles.length === 0 ? (
        <span className="px-2 py-3 text-sm text-muted-foreground">No tiles left</span>
      ) : (
        tiles.map((letter, position) => (
          <button
            key={`${letter}-${position}`}
            type="button"
            data-draggable-tile="true"
            style={{ touchAction: "none" }}
            onClick={() => onSelect(position)}
            onPointerDown={(event) => onTilePointerDown?.(position, event)}
            className={cn(
              "tile-face relative flex h-12 w-12 items-center justify-center rounded-md text-xl font-bold transition-all duration-150 hover:-translate-y-1 hover:shadow-lg active:scale-95",
              selected === position && !exchangeMode && "-translate-y-1.5 ring-2 ring-primary",
              exchangeMode && exchangeSelection.includes(position) && "-translate-y-1.5 ring-2 ring-accent",
              draggingPosition === position && "opacity-30",
            )}
          >
            <span className="pointer-events-none">{letter === "?" ? "" : letter}</span>
            <span className="pointer-events-none absolute bottom-0.5 right-1 text-[0.6rem] font-semibold opacity-70">
              {letter === "?" ? "" : LETTER_VALUES[letter]}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
