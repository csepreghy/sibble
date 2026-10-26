import { useCallback, useEffect, useRef, useState } from "react";
import { LETTER_VALUES } from "@/lib/scrabble";
import type { BoardTile, Enhancement, PendingPlacement, StoryTile } from "@/lib/story/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PREMIUM_CLASS: Record<string, string> = {
  TW: "bg-tw text-primary-foreground",
  DW: "bg-dw text-primary-foreground",
  TL: "bg-tl text-primary-foreground",
  DL: "bg-dl text-tile-foreground",
};

const ENH_CLASS: Record<Enhancement, string> = {
  DL: "tile-enh-dl",
  TL: "tile-enh-tl",
  DW: "tile-enh-dw",
  TW: "tile-enh-tw",
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3.5;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface StoryBoardProps {
  size: number;
  board: (BoardTile | null)[];
  tiles: StoryTile[];
  premiums: Record<number, Enhancement>;
  usedPremiums: number[];
  pending: PendingPlacement[];
  letterUpgrades: Record<string, number>;
  /** index highlighted during the scoring animation */
  activeIndex?: number | null;
  /** word currently being scored */
  activeWord?: number[] | null;
  wordHighlights?: { indices: number[]; valid: boolean }[];
  disabled?: boolean;
  hoverIndex?: number | null;
  draggingIndex?: number | null;
  onCellClick: (index: number) => void;
  onTilePointerDown?: (index: number, event: React.PointerEvent) => void;
  compact?: boolean;
}

export function StoryBoard({
  size,
  board,
  tiles,
  premiums,
  usedPremiums,
  pending,
  letterUpgrades,
  activeIndex,
  activeWord,
  wordHighlights = [],
  disabled,
  hoverIndex,
  draggingIndex,
  onCellClick,
  onTilePointerDown,
  compact,
}: StoryBoardProps) {
  const pendingMap = new Map(pending.map((p) => [p.index, p]));
  const tileById = new Map(tiles.map((t) => [t.id, t]));
  const usedSet = new Set(usedPremiums);
  const activeWordSet = new Set(activeWord ?? []);
  const center = ((size - 1) / 2) * size + (size - 1) / 2;

  // Container-relative font sizes so any board size stays legible.
  const letterFont = `${(100 / size) * 0.44}cqw`;
  const cornerFont = `${(100 / size) * 0.17}cqw`;
  const labelFont = `${(100 / size) * 0.2}cqw`;
  // Word outlines scale with tile size so they look equally thick on every board
  // (≈3px on a phone-sized 7×7 board, where the original fixed width was tuned).
  const outlineWidth = `max(1px, ${(100 / size) * 0.073}cqw)`;
  const outlineRadius = `${(100 / size) * 0.11}cqw`;
  const outlineGlow = `${(100 / size) * 0.24}cqw`;
  // Breathing room between the tile edges and the outline, proportional to tile size.
  const outlineRoom = (100 / size) * 0.06;

  // Tile highlights (flying-number sources) scale with tile size like the word outlines.
  const highlightWidth = `max(1px, ${(100 / size) * 0.074}cqw)`;

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
    const next = { x: px - (px - currentOffset.x) * k, y: py - (py - currentOffset.y) * k };
    const rect = viewportRef.current?.getBoundingClientRect();
    if (rect) {
      next.x = clamp(next.x, rect.width - rect.width * target, 0);
      next.y = clamp(next.y, rect.height - rect.height * target, 0);
    }
    setZoom(target);
    setOffset(target === MIN_ZOOM ? { x: 0, y: 0 } : next);
  }, []);
  const applyZoomRef = useRef(applyZoom);
  applyZoomRef.current = applyZoom;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
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

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number } | null>(null);
  const pan = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);

  function handlePointerDown(event: React.PointerEvent) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y) };
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
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.distance > 0) {
        applyZoom(
          viewRef.current.zoom * (distance / pinch.current.distance),
          (a.x + b.x) / 2 - rect.left,
          (a.y + b.y) / 2 - rect.top,
        );
      }
      pinch.current = { distance };
      return;
    }
    if (pan.current) {
      const scale = viewRef.current.zoom;
      setOffset({
        x: clamp(pan.current.offset.x + (event.clientX - pan.current.x), rect.width - rect.width * scale, 0),
        y: clamp(pan.current.offset.y + (event.clientY - pan.current.y), rect.height - rect.height * scale, 0),
      });
    }
  }

  function endPointer(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) pan.current = null;
  }

  return (
    <div data-story-board className={cn("relative mx-auto w-full max-w-[min(100%,calc(100dvh-16rem))]", compact && "story-board-square")}>
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className="relative overflow-hidden rounded-xl bg-board p-1.5 shadow-panel sm:p-2.5"
        style={{ touchAction: "none" }}
      >
        <div
          className="relative origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: pan.current || pinch.current ? "none" : "transform 120ms ease-out",
          }}
        >
          <div
            className="relative grid gap-[3px] overflow-hidden rounded-[4px] bg-story-grid-line p-[3px] sm:rounded-md"
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              containerType: "inline-size",
            }}
          >
            {board.map((cell, index) => {
              const placed = pendingMap.get(index);
              const committedTile = cell ? tileById.get(cell.tileId) : null;
              const pendingTile = placed ? tileById.get(placed.tileId) : null;
              const enhancement = committedTile?.enhancement ?? pendingTile?.enhancement ?? null;
              const letter = cell?.letter ?? placed?.letter ?? null;
              const blank = cell?.blank ?? placed?.blank ?? false;
              const premium = premiums[index] ?? null;
              const premiumUsed = usedSet.has(index);
              const isActive = activeIndex === index;
              const inActiveWord = activeWordSet.has(index);

              return (
                <button
                  key={index}
                  type="button"
                  data-cell-index={index}
                  data-draggable-tile={placed ? "true" : undefined}
                  disabled={disabled}
                  onClick={() => onCellClick(index)}
                  onPointerDown={(event) => {
                    if (placed) onTilePointerDown?.(index, event);
                  }}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-[4px] bg-board-cell font-bold leading-none transition-all duration-150 sm:rounded-md",
                    premium && index !== center && !letter && !premiumUsed && PREMIUM_CLASS[premium],
                    premium && !letter && premiumUsed && "bg-board-cell opacity-80",
                    letter
                      ? enhancement
                        ? `${ENH_CLASS[enhancement]} tile-gloss`
                        : "tile-face tile-gloss"
                      : null,
                    placed && "z-10 shadow-md",
                    isActive && "z-10 brightness-110 anim-tile-bump",
                    !isActive && inActiveWord && "brightness-110",
                    !letter && hoverIndex === index && "ring-[1.5px] ring-primary/70",
                    !letter && "hover:brightness-95",
                    draggingIndex === index && "opacity-30",
                    index === center && !letter && "overflow-hidden bg-transparent",
                  )}
                  style={isActive ? { boxShadow: `0 0 0 ${highlightWidth} var(--color-base-ink)` } : undefined}
                  aria-label={
                    letter
                      ? `${letter} on square ${index + 1}`
                      : premium
                        ? `${premium} square`
                        : `empty square ${index + 1}`
                  }
                >
                  {letter ? (
                    <>
                      <span className="pointer-events-none leading-none" style={{ fontSize: letterFont }}>
                        {letter}
                      </span>
                      <span
                        className="pointer-events-none absolute bottom-[2px] left-[3px] font-semibold leading-none text-base-ink"
                        style={{ fontSize: cornerFont }}
                      >
                        {blank ? 0 : (LETTER_VALUES[letter] ?? 0) + (letterUpgrades[letter] ?? 0)}
                      </span>
                      {enhancement ? (
                        <span
                          className="pointer-events-none absolute bottom-[2px] right-[3px] font-bold leading-none text-mult-ink"
                          style={{ fontSize: cornerFont }}
                        >
                          {enhancement}
                        </span>
                      ) : null}
                    </>
                  ) : index === center ? (
                    <img
                      src="/icon-board.png"
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.12] rounded-[inherit] object-cover select-none"
                    />
                  ) : premium && !premiumUsed ? (
                    <span className="px-0.5 text-center uppercase tracking-tight" style={{ fontSize: labelFont }}>
                      {premium}
                    </span>
                  ) : null}
                </button>
              );
            })}
            <div className="pointer-events-none absolute inset-[3px] z-20 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}>
              {[...wordHighlights, ...(activeWord?.length && activeIndex == null ? [{ indices: activeWord, valid: true, scoring: true }] : [])].map((word, i) => {
                const rows = word.indices.map(index => Math.floor(index / size));
                const cols = word.indices.map(index => index % size);
                if (!rows.length) return null;
                const glowColor = "scoring" in word ? "var(--color-mult-ink)" : word.valid ? "var(--color-story-valid)" : "var(--color-destructive)";
                return <div key={i} data-word-valid={word.valid} className={cn("border-solid", "scoring" in word ? "border-mult-ink" : word.valid ? "border-story-valid" : "border-destructive")} style={{ gridRow: `${Math.min(...rows) + 1} / ${Math.max(...rows) + 2}`, gridColumn: `${Math.min(...cols) + 1} / ${Math.max(...cols) + 2}`, borderWidth: outlineWidth, borderRadius: outlineRadius, boxShadow: `0 0 ${outlineGlow} color-mix(in srgb, ${glowColor}, transparent 30%)` }} />;
              })}
            </div>
          </div>
        </div>
      </div>

      {zoom > 1 ? (
        <Button
          type="button"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="absolute right-3 top-3 z-30 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold shadow-panel"
        >
          Reset zoom
        </Button>
      ) : null}
    </div>
  );
}
