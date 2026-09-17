import { LETTER_VALUES, bagCounts } from "@/lib/scrabble";
import { cn } from "@/lib/utils";

interface LetterPoolProps {
  bag: string[];
  canPick: boolean;
  title: string;
  subtitle: string;
  onPick: (letter: string) => void;
  disabled?: boolean;
}

export function LetterPool({ bag, canPick, title, subtitle, onPick, disabled }: LetterPoolProps) {
  const letters = bagCounts(bag);

  return (
    <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <p className="mt-1 text-sm">{subtitle}</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-9 sm:gap-2">
        {letters.map(({ letter, count }) => (
          <button
            key={letter}
            type="button"
            disabled={!canPick || disabled}
            onClick={() => onPick(letter)}
            className={cn(
              "tile-face relative flex aspect-square items-center justify-center rounded-[4px] text-[clamp(0.9rem,3.6vw,1.25rem)] font-bold transition-all duration-150 sm:rounded-md",
              canPick && !disabled
                ? "hover:-translate-y-1 hover:shadow-lg active:scale-95"
                : "cursor-not-allowed opacity-50",
            )}
            aria-label={`Pick ${letter === "?" ? "a blank tile" : letter}, ${count} left`}
          >
            <span className="pointer-events-none">{letter === "?" ? "" : letter}</span>
            <span className="pointer-events-none absolute bottom-[3px] right-[3px] text-[0.55rem] font-semibold opacity-70 sm:text-[0.65rem]">
              {letter === "?" ? "" : LETTER_VALUES[letter]}
            </span>
            <span className="pointer-events-none absolute -top-1 -left-1 rounded-full bg-primary px-1.5 text-[0.6rem] font-bold text-primary-foreground">
              {count}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
