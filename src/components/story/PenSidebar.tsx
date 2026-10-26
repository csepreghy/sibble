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
import { DndContext, closestCenter, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  activePenId?: string | null | undefined;
  arrivingPenId?: string | null | undefined;
  onArrivalEnd?: (() => void) | undefined;
  onInspect: (pen: PenInstance) => void;
  onReorder: (activeId: string, overId: string) => void;
  disabled?: boolean | undefined;
  horizontal?: boolean | undefined;
}

function SortablePen({ pen, index, activePenId, arrivingPenId, onArrivalEnd, onInspect, horizontal, disabled }: Omit<PenSidebarProps, "pens" | "slots" | "onReorder"> & { pen: PenInstance; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pen.penId, disabled: !!disabled });
  const def = penDef(pen.penId);
  const Icon = penIcon(pen.penId);
  return (
    <Button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-pen-slot={index}
      data-owned-pen={pen.penId}
      onAnimationEnd={onArrivalEnd}
      type="button"
      onClick={() => { if (!isDragging) onInspect(pen); }}
      variant="ghost"
      title={def.name}
      aria-label={def.name}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex h-auto touch-none select-none flex-col items-center justify-center gap-1 whitespace-normal rounded-lg border border-shop-pen/50 bg-shop-pen/10 p-1 text-center hover:border-shop-pen hover:bg-shop-pen/15 hover:text-foreground",
        horizontal ? "story-pen-slot" : "aspect-[3/4] shrink-0",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging && "z-20 border-shop-pen bg-card",
        arrivingPenId === pen.penId && "story-pen-arrival",
        activePenId === pen.penId && "border-shop-pen bg-shop-pen/25 shadow-[0_0_14px_color-mix(in_oklab,var(--color-shop-pen)_60%,transparent)] scale-105",
      )}
    >
      <Icon className="h-5 w-5 text-shop-pen" />
      {def.scaling && <span className="rounded-full bg-shop-pen/20 px-1.5 text-[0.55rem] font-bold text-mult-ink">+{pen.bonus} Mult</span>}
    </Button>
  );
}

export function PenSidebar({ pens, slots, activePenId, arrivingPenId, onArrivalEnd, onInspect, onReorder, disabled, horizontal }: PenSidebarProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const cells: (PenInstance | null)[] = [...pens];
  while (cells.length < slots) cells.push(null);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
      if (!disabled && over && active.id !== over.id) onReorder(String(active.id), String(over.id));
    }}>
    <SortableContext items={pens.map((pen) => pen.penId)} strategy={rectSortingStrategy}>
    <aside aria-label="Pens" className={cn("flex shrink-0 gap-2 border border-border bg-card/60", horizontal ? "story-pens" : "w-24 flex-col overflow-y-auto rounded-xl p-2 sm:w-28")}>
      {!horizontal && <h2 className="text-center text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">Pens</h2>}
      {cells.map((pen, i) => {
        if (!pen) {
          return (
            <div
              key={`empty-${i}`}
              data-pen-slot={i}
              className={cn("flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-secondary/30", horizontal ? "story-pen-slot" : "aspect-[3/4]")}
            >
              <Feather className="h-4 w-4 text-muted-foreground/40" />
            </div>
          );
        }
        return (
          <SortablePen
            key={pen.penId}
            pen={pen} index={i} horizontal={horizontal} disabled={disabled}
            activePenId={activePenId} arrivingPenId={arrivingPenId}
            onArrivalEnd={onArrivalEnd} onInspect={onInspect}
          />
        );
      })}
    </aside>
    </SortableContext>
    </DndContext>
  );
}
