import type { CSSProperties } from "react";
import type { Offer, StoryState } from "@/lib/story/types";
import { OfferVisual } from "./Bookstore";

export interface ItemPurchaseFlightData {
  id: number;
  offer: Offer;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/**
 * A purchased Bookstore item (anything that isn't a Pen) flying from the detail
 * dialog into the decorative Sibble rack at the bottom of the screen.
 */
export function ItemPurchaseFlight({
  flight,
  state,
  onArrive,
}: {
  flight: ItemPurchaseFlightData | null;
  state: StoryState | null;
  onArrive: () => void;
}) {
  if (!flight || !state) return null;
  return <span
    key={flight.id}
    aria-hidden="true"
    data-item-purchase-flight
    className="story-item-purchase-flight"
    style={{
      left: flight.x,
      top: flight.y,
      "--flight-x": `${flight.dx}px`,
      "--flight-y": `${flight.dy}px`,
    } as CSSProperties}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget) onArrive();
    }}
  >
    <OfferVisual offer={flight.offer} state={state} />
  </span>;
}
