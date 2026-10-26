import { ArrowRight, Coins } from "lucide-react";
import { LETTER_VALUES } from "@/lib/scrabble";
import type { Offer, StoryState } from "@/lib/story/types";
import { penDef } from "@/lib/story/pens";
import { priceFor, upgradeDef } from "@/lib/story/upgrades";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { penIcon } from "./PenSidebar";

interface BookstoreProps {
  state: StoryState;
  onBuy: (offerIndex: number) => void;
  onContinue: () => void;
}

function offerTitle(offer: Offer): string {
  switch (offer.kind) {
    case "letter":
      return `Upgrade ${offer.letter}`;
    case "word-length":
      return `${offer.length}-letter words`;
    case "enhancement":
      return `${offer.enhancement} enhancement`;
    case "pen":
      return penDef(offer.penId).name;
    case "upgrade":
      return upgradeDef(offer.upgradeId).name;
  }
}

function offerBody(offer: Offer, state: StoryState) {
  switch (offer.kind) {
    case "letter": {
      const current = (LETTER_VALUES[offer.letter] ?? 0) + (state.letterUpgrades[offer.letter] ?? 0);
      return (
        <>
          <span className="tile-face tile-gloss flex h-12 w-12 items-center justify-center rounded-md text-2xl font-bold">
            {offer.letter}
          </span>
          <span className="text-xs text-muted-foreground">
            Base {current} → <span className="font-bold text-base-ink">{current + 1}</span>
          </span>
        </>
      );
    }
    case "word-length": {
      const current = offer.length + (state.wordLengthUpgrades[offer.length] ?? 0);
      return (
        <>
          <span className="text-2xl font-bold text-mult-ink">×{current + 1}</span>
          <span className="text-xs text-muted-foreground">
            Mult ×{current} → <span className="font-bold text-mult-ink">×{current + 1}</span>
          </span>
        </>
      );
    }
    case "enhancement":
      return (
        <>
          <span
            className={cn(
              "tile-gloss flex h-12 w-12 items-center justify-center rounded-md text-sm font-bold",
              `tile-enh-${offer.enhancement.toLowerCase()}`,
            )}
          >
            {offer.enhancement}
          </span>
          <span className="text-center text-xs text-muted-foreground">
            {offer.enhancement === "DL" && "Double one tile's Base Ink, every time it scores."}
            {offer.enhancement === "TL" && "Triple one tile's Base Ink, every time it scores."}
            {offer.enhancement === "DW" && "One tile doubles the Mult of every word it joins."}
            {offer.enhancement === "TW" && "One tile triples the Mult of every word it joins."}
          </span>
        </>
      );
    case "pen": {
      const def = penDef(offer.penId);
      const Icon = penIcon(offer.penId);
      return (
        <>
          <Icon className="h-8 w-8 text-primary" />
          <span className="text-center text-xs text-muted-foreground">{def.description}</span>
        </>
      );
    }
    case "upgrade": {
      const def = upgradeDef(offer.upgradeId);
      return (
        <>
          <span className="rounded-md border border-primary/50 bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            Permanent
          </span>
          <span className="text-center text-xs text-muted-foreground">{def.description}</span>
        </>
      );
    }
  }
}

export function Bookstore({ state, onBuy, onContinue }: BookstoreProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">The Bookstore</h2>
          <p className="text-xs text-muted-foreground">Spend your Coins — everything lasts for the rest of this Story.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">
          <Coins className="h-4 w-4" /> {state.coins}
        </span>
      </header>

      <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
        {(state.offers ?? []).map((offer, index) => {
          const price = priceFor(state.upgrades, offer.price);
          const affordable = state.coins >= price;
          return (
            <button
              key={index}
              type="button"
              disabled={offer.sold || !affordable}
              onClick={() => onBuy(index)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 transition-all",
                offer.sold
                  ? "opacity-40"
                  : affordable
                    ? "hover:border-primary hover:shadow-panel"
                    : "opacity-60",
              )}
            >
              {offerBody(offer, state)}
              <span className="text-sm font-bold">{offerTitle(offer)}</span>
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                  offer.sold ? "bg-secondary text-muted-foreground" : "bg-primary/15 text-primary",
                )}
              >
                {offer.sold ? "Sold" : (
                  <>
                    <Coins className="h-3 w-3" /> {price}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Button size="lg" className="mt-3 w-full" onClick={onContinue}>
        Continue to Next Page <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
