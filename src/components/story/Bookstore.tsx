import { ArrowRight, CheckCircle2, Coins, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { LETTER_VALUES } from "@/lib/scrabble";
import type { Offer, StoryState } from "@/lib/story/types";
import { penDef } from "@/lib/story/pens";
import { priceFor, upgradeDef } from "@/lib/story/upgrades";
import { PAGES, TWIST_INFO, pageLabel } from "@/lib/story/boards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { penIcon } from "./PenSidebar";
import { ScoreBoxes } from "./ScoreDisplay";
import { ShopDetailTile } from "./ShopDetailTile";

const PEN_SHORT: Record<string, string> = {
  minimalist: "3-letter words: +5 Base per letter.",
  "vowel-power": "Vowels give double Base.",
  crossword: "+2 Mult per extra word formed.",
  "growing-vocabulary": "5-letter words: +1 Mult, forever.",
  catnip: "3-letter words: +10 Mult.",
  "echo-chamber": "Reused letters retrigger.",
};
const UPGRADE_SHORT: Record<string, string> = {
  "bigger-rack": "+1 rack tile.",
  "extra-chance": "+1 discard per Page.",
  "deep-pockets": "+1 word per Page.",
  "bargain-hunter": "20% off the Bookstore.",
  "extra-shelf": "+1 Pen slot.",
  "flexible-fingers": "Discard up to 4 tiles.",
  "golden-payday": "+2 Coins per Page.",
};
const ENH_SHORT = { DL: "×2 letter Base.", TL: "×3 letter Base.", DW: "×2 Word Mult.", TW: "×3 Word Mult." };
const ENH_FULL = {
  DL: "Double one tile's Base Ink, every time it scores.",
  TL: "Triple one tile's Base Ink, every time it scores.",
  DW: "One tile doubles the Mult of every word it joins.",
  TW: "One tile triples the Mult of every word it joins.",
};

function glowVar(offer: Offer): string {
  if (offer.kind === "letter") return "var(--color-shop-letter)";
  if (offer.kind === "word-length") return "var(--color-shop-length)";
  if (offer.kind === "pen") return "var(--color-shop-pen)";
  if (offer.kind === "upgrade") return "var(--color-shop-upgrade)";
  return `var(--color-shop-${offer.enhancement.toLowerCase()})`;
}

function category(offer: Offer): { label: string; border: string; text: string } {
  switch (offer.kind) {
    case "letter":
      return { label: "Letter", border: "border-shop-letter/70", text: "text-shop-letter" };
    case "word-length":
      return { label: "Word", border: "border-shop-length/70", text: "text-shop-length" };
    case "enhancement": {
      const map = {
        DL: ["border-shop-dl/70", "text-shop-dl"],
        TL: ["border-shop-tl/80", "text-shop-tl"],
        DW: ["border-shop-dw/70", "text-shop-dw"],
        TW: ["border-shop-tw/80", "text-shop-tw"],
      } as const;
      const [border, text] = map[offer.enhancement];
      return { label: "Enhance", border, text };
    }
    case "pen":
      return { label: "Pen", border: "border-shop-pen/70", text: "text-shop-pen" };
    case "upgrade":
      return { label: "Permanent", border: "border-shop-upgrade/70", text: "text-shop-upgrade" };
  }
}

function offerTitle(offer: Offer): string {
  switch (offer.kind) {
    case "letter":
      return `Upgrade ${offer.letter}`;
    case "word-length":
      return `${offer.length}-letter words`;
    case "enhancement":
      return `${offer.enhancement} Enhancement`;
    case "pen":
      return penDef(offer.penId).name;
    case "upgrade":
      return upgradeDef(offer.upgradeId).name;
  }
}

function letterBase(offer: Extract<Offer, { kind: "letter" }>, state: StoryState) {
  return (LETTER_VALUES[offer.letter] ?? 0) + (state.letterUpgrades[offer.letter] ?? 0);
}
function lengthMult(offer: Extract<Offer, { kind: "word-length" }>, state: StoryState) {
  return offer.length + (state.wordLengthUpgrades[offer.length] ?? 0);
}

function shortText(offer: Offer, state: StoryState): string {
  switch (offer.kind) {
    case "letter": {
      const b = letterBase(offer, state);
      return `Base ${b} → ${b + 1}.`;
    }
    case "word-length": {
      const m = lengthMult(offer, state);
      return `Mult ×${m} → ×${m + 1}.`;
    }
    case "enhancement":
      return ENH_SHORT[offer.enhancement];
    case "pen":
      return PEN_SHORT[offer.penId] ?? penDef(offer.penId).description;
    case "upgrade":
      return UPGRADE_SHORT[offer.upgradeId] ?? upgradeDef(offer.upgradeId).description;
  }
}

function fullText(offer: Offer, state: StoryState): string {
  switch (offer.kind) {
    case "letter": {
      const b = letterBase(offer, state);
      return `Every ${offer.letter} tile permanently scores +1 Base Ink (${b} → ${b + 1}) for the rest of this Story.`;
    }
    case "word-length": {
      const m = lengthMult(offer, state);
      return `Words of exactly ${offer.length} letters start with +1 Mult (×${m} → ×${m + 1}) for the rest of this Story.`;
    }
    case "enhancement":
      return `${ENH_FULL[offer.enhancement]} You'll choose which tile after buying.`;
    case "pen":
      return penDef(offer.penId).description;
    case "upgrade":
      return upgradeDef(offer.upgradeId).description;
  }
}

function OfferVisual({ offer, state, large, small }: { offer: Offer; state: StoryState; large?: boolean; small?: boolean }) {
  const box = large ? "h-16 w-16" : small ? "h-9 w-9" : "h-11 w-11";
  switch (offer.kind) {
    case "letter":
      return (
        <span className={cn("tile-face relative flex items-center justify-center rounded-md font-bold", box, large ? "text-3xl" : "text-xl")}>
          {offer.letter}
          <span className="absolute bottom-0.5 right-1 text-[0.6rem] font-bold">{letterBase(offer, state) + 1}</span>
        </span>
      );
    case "word-length":
      return (
        <span className={cn("flex flex-col items-center justify-center rounded-md border border-shop-length/50 bg-shop-length/10 font-bold text-mult-ink", box)}>
          <span className={large ? "text-2xl leading-none" : "text-lg leading-none"}>{offer.length}</span>
          <span className="text-[0.6rem] leading-none">×{lengthMult(offer, state) + 1}</span>
        </span>
      );
    case "enhancement": {
      const enhText = {
        DL: "text-shop-dl",
        TL: "text-shop-tl",
        DW: "text-shop-dw",
        TW: "text-shop-tw",
      } as const;
      return (
        <span className={cn("shop-enh-tile relative tile-gloss flex items-center justify-center rounded-md border font-bold", box, large ? "text-lg" : "text-sm", enhText[offer.enhancement])}>
          {offer.enhancement}
        </span>
      );
    }

    case "pen": {
      const Icon = penIcon(offer.penId);
      return (
        <span className={cn("flex items-center justify-center rounded-full border border-shop-pen/50 bg-shop-pen/15", box)}>
          <Icon className={cn("text-shop-pen", large ? "h-8 w-8" : small ? "h-5 w-5" : "h-6 w-6")} />
        </span>
      );
    }
    case "upgrade":
      return (
        <span className={cn("flex items-center justify-center rounded-md border border-shop-upgrade/50 bg-shop-upgrade/15 rotate-45", large ? "h-12 w-12" : small ? "h-7 w-7" : "h-9 w-9")}>
          <Star className={cn("-rotate-45 text-shop-upgrade", large ? "h-6 w-6" : small ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </span>
      );
  }
}

interface BookstoreProps {
  state: StoryState;
  onBuy: (offerIndex: number) => void;
  compact?: boolean;
}

export function Bookstore({ state, onBuy, compact }: BookstoreProps) {
  const [inspect, setInspect] = useState<number | null>(null);
  const offers = state.offers ?? [];
  const inspected = inspect !== null ? offers[inspect] : undefined;
  const inspectedPrice = inspected ? priceFor(state.upgrades, inspected.price) : 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", compact && "story-shop")}>
      {!compact && <header className="mb-4">
        <h2 className="text-xl font-bold">The Bookstore</h2>
        <p className="text-xs text-muted-foreground">Tools for writing your next Page. Tap an item for details.</p>
      </header>}

      <div aria-label="Bookstore offers" className={cn("grid content-start overflow-y-auto", compact ? "story-shop-offers grid-cols-2 gap-3" : "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4")}>
        {offers.map((offer, index) => {
          if (offer.sold) return null;
          const price = priceFor(state.upgrades, offer.price);
          const affordable = state.coins >= price;
          const cat = category(offer);
          return (
            <Button
              key={index}
              type="button"
              variant="ghost"
              onClick={() => setInspect(index)}
              style={{ ["--glow" as string]: glowVar(offer) }}
              className={cn(
                "shop-card mb-1 flex h-auto flex-col items-center justify-between whitespace-normal rounded-lg border-2 text-center hover:bg-transparent hover:text-foreground",
                compact ? "gap-0.5 p-1.5" : "aspect-square gap-1 p-2",
                !affordable && "opacity-70",
              )}
            >
              <span className={cn("self-start text-[0.55rem] font-bold uppercase tracking-widest", cat.text)}>{cat.label}</span>
              <OfferVisual offer={offer} state={state} small={!!compact} />
              <span className={cn("font-bold leading-tight", compact ? "line-clamp-2 text-xs" : "text-sm")}>{offerTitle(offer)}</span>
              <span className={cn("leading-tight text-muted-foreground", compact ? "line-clamp-1 text-[0.65rem]" : "line-clamp-2 text-[0.7rem]")}>{shortText(offer, state)}</span>
              <span className={cn("flex items-center gap-1 self-end rounded-full bg-gold/15 px-2 py-0.5 font-bold text-gold", compact ? "text-xs" : "text-sm", !affordable && "text-gold/60")}>
                <Coins className="h-3.5 w-3.5" /> {price}
              </span>
            </Button>
          );
        })}
      </div>

      <Dialog open={!!inspected} onOpenChange={(open) => !open && setInspect(null)}>
        <DialogContent className="max-h-[90dvh] max-w-xs overflow-y-auto border-0 bg-transparent p-0 shadow-none">
          {inspected ? (
            <ShopDetailTile glow={glowVar(inspected)}>
              <span className={cn("self-start text-xs font-bold uppercase tracking-widest", category(inspected).text)}>
                {category(inspected).label}
              </span>
              <OfferVisual offer={inspected} state={state} large />
              <DialogTitle className="text-xl font-bold leading-tight">{offerTitle(inspected)}</DialogTitle>
              <DialogDescription className="text-sm leading-snug">{fullText(inspected, state)}</DialogDescription>
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  disabled={state.coins < inspectedPrice}
                  className="relative tile-gloss h-10 px-6 text-base font-bold bg-gold-button text-background hover:bg-gold-button/90"
                  onClick={() => {
                    const i = inspect;
                    if (i === null) return;
                    setInspect(null);
                    onBuy(i);
                  }}
                >
                  {state.coins < inspectedPrice ? "Not enough Coins" : "Buy"}
                </Button>
                <span className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-lg font-bold text-gold">
                  <Coins className="h-4 w-4" /> {inspectedPrice}
                </span>
              </div>
            </ShopDetailTile>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Left-sidebar Page Complete summary shown while shopping. */
export function BookstoreSummary({ state, onContinue }: { state: StoryState; onContinue: () => void }) {
  const done = PAGES[state.pageIndex];
  if (!done) return null;
  const next = PAGES[state.pageIndex + 1];
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div>
        <p className="text-xs text-muted-foreground">{pageLabel(done)}</p>
        <p className="flex items-center gap-1.5 text-lg font-bold text-primary">
          <CheckCircle2 className="h-5 w-5" /> Page Complete!
        </p>
      </div>
      <div className="rounded-lg bg-secondary/70 p-3 text-center">
        <p className="text-xs text-muted-foreground">Ink earned</p>
        <p className="text-xl font-bold">
          {state.page.ink.toLocaleString()} <span className="text-sm text-muted-foreground">/ {done.inkTarget.toLocaleString()}</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Reward</p>
        <p className="flex items-center justify-center gap-1 text-lg font-bold text-gold">
          +{done.coins + (state.upgrades.includes("golden-payday") ? 2 : 0)} <Coins className="h-4 w-4" />
        </p>
      </div>
      <ScoreBoxes />
      {next ? (
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">Up next</p>
          <p className="text-sm font-bold">{pageLabel(next)}</p>
          {next.plotTwist ? (
            <p className="flex items-center gap-1 text-xs font-bold text-accent">
              <Sparkles className="h-3 w-3" /> {TWIST_INFO[next.plotTwist].name}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {next.size}×{next.size} board · {next.inkTarget.toLocaleString()} Ink required
          </p>
        </div>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-3xl font-black tabular-nums text-gold">
          <Coins className="h-7 w-7" /> {state.coins}
        </span>
        <Button size="lg" className="relative tile-gloss" onClick={onContinue}>
          Next Page <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
