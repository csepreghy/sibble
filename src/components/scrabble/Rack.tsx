import { LETTER_VALUES } from "@/lib/scrabble";
import { cn } from "@/lib/utils";

interface RackProps {
  tiles: string[];
  selected: number | null;
  exchangeSelection: number[];
  exchangeMode: boolean;
  onSelect: (position: number) => void;
}

export function Rack({ tiles, selected, exchangeSelection, exchangeMode, onSelect }: RackProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 p-2.5">
      {tiles.length === 0 ? (
        <span className="px-2 py-3 text-sm text-muted-foreground">No tiles left</span>
      ) : (
        tiles.map((letter, position) => (
          <button
            key={`${letter}-${position}`}
            type="button"
            onClick={() => onSelect(position)}
            className={cn(
              "tile-face relative flex h-12 w-12 items-center justify-center rounded-md text-xl font-bold transition-transform",
              selected === position && !exchangeMode && "-translate-y-1.5 ring-2 ring-primary",
              exchangeMode && exchangeSelection.includes(position) && "-translate-y-1.5 ring-2 ring-accent",
            )}
          >
            {letter === "?" ? "" : letter}
            <span className="absolute bottom-0.5 right-1 text-[0.6rem] font-semibold opacity-70">
              {letter === "?" ? "" : LETTER_VALUES[letter]}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
