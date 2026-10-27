import { soundPop } from "@/lib/story/sound";
import { wordLengthMult } from "@/lib/story/scoring";
import { ArrowRight, CheckCircle2, Coins, Menu, Sparkles, Star } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
import { PenCurrentBonus, PenDescription } from "./PenDescription";
import { HoverPreview, canHover } from "./HoverPreview";

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
  DL: "Doubles the Base Ink of every tile of one letter, every time it scores.",
  TL: "Triples the Base Ink of every tile of one letter, every time it scores.",
  DW: "Every tile of one letter doubles the Mult of every word it joins.",
  TW: "Every tile of one letter triples the Mult of every word it joins.",
};

function glowVar(offer: Offer): string {
  if (offer.kind === "letter") return "var(--color-shop-letter)";
  if (offer.kind === "word-length") return "var(--color-shop-length)";
  if (offer.kind === "pen") return "var(--color-shop-pen)";
  if (offer.kind === "upgrade") return "var(--color-shop-upgrade)";
  return "var(--color-shop-enhancement)";
}

function category(offer: Offer): { label: string; border: string; text: string } {
  switch (offer.kind) {
    case "letter":
      return { label: "Letter", border: "border-shop-letter/70", text: "text-shop-letter" };
    case "word-length":
      return { label: "Word", border: "border-shop-length/70", text: "text-shop-length" };
    case "enhancement":
      return { label: "Enhance", border: "border-shop-enhancement/70", text: "text-shop-enhancement" };
    case "pen":
      return { label: "Pen", border: "border-shop-pen/70", text: "text-shop-pen" };
    case "upgrade":
      return { label: "Permanent", border: "border-shop-upgrade/70", text: "text-shop-upgrade" };
  }
}

function offerTitle(offer: Offer): ReactNode {
  switch (offer.kind) {
    case "letter":
      return <>Upgrade {offer.letter} <span className="text-base-ink">+ 1</span></>;
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
  return wordLengthMult(offer.length, state.wordLengthUpgrades);
}

function shortText(offer: Offer, state: StoryState): ReactNode {
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
      return <PenDescription penId={offer.penId} />;
    case "upgrade":
      return UPGRADE_SHORT[offer.upgradeId] ?? upgradeDef(offer.upgradeId).description;
  }
}

function fullText(offer: Offer, state: StoryState): ReactNode {
  switch (offer.kind) {
    case "letter":
      return <>Every {offer.letter} tile permanently scores <span className="text-base-ink">+1</span> Base Ink.</>;
    case "word-length": {
      const m = lengthMult(offer, state);
      return `Words of exactly ${offer.length} letters start with +1 Mult (×${m} → ×${m + 1}) for the rest of this Story.`;
    }
    case "enhancement":
      return `${ENH_FULL[offer.enhancement]} You'll choose which letter it lands on.`;
    case "pen":
      return <PenDescription penId={offer.penId} />;
    case "upgrade":
      return upgradeDef(offer.upgradeId).description;
  }
}

