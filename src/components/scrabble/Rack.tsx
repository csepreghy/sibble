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
    <div className="flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-secondary/60 p-1.5 sm:gap-1.5 sm:p-2.5">
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
              "tile-face relative flex aspect-square min-w-0 flex-1 basis-0 items-center justify-center rounded-md text-[clamp(1.15rem,5vw,1.6rem)] font-bold transition-all duration-150 hover:-translate-y-1 hover:shadow-lg active:scale-95 sm:max-w-12",
              selected === position && !exchangeMode && "-translate-y-1.5 ring-2 ring-primary",
              exchangeMode && exchangeSelection.includes(position) && "-translate-y-1.5 ring-2 ring-accent",
              draggingPosition === position && "opacity-30",
            )}
          >
            <span className="pointer-events-none">{letter === "?" ? "" : letter}</span>
            <span className="pointer-events-none absolute bottom-[4px] right-[4px] text-[0.65rem] font-semibold opacity-70 sm:text-[0.75rem]">
              {letter === "?" ? "" : LETTER_VALUES[letter]}
            </span>
          </button>
        ))
      )}
    </div>
  );

}
