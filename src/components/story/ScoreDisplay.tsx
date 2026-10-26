import { Droplet } from "lucide-react";
import { cn } from "@/lib/utils";
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
      setShown(Math.round((from + (value - from) * (1 - (1 - progress) ** 3)) * 10) / 10);
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
  return <div className="story-score-boxes tabular-nums" aria-label={`Base ${base} times Mult ${mult}`}>
    <div key={`base-${base}-${baseDelta}`} data-score-box="base" className={cn("story-number-box bg-base-ink", running && baseDelta && "story-box-arrival story-box-base")}>
      <CountNumber value={base} running={running} />
      {baseDelta && <span className="story-number-delta">{baseDelta}</span>}
    </div>
    <span className="story-score-times" aria-hidden="true">×</span>
    <div key={`mult-${mult}-${multDelta}`} data-score-box="mult" className={cn("story-number-box bg-mult-ink", running && multDelta && "story-box-arrival story-box-mult")}>
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