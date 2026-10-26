import type { CSSProperties } from "react";
import { STORY_CONFETTI_MS } from "@/lib/story/animation";

export interface ScoreConfettiData { id: number; x: number; y: number }

const COLORS = ["var(--gold)", "var(--naughty)", "var(--story-current-bg)", "var(--base-ink)", "var(--mult-ink)"];

/** 0.8s confetti burst centred on a point (the Round score box). Presentation only. */
export function ScoreConfetti({ burst }: { burst: ScoreConfettiData | null }) {
  if (!burst) return null;
  return <div key={burst.id} aria-hidden="true" className="pointer-events-none fixed z-[100]" style={{ left: burst.x, top: burst.y }}>
    {Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.2;
      const dist = 60 + ((i * 37) % 70);
      return <span key={i} className="story-confetti-piece" style={{
        animationDuration: `${STORY_CONFETTI_MS}ms`,
        background: COLORS[i % COLORS.length],
        "--cx": `${Math.cos(angle) * dist}px`, "--cy": `${Math.sin(angle) * dist - 30}px`, "--cr": `${(i * 47) % 540}deg`,
      } as CSSProperties} />;
    })}
  </div>;
}
