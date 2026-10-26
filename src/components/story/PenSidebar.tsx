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
}

export function PenSidebar({ pens, slots, activePenId, onInspect }: PenSidebarProps) {
  const cells: (PenInstance | null)[] = [...pens];
  while (cells.length < slots) cells.push(null);

  return (
    <aside className="flex w-24 shrink-0 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-card/60 p-2 sm:w-28">
      <h2 className="text-center text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">Pens</h2>
      {cells.map((pen, i) => {
        if (!pen) {
          return (
            <div
              key={`empty-${i}`}
              className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-border/70 bg-secondary/30"
            >
              <Feather className="h-4 w-4 text-muted-foreground/40" />
            </div>
          );
        }
        const def = penDef(pen.penId);
        const Icon = penIcon(pen.penId);
        return (
          <button
            key={pen.penId}
            type="button"
            onClick={() => onInspect(pen)}
            className={cn(
              "flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border border-border bg-secondary/70 p-1 text-center transition-all duration-200 hover:border-primary",
              activePenId === pen.penId &&
                "border-primary bg-primary/20 shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_60%,transparent)] scale-105",
            )}
          >
            <Icon className="h-5 w-5 text-primary" />
            <span className="text-[0.6rem] font-bold leading-tight">{def.name}</span>
            {def.scaling ? (
              <span className="rounded-full bg-primary/20 px-1.5 text-[0.55rem] font-bold text-primary">
                +{pen.bonus} Mult
              </span>
            ) : null}
          </button>
        );
      })}
    </aside>
  );
}
