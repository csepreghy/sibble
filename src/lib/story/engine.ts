// Story run lifecycle: new Stories, Page setup, placements, discards, Bookstore.

import { LAST_PAGE_INDEX, PAGES } from "./boards";
import { validateStoryMove } from "./placement";
import { scorePlacement, type PlacementScore } from "./scoring";
import type { Offer, PageState, PendingPlacement, StoryState, StoryTile } from "./types";
import { PENS } from "./pens";
import { UPGRADES, discardsPerPage, penSlots, priceFor, rackCapacity } from "./upgrades";

const DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
  "?": 2,
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function buildTiles(): StoryTile[] {
  const tiles: StoryTile[] = [];
  for (const [letter, count] of Object.entries(DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      tiles.push({ id: `${letter}-${i}`, letter, enhancement: null });
    }
  }
  return tiles;
}

export function startPage(state: Omit<StoryState, "page"> & { page?: PageState }, pageIndex: number): StoryState {
  const config = PAGES[pageIndex]!;
  const bag = shuffle(state.tiles.map((tile) => tile.id));
  const capacity = rackCapacity(state.upgrades);
  const rack = bag.slice(0, capacity);
  const rest = bag.slice(capacity);
  const page: PageState = {
    board: Array(config.size * config.size).fill(null),
    rack,
    bag: rest,
    wordsLeft: config.words + (state.upgrades.includes("deep-pockets") ? 1 : 0),
    discardsLeft: discardsPerPage(state.upgrades),
    ink: 0,
    longestWord: 0,
    usedPremiums: [],
  };
  return { ...state, pageIndex, page, phase: "play", offers: null };
}

export function newStory(): StoryState {
  const base = {
    version: 1 as const,
    pageIndex: 0,
    coins: 0,
    tiles: buildTiles(),
    letterUpgrades: {},
    wordLengthUpgrades: {},
    pens: [],
    upgrades: [],
    totalInk: 0,
    bestWord: null,
    phase: "play" as const,
    offers: null,
    pagesCompleted: 0,
  };
  return startPage(base, 0);
}

export interface PlayResult {
  state: StoryState;
  score: PlacementScore;
  pageCompleted: boolean;
  storyWon: boolean;
  defeated: boolean;
  coinReward: number;
}

/** Commits a validated placement: scores it, updates board/rack, checks Page end. */
export function playPlacement(
  state: StoryState,
  placements: PendingPlacement[],
  isDictionaryWord: (word: string) => boolean,
): PlayResult | { error: string } {
  const config = PAGES[state.pageIndex]!;
  const validated = validateStoryMove(state.page.board, config.size, placements, isDictionaryWord);
  if ("error" in validated) return validated;

  const score = scorePlacement({
    words: validated.words,
    size: config.size,
    board: state.page.board,
    pending: placements,
    tiles: state.tiles,
    premiums: config.premiums,
    usedPremiums: state.page.usedPremiums,
    plotTwist: config.plotTwist,
    letterUpgrades: state.letterUpgrades,
    wordLengthUpgrades: state.wordLengthUpgrades,
    pens: state.pens,
    longestThisPage: state.page.longestWord,
  });

  // Commit tiles to the board.
  const board = [...state.page.board];
  const placedIds = new Set(placements.map((p) => p.tileId));
  const usedPremiums = [...state.page.usedPremiums];
  for (const placement of placements) {
    board[placement.index] = { tileId: placement.tileId, letter: placement.letter, blank: placement.blank };
    if (config.premiums[placement.index] && !usedPremiums.includes(placement.index)) {
      usedPremiums.push(placement.index);
    }
  }

  // Refill the rack from the bag.
  const rack = state.page.rack.filter((id) => !placedIds.has(id));
  const bag = [...state.page.bag];
  const capacity = rackCapacity(state.upgrades);
  while (rack.length < capacity && bag.length > 0) rack.push(bag.pop()!);

  // Apply Pen scaling gains earned by this placement.
  const pens = state.pens.map((pen) =>
    score.penGains[pen.penId] ? { ...pen, bonus: pen.bonus + score.penGains[pen.penId]! } : pen,
  );

  const ink = state.page.ink + score.totalInk;
  const wordsLeft = state.page.wordsLeft - 1;
  const bestWord =
    score.words.reduce<{ word: string; ink: number } | null>(
      (best, word) => (!best || word.ink > best.ink ? { word: word.word, ink: word.ink } : best),
      state.bestWord,
    ) ?? state.bestWord;

  const pageCompleted = ink >= config.inkTarget;
  const storyWon = pageCompleted && state.pageIndex === LAST_PAGE_INDEX;
  const defeated = !pageCompleted && wordsLeft <= 0;
  const coinReward = pageCompleted
    ? config.coins + (state.upgrades.includes("golden-payday") ? 2 : 0)
    : 0;

  const next: StoryState = {
    ...state,
    pens,
    totalInk: state.totalInk + score.totalInk,
    bestWord,
    coins: state.coins + coinReward,
    pagesCompleted: pageCompleted ? state.pagesCompleted + 1 : state.pagesCompleted,
    page: {
      ...state.page,
      board,
      rack,
      bag,
      ink,
      wordsLeft,
      longestWord: score.longest,
      usedPremiums,
    },
    phase: storyWon ? "victory" : defeated ? "defeat" : pageCompleted ? "bookstore" : "play",
    offers: pageCompleted && !storyWon ? generateOffers({ ...state, pens }) : null,
  };

  return { state: next, score, pageCompleted, storyWon, defeated, coinReward };
}

