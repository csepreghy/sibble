import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { CENTER, LETTER_VALUES, SIZE, colOf, premiumAt, rowOf, type Board, type Placement } from "@/lib/scrabble";
import { cn } from "@/lib/utils";

const PREMIUM_LABEL: Record<string, string> = {
  TW: "TW",
  DW: "DW",
  TL: "TL",
  DL: "DL",
};

const PREMIUM_CLASS: Record<string, string> = {
  TW: "bg-tw text-primary-foreground",
  DW: "bg-dw text-primary-foreground",
  TL: "bg-tl text-primary-foreground",
  DL: "bg-dl text-tile-foreground",
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type WordAxis = "h" | "v" | "x";

const CELL = 100 / SIZE;
// Clearance between the word and the points badge, in board squares.
const BADGE_GAP = CELL * 0.25;

function wordAxis(pending: Placement[]): WordAxis {
  if (pending.length < 2) return "x";
  if (new Set(pending.map((placement) => rowOf(placement.index))).size === 1) return "h";
  if (new Set(pending.map((placement) => colOf(placement.index))).size === 1) return "v";
  return "x";
}

function badgePosition(anchorIndex: number, axis: WordAxis) {
  const col = colOf(anchorIndex);
  const row = rowOf(anchorIndex);

  // Across a horizontal word the badge sits above (or below) the last tile, so
  // it never covers the letters that were just laid down.
  if (axis === "h") {
    const nearTop = row <= 1;
    return {
      left: `calc(${(col + 0.5) * CELL}%)`,
      top: nearTop ? `calc(${(row + 1) * CELL}% + ${BADGE_GAP}%)` : `calc(${row * CELL}% - ${BADGE_GAP}%)`,
      transform: nearTop ? "translate(-50%, 0)" : "translate(-50%, -100%)",
    };
  }

  // Down a vertical word it sits to the side of the last tile instead.
  if (axis === "v") {
    const nearRight = col >= SIZE - 2;
    return {
      top: `calc(${(row + 0.5) * CELL}%)`,
      left: nearRight ? `calc(${col * CELL}% - ${BADGE_GAP}%)` : `calc(${(col + 1) * CELL}% + ${BADGE_GAP}%)`,
      transform: nearRight ? "translate(-100%, -50%)" : "translate(0, -50%)",
    };
  }

  const nearRight = col >= SIZE - 2;
  const nearTop = row <= 1;

  return {
    left: nearRight
      ? `calc(${col * CELL}% - ${BADGE_GAP}%)`
      : `calc(${(col + 1) * CELL}% - ${BADGE_GAP}%)`,
    top: nearTop
      ? `calc(${(row + 1) * CELL}% + ${BADGE_GAP}%)`
      : `calc(${row * CELL}% - ${BADGE_GAP}%)`,
    transform: nearRight
      ? nearTop
        ? "translate(-60%, 20%)"
        : "translate(-60%, -70%)"
      : nearTop
        ? "translate(-40%, 20%)"
        : "translate(-40%, -70%)",
  };
}

export interface BoardPreview {
  valid: boolean;
  score: number;
  anchor: number;
  naughty?: boolean;
}

interface BoardProps {
  board: Board;
  pending: Placement[];
  lastPlayed: number[];
  preview?: BoardPreview | null;
  hoverIndex?: number | null;
  draggingIndex?: number | null;
  naughtyIndices?: number[];
  onCellClick: (index: number) => void;
  onTilePointerDown?: (index: number, event: React.PointerEvent) => void;
}

export function GameBoard({
  board,
  pending,
  lastPlayed,
  preview,
  hoverIndex,
  draggingIndex,
  naughtyIndices,
  onCellClick,
  onTilePointerDown,
}: BoardProps) {
  const pendingMap = new Map(pending.map((placement) => [placement.index, placement]));
  const naughtySet = new Set(naughtyIndices ?? []);


  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const viewRef = useRef({ zoom: 1, offset: { x: 0, y: 0 } });
  viewRef.current = { zoom, offset };

  const applyZoom = useCallback((nextZoom: number, px: number, py: number) => {
    const { zoom: current, offset: currentOffset } = viewRef.current;
    const target = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (target === current) return;
    const k = target / current;
    const next = {
      x: px - (px - currentOffset.x) * k,
      y: py - (py - currentOffset.y) * k,
    };
    const rect = viewportRef.current?.getBoundingClientRect();
    if (rect) {
      const minX = rect.width - rect.width * target;
      const minY = rect.height - rect.height * target;
      next.x = clamp(next.x, minX, 0);
      next.y = clamp(next.y, minY, 0);
    }
    setZoom(target);
    setOffset(target === MIN_ZOOM ? { x: 0, y: 0 } : next);
  }, []);

  const applyZoomRef = useRef(applyZoom);
  applyZoomRef.current = applyZoom;

  // Desktop: wheel / trackpad pinch
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const dy =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      const intensity = event.ctrlKey ? 0.006 : 0.0018;
      applyZoomRef.current(
        viewRef.current.zoom * Math.exp(-dy * intensity),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Mobile: two-finger pinch + drag to pan while zoomed
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number } | null>(null);
  const pan = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);

  function handlePointerDown(event: React.PointerEvent) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
      pan.current = null;
    } else if (pointers.current.size === 1 && viewRef.current.zoom > 1) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-draggable-tile]")) {
        pan.current = { x: event.clientX, y: event.clientY, offset: viewRef.current.offset };
      }
    }
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch.current.distance > 0) {
        applyZoom(
          viewRef.current.zoom * (distance / pinch.current.distance),
          (a!.x + b!.x) / 2 - rect.left,
          (a!.y + b!.y) / 2 - rect.top,
        );
      }
      pinch.current = { distance };
      return;
    }

    if (pan.current) {
      const scale = viewRef.current.zoom;
      const minX = rect.width - rect.width * scale;
      const minY = rect.height - rect.height * scale;
      setOffset({
        x: clamp(pan.current.offset.x + (event.clientX - pan.current.x), minX, 0),
        y: clamp(pan.current.offset.y + (event.clientY - pan.current.y), minY, 0),
      });
    }
  }

  function endPointer(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) pan.current = null;
  }

  const anchorIndex = preview?.anchor ?? null;
  const axis = wordAxis(pending);

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className="relative overflow-hidden rounded-xl bg-board p-1.5 shadow-panel sm:p-2.5"
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="relative origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: pan.current || pinch.current ? "none" : "transform 120ms ease-out",
          }}
        >
          <div
            className="grid gap-[3px] overflow-hidden rounded-[4px] bg-white p-[3px] dark:bg-white sm:rounded-md"
            style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
          >
            {board.map((tile, index) => {
              const placed = pendingMap.get(index);
              const premium = premiumAt(index);
              const content = tile ?? (placed ? { letter: placed.letter, blank: placed.blank } : null);
              const isDragged = draggingIndex === index;
              const isNaughty = Boolean(content) && (naughtySet.has(index) || tile?.naughty);
              const isLastPlayed = Boolean(tile) && lastPlayed.includes(index);

              return (
                <button
                  key={index}
                  type="button"
                  data-cell-index={index}
                  data-draggable-tile={placed ? "true" : undefined}
                  onClick={() => onCellClick(index)}
                  onPointerDown={(event) => {
                    if (placed) onTilePointerDown?.(index, event);
                  }}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-[4px] bg-board-cell text-[0.5rem] font-bold leading-none transition-all duration-150 sm:rounded-md sm:text-[0.6rem]",
                    premium && !content && PREMIUM_CLASS[premium],
                    content
                      ? isNaughty
                        ? "tile-pink-fill tile-gloss"
                        : isLastPlayed
                          ? "tile-teal-fill tile-gloss"
                          : "tile-face tile-gloss"
                      : null,
                    placed && "z-10 shadow-md tile-placing tile-gloss",
                    !content && hoverIndex === index && "ring-[1.5px] ring-primary/70",
                    !content && "hover:brightness-95",
                    isDragged && "opacity-30",
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
                      <span className="pointer-events-none text-[clamp(0.6rem,2.9vw,1.15rem)] font-bold leading-none sm:text-lg">
                        {content.letter}
                      </span>
                      <span className="pointer-events-none absolute bottom-[2px] right-[2px] text-[clamp(0.32rem,1.35vw,0.55rem)] font-semibold leading-none opacity-70">
                        {content.blank ? "" : LETTER_VALUES[content.letter]}
                      </span>
                    </>
                  ) : index === CENTER ? (
                    <img
                      src="/icon-512.png"
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full rounded-[inherit] object-cover select-none"
                    />
                  ) : premium ? (
                    <span className="px-0.5 text-center text-[0.45rem] uppercase tracking-tight sm:text-[0.8rem]">
                      {PREMIUM_LABEL[premium]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {preview && anchorIndex !== null ? (
            <div
              className="pointer-events-none absolute z-20"
              style={badgePosition(anchorIndex, axis)}
            >
              <span
                className={cn(
                  "flex animate-in items-center gap-0.5 rounded-[4px] px-1.5 py-0.5 text-[0.62rem] font-bold leading-none shadow-panel zoom-in duration-200 opacity-80 sm:gap-1 sm:rounded-md sm:px-2 sm:py-1 sm:text-xs",
                  !preview.valid
                    ? "bg-destructive/85 text-destructive-foreground"
                    : preview.naughty
                      ? "bg-naughty/85 text-naughty-foreground"
                      : "bg-emerald-600/85 text-white",
                )}
              >
                {preview.valid ? (
                  <>
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={3} />
                    {preview.score}
                    {preview.naughty ? <span className="opacity-90">2×</span> : null}
                  </>
                ) : (
                  <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={3} />
                )}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {zoom > 1 ? (
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="absolute right-3 top-3 z-30 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold shadow-panel"
        >
          Reset zoom
        </button>
      ) : null}
    </div>
  );
}
