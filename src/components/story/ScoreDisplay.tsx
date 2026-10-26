import { Droplet } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function CountNumber({ value, running }: { value: number; running: boolean }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (!running || value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const step = (time: number) => {
      const progress = Math.min(1, (time - start) / 260);
      const interpolated = from + (value - from) * (1 - (1 - progress) ** 3);
      setShown((Number.isInteger(value) ? Math.round(interpolated) : Math.round(interpolated * 10) / 10) || 0);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, running]);
  return <strong>{shown.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>;
}

export function ScoreBoxes({ base = 0, mult = 0, running = false, baseDelta, multDelta }: {
  base?: number; mult?: number; running?: boolean; baseDelta?: string | null; multDelta?: string | null;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!running || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const [kind, delta] of [["base", baseDelta], ["mult", multDelta]]) {
      if (!delta) continue;
      const box = root.current?.querySelector(`[data-score-box="${kind}"]`);
      if (!box) continue;
      const color = getComputedStyle(box).backgroundColor;
      box.animate([{ transform: "scale(1)", boxShadow: `0 0 0 ${color}` }, { transform: "scale(1.09)", boxShadow: `0 0 24px ${color}` }, { transform: "scale(1)", boxShadow: `0 0 0 ${color}` }], { duration: 320, easing: "ease-out" });
    }
  }, [base, mult, baseDelta, multDelta, running]);
  return <div ref={root} className="story-score-boxes tabular-nums" aria-label={`Base ${base} times Mult ${mult}`}>
    <div data-score-box="base" className="story-number-box tile-gloss bg-base-ink">
      <CountNumber value={base} running={running} />
      {baseDelta && <span className="story-number-delta">{baseDelta}</span>}
    </div>
    <span className="story-score-times" aria-hidden="true">×</span>
    <div data-score-box="mult" className="story-number-box tile-gloss bg-mult-ink">
      <CountNumber value={mult} running={running} />
      {multDelta && <span className="story-number-delta">{multDelta}</span>}
    </div>
  </div>;
}

export function RoundScore({ target, current }: { target: number; current: number }) {
  return <div className="story-round-score tabular-nums">
    <div className="story-target-score tile-gloss">
      <span className="text-xs">Score at least</span>
      <span className="flex items-center justify-center gap-1.5 text-xl font-bold">{target.toLocaleString()}<Droplet className="h-4 w-4" aria-label="Ink" /></span>
    </div>
    <div className="story-current-score tile-gloss">
      <span className="text-xs">Round score</span>
      <span className="flex items-center justify-center gap-1.5 text-3xl font-bold">{current.toLocaleString()}<Droplet className="h-5 w-5" aria-label="Ink" /></span>
    </div>
  </div>;
}