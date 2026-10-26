import {
  AudioLines,
  BookOpen,
  Cat,
  Compass,
  Feather,
  GraduationCap,
  Grid2x2,
  Library,
  PenLine,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { penDef } from "@/lib/story/pens";
import type { PenInstance } from "@/lib/story/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, LucideIcon> = {
  Feather,
  PenLine,
  Grid2x2,
  BookOpen,
  Cat,
  AudioLines,
  Compass,
  Library,
  Zap,
  GraduationCap,
};

export function penIcon(id: string): LucideIcon {
  return ICONS[penDef(id).icon] ?? Feather;
}

interface PenSidebarProps {
  pens: PenInstance[];
  slots: number;
  /** pen currently animating its scoring activation */
  activePenId?: string | null;
  onInspect: (pen: PenInstance) => void;
  horizontal?: boolean;
}

export function PenSidebar({ pens, slots, activePenId, onInspect, horizontal }: PenSidebarProps) {
  const cells: (PenInstance | null)[] = [...pens];
  while (cells.length < slots) cells.push(null);

  return (
    <aside aria-label="Pens" className={cn("flex shrink-0 gap-2 border border-border bg-card/60", horizontal ? "story-pens" : "w-24 flex-col overflow-y-auto rounded-xl p-2 sm:w-28")}>
      {!horizontal && <h2 className="text-center text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">Pens</h2>}
      {cells.map((pen, i) => {
        if (!pen) {
          return (
            <div
              key={`empty-${i}`}
              className={cn("flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-secondary/30", horizontal ? "story-pen-slot" : "aspect-[3/4]")}
            >
              <Feather className="h-4 w-4 text-muted-foreground/40" />
            </div>
          );
        }
        const def = penDef(pen.penId);
        const Icon = penIcon(pen.penId);
        return (
          <Button
            key={pen.penId}
            type="button"
            onClick={() => onInspect(pen)}
            variant="ghost"
            title={def.name}
            aria-label={def.name}
            className={cn(
              "flex h-auto flex-col items-center justify-center gap-1 whitespace-normal rounded-lg border border-shop-pen/50 bg-shop-pen/10 p-1 text-center transition-all duration-200 hover:border-shop-pen hover:bg-shop-pen/15 hover:text-foreground",
              horizontal ? "story-pen-slot" : "aspect-[3/4]",
              activePenId === pen.penId &&
                "border-shop-pen bg-shop-pen/25 shadow-[0_0_14px_color-mix(in_oklab,var(--color-shop-pen)_60%,transparent)] scale-105",
            )}
          >
            <Icon className="h-5 w-5 text-shop-pen" />
            {def.scaling ? (
              <span className="rounded-full bg-shop-pen/20 px-1.5 text-[0.55rem] font-bold text-shop-pen">
                +{pen.bonus} Mult
              </span>
            ) : null}
          </Button>
        );
      })}
    </aside>
  );
}
