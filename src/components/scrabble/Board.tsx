import { CENTER, LETTER_VALUES, SIZE, premiumAt, type Board, type Placement } from "@/lib/scrabble";
import { cn } from "@/lib/utils";

const PREMIUM_LABEL: Record<string, string> = {
  TW: "TRIPLE WORD",
  DW: "DOUBLE WORD",
  TL: "TRIPLE LETTER",
  DL: "DOUBLE LETTER",
};

const PREMIUM_CLASS: Record<string, string> = {
  TW: "bg-tw text-primary-foreground",
  DW: "bg-dw text-primary-foreground",
  TL: "bg-tl text-primary-foreground",
  DL: "bg-dl text-tile-foreground",
};

interface BoardProps {
  board: Board;
  pending: Placement[];
  lastPlayed: number[];
  onCellClick: (index: number) => void;
}

export function GameBoard({ board, pending, lastPlayed, onCellClick }: BoardProps) {
  const pendingMap = new Map(pending.map((placement) => [placement.index, placement]));

  return (
    <div className="rounded-xl bg-board p-1.5 shadow-panel sm:p-2.5">
      <div
        className="grid gap-px overflow-hidden rounded-md bg-board-line"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
      >
        {board.map((tile, index) => {
          const placed = pendingMap.get(index);
          const premium = premiumAt(index);
          const content = tile ?? (placed ? { letter: placed.letter, blank: placed.blank } : null);

          return (
            <button
              key={index}
              type="button"
              onClick={() => onCellClick(index)}
              className={cn(
                "relative flex aspect-square items-center justify-center bg-board text-[0.5rem] font-bold leading-none transition-transform sm:text-[0.6rem]",
                premium && !content && PREMIUM_CLASS[premium],
                content && "tile-face rounded-[2px]",
                placed && "ring-2 ring-primary",
                !content && lastPlayed.includes(index) && "bg-board",
                tile && lastPlayed.includes(index) && "ring-1 ring-accent",
                !content && "hover:brightness-95",
              )}
              aria-label={
                content
                  ? `${content.letter} on square ${index + 1}`
                  : premium
                    ? `${PREMIUM_LABEL[premium]} square`
                    : `empty square ${index + 1}`
              }
            >
              {content ? (
                <>
                  <span className="text-[0.65rem] font-bold sm:text-sm">{content.letter}</span>
                  <span className="absolute bottom-0 right-0.5 text-[0.4rem] font-semibold opacity-70 sm:text-[0.5rem]">
                    {content.blank ? "" : LETTER_VALUES[content.letter]}
                  </span>
                </>
              ) : index === CENTER ? (
                <span className="text-sm">★</span>
              ) : premium ? (
                <span className="px-0.5 text-center text-[0.35rem] uppercase tracking-tight sm:text-[0.45rem]">
                  {PREMIUM_LABEL[premium]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
