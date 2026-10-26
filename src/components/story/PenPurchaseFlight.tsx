import type { CSSProperties } from "react";
import { penIcon } from "./PenSidebar";

export interface PenPurchaseFlightData {
  id: number;
  penId: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function PenPurchaseFlight({ flight, onArrive }: { flight: PenPurchaseFlightData | null; onArrive: () => void }) {
  if (!flight) return null;
  const Icon = penIcon(flight.penId);
  return <span key={flight.id} aria-hidden="true" data-pen-purchase-flight
    className="story-pen-purchase-flight border border-shop-pen bg-card text-shop-pen"
    style={{ left: flight.x, top: flight.y, "--flight-x": `${flight.dx}px`, "--flight-y": `${flight.dy}px` } as CSSProperties}
    onAnimationEnd={onArrive}><Icon className="h-7 w-7" /></span>;
}