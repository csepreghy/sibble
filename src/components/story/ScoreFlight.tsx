import type { CSSProperties } from "react";

export interface ScoreFlightData {
  id: number;
  kind: "base" | "mult";
  text: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  white?: boolean;
}

export function ScoreFlight({ flight }: { flight: ScoreFlightData | null }) {
  if (!flight) return null;
  const tone = flight.white ? "text-story-score-foreground" : flight.kind === "base" ? "text-base-ink" : "text-mult-ink";
  return <span key={flight.id} aria-hidden="true" data-score-flight={flight.kind}
    className={`story-score-flight ${tone}`}
    style={{ left: flight.x, top: flight.y, "--flight-x": `${flight.dx}px`, "--flight-y": `${flight.dy}px` } as CSSProperties}>{flight.text}</span>;
}