export function OfferVisual({ offer, state, large, small }: { offer: Offer; state: StoryState; large?: boolean; small?: boolean }) {
  const box = large ? "h-16 w-16" : small ? "h-9 w-9" : "h-11 w-11";
  switch (offer.kind) {
    case "letter":
      return (
        <span className={cn("tile-face relative flex items-center justify-center rounded-md font-bold", box, large ? "text-3xl" : "text-xl")}>
          {offer.letter}
          <span className="absolute bottom-0.5 right-1 text-[0.6rem] font-bold text-base-ink">
            {large ? `${letterBase(offer, state)}→${letterBase(offer, state) + 1}` : letterBase(offer, state)}
          </span>
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
        DL: "border-shop-dl/50 bg-shop-dl/15 text-shop-dl",
        TL: "border-shop-tl/50 bg-shop-tl/15 text-shop-tl",
        DW: "border-shop-dw/50 bg-shop-dw/15 text-shop-dw",
        TW: "border-shop-tw/50 bg-shop-tw/15 text-shop-tw",
      } as const;
      return (
        <span className={cn("relative flex items-center justify-center rounded-md border font-bold", box, large ? "text-lg" : "text-sm", enhText[offer.enhancement])}>
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
  onBuy: (offerIndex: number, source?: DOMRect) => void;
  compact?: boolean;
  /** Items pop into place one by one when the Bookstore first opens. */
  entering?: boolean;
}

export function Bookstore({ state, onBuy, compact, entering = false }: BookstoreProps) {
  const [inspect, setInspect] = useState<number | null>(null);
  const [hover, setHover] = useState<{ index: number; rect: DOMRect; side: "left" | "right" } | null>(null);
  const offers = state.offers ?? [];
  const [popAll] = useState(entering);
  useEffect(() => {
    if (!popAll || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const count = offers.filter((offer) => !offer.sold).length;
    const timers = Array.from({ length: count }, (_, i) => window.setTimeout(() => soundPop(i), 420 + i * 110));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popAll]);
  let popIndex = 0;
  const inspected = inspect !== null ? offers[inspect] : undefined;
  const hovered = hover && !offers[hover.index]?.sold ? offers[hover.index] : undefined;
  const inspectedPrice = inspected ? priceFor(state.upgrades, inspected.price) : 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", compact && "story-shop")}>
      {!compact && <header className="mb-4">
        <h2 className="text-xl font-bold">The Bookstore</h2>
        <p className="text-xs text-muted-foreground">Tools for writing your next Page. Tap an item for details.</p>
      </header>}

      <div aria-label="Bookstore offers" className={cn("grid content-start overflow-y-auto", compact ? "story-shop-offers grid-cols-2 gap-3" : "story-shop-grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4")}>
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
              onClick={() => { setHover(null); setInspect(index); }}
              onPointerEnter={(event) => {
                if (compact || !canHover()) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const grid = event.currentTarget.parentElement?.getBoundingClientRect();
                const last = grid ? rect.right > grid.right - rect.width / 2 : false;
                setHover({ index, rect, side: last ? "left" : "right" });
              }}
              onPointerLeave={() => setHover(null)}
              style={{ ["--glow" as string]: glowVar(offer), ...(entering ? { animationDelay: `${420 + popIndex++ * 110}ms` } : {}) }}
              className={cn(
                "shop-card mb-1 flex h-auto flex-col items-center justify-between whitespace-normal rounded-lg border-2 text-center hover:bg-transparent hover:text-foreground",
                compact ? "gap-0.5 p-1.5" : "aspect-square gap-1 p-2",
                !affordable && "opacity-70",
                entering && "story-offer-pop",
              )}
            >
              <span className={cn("self-start text-[0.55rem] font-bold uppercase tracking-widest", cat.text)}>{cat.label}</span>
              <OfferVisual offer={offer} state={state} small={!!compact} />
              <span className={cn("font-bold leading-tight", compact ? "line-clamp-2 text-xs" : "text-sm")}>{offerTitle(offer)}</span>
              {offer.kind !== "pen" && <span className={cn("leading-tight text-muted-foreground", compact ? "line-clamp-1 text-[0.65rem]" : "line-clamp-2 text-[0.7rem]")}>{shortText(offer, state)}</span>}
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
              <OfferDetailBody offer={inspected} state={state} dialog />
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  disabled={state.coins < inspectedPrice}
                  className="relative tile-gloss h-10 px-6 text-base font-bold bg-gold-button text-background hover:bg-gold-button/90"
                  onClick={(event) => {
                    const i = inspect;
                    if (i === null) return;
                    const source = event.currentTarget.closest('[role="dialog"]')?.getBoundingClientRect();
                    setInspect(null);
                    onBuy(i, source);
                  }}
                >
                  {state.coins < inspectedPrice ? "Not enough Coins" : inspected.kind === "enhancement" ? "Pick Letter" : "Buy"}
                </Button>
                <span className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-lg font-bold text-gold">
                  <Coins className="h-4 w-4" /> {inspectedPrice}
                </span>
              </div>
            </ShopDetailTile>
          ) : null}
        </DialogContent>
      </Dialog>
      {hovered && hover && !inspected && (
        <HoverPreview anchor={hover.rect} side={hover.side}>
          <ShopDetailTile glow={glowVar(hovered)}>
            <OfferDetailBody offer={hovered} state={state} />
            <span className="flex items-center gap-1 self-end rounded-full bg-gold/15 px-3 py-1 text-lg font-bold text-gold">
              <Coins className="h-4 w-4" /> {priceFor(state.upgrades, hovered.price)}
            </span>
          </ShopDetailTile>
        </HoverPreview>
      )}
    </div>
  );
}

/** Shared detail content for the click inspector and the hover preview. */
function OfferDetailBody({ offer, state, dialog }: { offer: Offer; state: StoryState; dialog?: boolean }) {
  const Title = dialog ? DialogTitle : "h3";
  const Desc = dialog ? DialogDescription : "p";
  return <>
    <span className={cn("self-start text-xs font-bold uppercase tracking-widest", category(offer).text)}>{category(offer).label}</span>
    <OfferVisual offer={offer} state={state} large />
    <Title className="text-xl font-bold leading-tight">{offerTitle(offer)}</Title>
    <Desc className="text-sm leading-snug">{fullText(offer, state)}</Desc>
    {offer.kind === "pen" && <PenCurrentBonus pen={state.pens.find((pen) => pen.penId === offer.penId) ?? { penId: offer.penId, bonus: 0 }} />}
  </>;
}

/** Left-sidebar Page Complete summary shown while shopping. */
export function BookstoreSummary({ state, onContinue, onOpenBag }: { state: StoryState; onContinue: () => void; onOpenBag: () => void }) {
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
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-3xl font-black tabular-nums text-gold">
          <Coins className="h-7 w-7" /> {state.coins}
        </span>
        <div className="flex items-center gap-2">
          <Button size="lg" className="relative tile-gloss" onClick={onContinue}>
            Continue Story <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Bag and completed pages" onClick={onOpenBag}><Menu className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
