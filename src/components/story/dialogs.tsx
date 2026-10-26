import { Coins, Home, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { LETTER_VALUES } from "@/lib/scrabble";
import { PAGES, TWIST_INFO, pageLabel } from "@/lib/story/boards";
import { penDef } from "@/lib/story/pens";
import { upgradeDef } from "@/lib/story/upgrades";
import type { PenInstance, StoryState, StoryTile } from "@/lib/story/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { penIcon } from "./PenSidebar";
import { ShopDetailTile } from "./ShopDetailTile";

// --- Page intro ----------------------------------------------------------

const FIRST_PAGE_TIPS = [
  "Create a word through the centre star.",
  "Letters add Base Ink. Longer words increase Mult.",
  "Base × Mult = Ink. Reach the target before you run out of words.",
  "You can discard tiles to draw replacements.",
  "Spend your Coins in the Bookstore to strengthen your Story.",
];

export function PageIntroDialog({
  state,
  onStart,
}: {
  state: StoryState;
  onStart: () => void;
}) {
  const config = PAGES[state.pageIndex]!;
  const twist = config.plotTwist ? TWIST_INFO[config.plotTwist] : null;
  const tips = state.pageIndex === 0 ? FIRST_PAGE_TIPS : [];
  return (
    <Dialog open>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">{pageLabel(config)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {twist ? (
            <div className="rounded-lg border border-accent/50 bg-accent/10 p-3">
              <p className="font-bold text-accent">Plot Twist: {twist.name}</p>
              <p className="mt-1 text-muted-foreground">{twist.description}</p>
            </div>
          ) : null}
          <div className="flex gap-4">
            <div className="rounded-lg bg-secondary/70 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Ink to beat</p>
              <p className="text-lg font-bold text-base-ink">{config.inkTarget}</p>
            </div>
            <div className="rounded-lg bg-secondary/70 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Words</p>
              <p className="text-lg font-bold">{state.page.wordsLeft}</p>
            </div>
            <div className="rounded-lg bg-secondary/70 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Reward</p>
              <p className="flex items-center gap-1 text-lg font-bold text-gold">
                <Coins className="h-4 w-4" /> {config.coins}
              </p>
            </div>
          </div>
          {tips.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          ) : null}
          <Button className="w-full" size="lg" onClick={onStart}>
            Start writing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Run info ------------------------------------------------------------

