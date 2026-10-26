import { Droplet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { scaled } from "@/lib/story/speed";
import { STORY_TOTAL_COUNT_MS } from "@/lib/story/animation";

// Count-up waits for the impact flash so it begins only after the hit.
const IMPACT_MS = 80;

/** Physical hit on a score box: fast grow + jolt, slow settle, white flash fading out. */
export function impactBox(box: Element) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const color = getComputedStyle(box).backgroundColor;
  box.animate([
    { transform: "translate(0,0) scale(1)" },
    { transform: "translate(-4px,1px) scale(1.16)", offset: 0.08 },
    { transform: "translate(3px,-1px) scale(1.14)", offset: 0.16 },
    { transform: "translate(-2px,0) scale(1.11)", offset: 0.26 },
    { transform: "translate(0,0) scale(1)" },
  ], { duration: scaled(380), easing: "cubic-bezier(.2,.7,.3,1)" });
  box.animate([{ backgroundColor: `color-mix(in srgb, ${color}, white 50%)`, boxShadow: `0 0 28px ${color}` }, { backgroundColor: color, boxShadow: `0 0 0 ${color}` }], { duration: scaled(IMPACT_MS + 10), easing: "ease-out" });
}

export function CountNumber({ value, running, growToTotal = false }: { value: number; running: boolean; growToTotal?: boolean }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  const number = useRef<HTMLElement>(null);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (!running || value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    let frame = 0;
    const duration = scaled(growToTotal ? STORY_TOTAL_COUNT_MS : 260);
    const start = performance.now() + (growToTotal ? 0 : scaled(IMPACT_MS));
    const growth = growToTotal ? number.current?.animate([
      { transform: "scale(0.72)" },
      { transform: "scale(1)" },
    ], { duration, easing: "linear" }) : undefined;
    const step = (time: number) => {
      if (time < start) { frame = requestAnimationFrame(step); return; }
      const progress = Math.min(1, (time - start) / duration);
      const interpolated = from + (value - from) * (growToTotal ? progress : 1 - (1 - progress) ** 3);
      setShown((Number.isInteger(value) ? Math.round(interpolated) : Math.round(interpolated * 10) / 10) || 0);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); growth?.cancel(); };
  }, [value, running, growToTotal]);
  return <strong ref={number} className="inline-block">{shown.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>;
}

export function ScoreBoxes({ base = 0, mult = 0, running = false, baseDelta, multDelta, baseHidden, multHidden, popKey = 0, growToTotal = false }: {
  base?: number; mult?: number; running?: boolean; baseDelta?: string | null; multDelta?: string | null;
  baseHidden?: boolean | undefined; multHidden?: boolean | undefined; popKey?: number | undefined;
  growToTotal?: boolean;
}) {
  const pop = popKey ? "story-zero-pop" : undefined;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!running || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const [kind, delta] of [["base", baseDelta], ["mult", multDelta]]) {
      if (!delta) continue;
      const box = root.current?.querySelector(`[data-score-box="${kind}"]`);
      if (!box) continue;
      impactBox(box);
    }
  }, [base, mult, baseDelta, multDelta, running]);
  return <div ref={root} className="story-score-boxes tabular-nums" aria-label={`Base ${base} times Mult ${mult}`}>
    <div data-score-box="base" className="story-number-box tile-gloss bg-base-ink">
      {!baseHidden && <span key={popKey} className={pop}><CountNumber value={base} running={running} growToTotal={growToTotal} /></span>}
      {baseDelta && <span className="story-number-delta">{baseDelta}</span>}
    </div>
    <span className="story-score-times" aria-hidden="true">×</span>
    <div data-score-box="mult" className="story-number-box tile-gloss bg-mult-ink">
      {!multHidden && <span key={popKey} className={pop}><CountNumber value={mult} running={running} growToTotal={growToTotal} /></span>}
      {multDelta && <span className="story-number-delta">{multDelta}</span>}
    </div>
  </div>;
}

export function RoundScore({ target, current, running = false }: { target: number; current: number; running?: boolean }) {
  return <div className="story-round-score tabular-nums">
    <div className="story-target-score tile-gloss">
      <span className="text-xs">Score to beat</span>
      <span className="flex items-center justify-center gap-1.5 text-3xl font-bold">{target.toLocaleString()}<Droplet className="h-5 w-5" aria-label="Ink" /></span>
    </div>
    <span className="story-score-times" aria-hidden="true">/</span>
    <div className="story-current-score tile-gloss">
      <span className="text-xs">Page score</span>
      <span className="flex items-center justify-center gap-1.5 text-3xl font-bold"><CountNumber value={current} running={running} /><Droplet className="h-5 w-5" aria-label="Ink" /></span>
    </div>
  </div>;
}