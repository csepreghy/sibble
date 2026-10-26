import { Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScoreBoxes({ base = 0, mult = 0, running = false, baseDelta, multDelta }: {
  base?: number; mult?: number; running?: boolean; baseDelta?: string | null; multDelta?: string | null;
}) {
  return <div className="story-score-boxes tabular-nums" aria-label={`Base ${base} times Mult ${mult}`}>
    <div className="story-number-box bg-base-ink">
      <strong key={`base-${base}`} className={cn(running && "anim-score-pop")}>{base.toLocaleString()}</strong>
      {baseDelta && <span className="story-number-delta">{baseDelta}</span>}
    </div>
    <span className="story-score-times" aria-hidden="true">×</span>
    <div className="story-number-box bg-mult-ink">
      <strong key={`mult-${mult}`} className={cn(running && "anim-score-pop")}>{mult.toLocaleString()}</strong>
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