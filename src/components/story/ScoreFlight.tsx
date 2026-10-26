import type { CSSProperties } from "react";

export interface ScoreFlightData {
  id: number;
  kind: "base" | "mult";
  text: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function ScoreFlight({ flight }: { flight: ScoreFlightData | null }) {
  if (!flight) return null;
  return <span key={flight.id} aria-hidden="true" data-score-flight={flight.kind}
    className={`story-score-flight ${flight.kind === "base" ? "text-base-ink" : "text-mult-ink"}`}
    style={{ left: flight.x, top: flight.y, "--flight-x": `${flight.dx}px`, "--flight-y": `${flight.dy}px` } as CSSProperties}>{flight.text}</span>;
}