export function RunInfoDialog({ state, onClose }: { state: StoryState; onClose: () => void }) {
  const upgradedLetters = Object.keys(state.letterUpgrades).sort();
  const upgradedLengths = Object.keys(state.wordLengthUpgrades).map(Number).sort((a, b) => a - b);
  const enhanced = state.tiles.filter((tile) => tile.enhancement);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run Info</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="mb-1 font-bold">Letter Base upgrades</h3>
            {upgradedLetters.length === 0 ? (
              <p className="text-muted-foreground">None yet — all letters use their original values.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {upgradedLetters.map((letter) => (
                  <span key={letter} className="rounded-md bg-secondary px-2 py-1 font-semibold">
                    {letter} <span className="text-base-ink">{(LETTER_VALUES[letter] ?? 0) + state.letterUpgrades[letter]!}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-bold">Word-length upgrades</h3>
            {upgradedLengths.length === 0 ? (
              <p className="text-muted-foreground">None yet — a word's Mult starts at its length.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {upgradedLengths.map((length) => (
                  <span key={length} className="rounded-md bg-secondary px-2 py-1 font-semibold">
                    {length} letters <span className="text-mult-ink">×{length + state.wordLengthUpgrades[length]!}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-bold">Enhanced tiles</h3>
            {enhanced.length === 0 ? (
              <p className="text-muted-foreground">No enhanced tiles yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {enhanced.map((tile) => (
                  <span key={tile.id} className="rounded-md bg-secondary px-2 py-1 font-semibold">
                    {tile.letter} <span className="text-mult-ink">{tile.enhancement}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-bold">Pens</h3>
            {state.pens.length === 0 ? (
              <p className="text-muted-foreground">No Pens yet — visit the Bookstore.</p>
            ) : (
              <ul className="space-y-1.5">
                {state.pens.map((pen) => {
                  const def = penDef(pen.penId);
                  return (
                    <li key={pen.penId} className="rounded-md bg-secondary px-2.5 py-1.5">
                      <span className="font-semibold">{def.name}</span>
                      {def.scaling ? <span className="ml-1 text-primary">(+{pen.bonus} Mult)</span> : null}
                      <p className="text-xs text-muted-foreground">{def.description}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-bold">Permanent Upgrades</h3>
            {state.upgrades.length === 0 ? (
              <p className="text-muted-foreground">None yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {state.upgrades.map((id) => {
                  const def = upgradeDef(id);
                  return (
                    <li key={id} className="rounded-md bg-secondary px-2.5 py-1.5">
                      <span className="font-semibold">{def.name}</span>
                      <p className="text-xs text-muted-foreground">{def.description}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Bag overview --------------------------------------------------------

export function BagDialog({
  state,
  onClose,
}: {
  state: StoryState;
  onClose: () => void;
}) {
  const tileById = new Map(state.tiles.map((t) => [t.id, t]));
  const counts = new Map<string, { count: number; enhanced: number }>();
  for (const id of state.page.bag) {
    const tile = tileById.get(id)!;
    const entry = counts.get(tile.letter) ?? { count: 0, enhanced: 0 };
    entry.count += 1;
    if (tile.enhancement) entry.enhanced += 1;
    counts.set(tile.letter, entry);
  }
  const rows = [...counts.entries()].sort((a, b) =>
    a[0] === "?" ? 1 : b[0] === "?" ? -1 : a[0].localeCompare(b[0]),
  );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bag — {state.page.bag.length} tiles left this Page</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-1.5">
          {rows.map(([letter, { count, enhanced }]) => (
            <div key={letter} className="rounded-md bg-secondary px-2 py-1.5 text-center">
              <span className="font-bold">{letter === "?" ? "blank" : letter}</span>
              <span className="ml-1 text-muted-foreground">×{count}</span>
              {enhanced > 0 ? <span className="ml-1 text-xs font-bold text-mult-ink">✦{enhanced}</span> : null}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Tile inspector ------------------------------------------------------

const ENH_EXPLAIN: Record<string, string> = {
  DL: "Doubles this tile's Base Ink every time it scores — including when reused in later words.",
  TL: "Triples this tile's Base Ink every time it scores — including when reused in later words.",
  DW: "Doubles the Mult of every scored word containing this tile. Works again when reused.",
  TW: "Triples the Mult of every scored word containing this tile. Works again when reused.",
};

export function TileInspectDialog({
  tile,
  state,
  onClose,
}: {
  tile: StoryTile;
  state: StoryState;
  onClose: () => void;
}) {
  const original = tile.letter === "?" ? 0 : (LETTER_VALUES[tile.letter] ?? 0);
  const current = original + (state.letterUpgrades[tile.letter] ?? 0);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>
            {tile.letter === "?" ? "Blank tile" : tile.letter}
            {tile.enhancement ? ` — ${tile.enhancement}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            Base Ink: <span className="font-bold text-base-ink">{current}</span>
            {current !== original ? <span className="text-muted-foreground"> (originally {original})</span> : null}
          </p>
          {tile.enhancement ? (
            <p className="text-muted-foreground">
              <span className="font-bold text-mult-ink">{tile.enhancement}: </span>
              {ENH_EXPLAIN[tile.enhancement]}
            </p>
          ) : (
            <p className="text-muted-foreground">No enhancement. You can add one in the Bookstore.</p>
          )}
          {tile.letter === "?" ? (
            <p className="text-muted-foreground">A blank can become any letter when played, but always scores 0 Base.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Pen inspector -------------------------------------------------------

export function PenInspectDialog({
  pen,
  canSell,
  onSell,
  onClose,
}: {
  pen: PenInstance;
  canSell: boolean;
  onSell: () => void;
  onClose: () => void;
}) {
  const def = penDef(pen.penId);
  const Icon = penIcon(pen.penId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-xs overflow-y-auto border-0 bg-transparent p-0 shadow-none">
        <ShopDetailTile glow="var(--color-shop-pen)">
          <span className="self-start text-xs font-bold uppercase text-shop-pen">Pen</span>
          <Icon className="h-16 w-16 text-shop-pen" />
          <DialogTitle className="text-xl font-bold leading-tight">{def.name}</DialogTitle>
          <p className="text-sm leading-snug text-muted-foreground">{def.description}</p>
          {def.scaling ? (
            <p>
              Current bonus: <span className="font-bold text-mult-ink">+{pen.bonus} Mult</span>
            </p>
          ) : null}
          {canSell ? (
            <Button variant="outline" size="sm" onClick={onSell}>
              Sell for {Math.floor(def.price / 2)} Coins
            </Button>
          ) : null}
        </ShopDetailTile>
      </DialogContent>
    </Dialog>
  );
}

// --- Blank letter picker -------------------------------------------------

export function BlankPickerDialog({ onPick, onClose }: { onPick: (letter: string) => void; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Choose a letter for the blank</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-6 gap-1.5">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => onPick(letter)}
              className="tile-face tile-gloss flex aspect-square items-center justify-center rounded-md text-lg font-bold hover:-translate-y-0.5"
            >
              {letter}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Enhancement tile picker ----------------------------------------------

export function EnhancePickerDialog({
  state,
  enhancement,
  onPick,
  onClose,
}: {
  state: StoryState;
  enhancement: string;
  onPick: (tileId: string) => void;
  onClose: () => void;
}) {
  const candidates = state.tiles.filter((tile) => tile.letter !== "?");
  const unenhanced = candidates.filter((tile) => !tile.enhancement);
  const enhanced = candidates.filter((tile) => tile.enhancement);
  const renderTile = (tile: StoryTile) => (
    <button
      key={tile.id}
      type="button"
      onClick={() => onPick(tile.id)}
      className="tile-face tile-gloss relative flex aspect-square items-center justify-center rounded-md text-lg font-bold hover:-translate-y-0.5"
    >
      {tile.letter}
      {tile.enhancement ? (
        <span className="absolute bottom-[2px] right-[3px] text-[0.55rem] font-bold text-mult-ink">{tile.enhancement}</span>
      ) : null}
    </button>
  );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enhance a tile with {enhancement}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pick one physical tile — it keeps the {enhancement} effect for the rest of the Story, even between Pages.
        </p>
        <div className="grid grid-cols-8 gap-1.5">{unenhanced.map(renderTile)}</div>
        {enhanced.length > 0 ? (
          <>
            <p className="text-xs font-semibold text-muted-foreground">
              Already enhanced — picking one replaces its current enhancement:
            </p>
            <div className="grid grid-cols-8 gap-1.5">{enhanced.map(renderTile)}</div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// --- Victory / defeat ----------------------------------------------------

function StoryStats({ state }: { state: StoryState }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-center text-sm">
      <div className="rounded-lg bg-secondary/70 px-3 py-2">
        <p className="text-xs text-muted-foreground">Total Story Ink</p>
        <p className="text-lg font-bold text-base-ink">{state.totalInk.toLocaleString()}</p>
      </div>
      <div className="rounded-lg bg-secondary/70 px-3 py-2">
        <p className="text-xs text-muted-foreground">Best word</p>
        <p className="text-lg font-bold">
          {state.bestWord ? `${state.bestWord.word} (${state.bestWord.ink})` : "—"}
        </p>
      </div>
      <div className="rounded-lg bg-secondary/70 px-3 py-2">
        <p className="text-xs text-muted-foreground">Pens collected</p>
        <p className="text-lg font-bold">{state.pens.length}</p>
      </div>
      <div className="rounded-lg bg-secondary/70 px-3 py-2">
        <p className="text-xs text-muted-foreground">Pages completed</p>
        <p className="text-lg font-bold">{state.pagesCompleted} / 9</p>
      </div>
    </div>
  );
}

export function StoryEndDialog({
  state,
  won,
  onNewStory,
}: {
  state: StoryState;
  won: boolean;
  onNewStory: () => void;
}) {
  const config = PAGES[state.pageIndex]!;
  return (
    <Dialog open>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {won ? (
              <>
                <Sparkles className="h-6 w-6 text-primary" /> Story Complete!
              </>
            ) : (
              <>Story Over</>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {won
              ? "You survived all three Chapters and every Plot Twist. What a tale!"
              : `You reached ${pageLabel(config)} with ${state.page.ink.toLocaleString()} of ${config.inkTarget.toLocaleString()} Ink.`}
          </p>
          <StoryStats state={state} />
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={onNewStory}>
              Start a new Story
            </Button>
            <Button variant="outline" asChild>
              <Link to="/lobby">
                <Home className="mr-1 h-4 w-4" /> Back to Menu
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