/** Discards 1–3 (or 4 with Flexible Fingers) rack tiles and draws replacements. */
export function discardTiles(state: StoryState, tileIds: string[]): StoryState | { error: string } {
  if (state.page.discardsLeft <= 0) return { error: "No discards left." };
  const limit = state.upgrades.includes("flexible-fingers") ? 4 : 3;
  if (tileIds.length === 0 || tileIds.length > limit) return { error: `Choose 1–${limit} tiles to discard.` };
  const rack = state.page.rack.filter((id) => !tileIds.includes(id));
  const bag = shuffle([...state.page.bag, ...tileIds]);
  const capacity = rackCapacity(state.upgrades);
  while (rack.length < capacity && bag.length > 0) rack.push(bag.pop()!);
  return {
    ...state,
    page: { ...state.page, rack, bag, discardsLeft: state.page.discardsLeft - 1 },
  };
}

// --- Bookstore -----------------------------------------------------------

const ENHANCEMENT_PRICES = { DL: 4, TL: 6, DW: 7, TW: 10 } as const;

function pickRandom<T>(items: T[], count: number): T[] {
  return shuffle(items).slice(0, count);
}

/** Seven offers: 2 letter upgrades, 1 enhancement, 1 word-length, 2 Pens, 1 Upgrade. */
export function generateOffers(state: Pick<StoryState, "tiles" | "pens" | "upgrades" | "pageIndex">): Offer[] {
  const offers: Offer[] = [];

  // Letter base upgrades: favour letters actually in the tile collection.
  const letters = [...new Set(state.tiles.filter((t) => t.letter !== "?").map((t) => t.letter))];
  const common = letters.filter((l) => "AEIOULNRST".includes(l));
  const rare = letters.filter((l) => !common.includes(l));
  const letterPicks = [...pickRandom(common, 2), ...pickRandom(rare, 1)].slice(0, 2);
  for (const letter of letterPicks) offers.push({ kind: "letter", letter, price: 3, sold: false });

  const enhancement = pickRandom(["DL", "TL", "DW", "TW"] as const, 1)[0]!;
  offers.push({ kind: "enhancement", enhancement, price: ENHANCEMENT_PRICES[enhancement], sold: false });

  const size = PAGES[state.pageIndex]!.size;
  const maxLength = Math.min(8, size);
  const length = 2 + Math.floor(Math.random() * (maxLength - 1));
  offers.push({ kind: "word-length", length, price: 5, sold: false });

  const ownedPens = new Set(state.pens.map((pen) => pen.penId));
  const penPool = PENS.filter((pen) => !ownedPens.has(pen.id));
  for (const pen of pickRandom(penPool, 2)) offers.push({ kind: "pen", penId: pen.id, price: pen.price, sold: false });

  const upgradePool = UPGRADES.filter((upgrade) => !state.upgrades.includes(upgrade.id));
  const upgrade = pickRandom(upgradePool, 1)[0];
  if (upgrade) offers.push({ kind: "upgrade", upgradeId: upgrade.id, price: upgrade.price, sold: false });

  return offers;
}

export type PurchaseResult = StoryState | { error: string } | { needsTile: StoryState; offerIndex: number };

export function buyOffer(state: StoryState, offerIndex: number, targetTileId?: string): PurchaseResult {
  const offers = state.offers;
  if (!offers) return { error: "The Bookstore is closed." };
  const offer = offers[offerIndex];
  if (!offer || offer.sold) return { error: "That offer is no longer available." };
  // Enhancement offers ask for a tile first; Coins are only taken once it's picked.
  if (offer.kind === "enhancement" && !targetTileId) return { needsTile: state, offerIndex };
  const price = priceFor(state.upgrades, offer.price);
  if (state.coins < price) return { error: "Not enough Coins." };

  const markSold = offers.map((o, i) => (i === offerIndex ? { ...o, sold: true } : o));
  const paid = { ...state, coins: state.coins - price, offers: markSold };

  switch (offer.kind) {
    case "letter":
      return {
        ...paid,
        letterUpgrades: {
          ...state.letterUpgrades,
          [offer.letter]: (state.letterUpgrades[offer.letter] ?? 0) + 1,
        },
      };
    case "word-length":
      return {
        ...paid,
        wordLengthUpgrades: {
          ...state.wordLengthUpgrades,
          [offer.length]: (state.wordLengthUpgrades[offer.length] ?? 0) + 1,
        },
      };
    case "enhancement": {
      const tile = state.tiles.find((t) => t.id === targetTileId);
      if (!tile || tile.letter === "?") return { error: "Choose a letter tile to enhance." };
      return {
        ...paid,
        tiles: state.tiles.map((t) => (t.id === targetTileId ? { ...t, enhancement: offer.enhancement } : t)),
      };
    }
    case "pen": {
      if (state.pens.length >= penSlots(state.upgrades)) return { error: "All Pen slots are full — sell a Pen first." };
      return { ...paid, pens: [...state.pens, { penId: offer.penId, bonus: 0 }] };
    }
    case "upgrade":
      return { ...paid, upgrades: [...state.upgrades, offer.upgradeId] };
  }
}

export function sellPen(state: StoryState, penId: string): StoryState {
  const pen = PENS.find((p) => p.id === penId);
  if (!pen) return state;
  return {
    ...state,
    pens: state.pens.filter((p) => p.penId !== penId),
    coins: state.coins + Math.floor(pen.price / 2),
  };
}

/** Leaves the Bookstore and begins the next Page. */
export function continueToNextPage(state: StoryState): StoryState {
  return startPage(state, state.pageIndex + 1);
}
