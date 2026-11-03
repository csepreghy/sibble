// Story run lifecycle: new Stories, Page setup, placements, discards, Bookstore.

import { LAST_PAGE_INDEX, getPage, finiteInk } from "./boards";
import { validateStoryMove } from "./placement";
import { scorePlacement, type PlacementScore } from "./scoring";
import type { Offer, PageState, PendingPlacement, StoryState, StoryTile } from "./types";
import { PENS } from "./pens";
import { GOLDEN_PAYDAY_BONUS, UPGRADES, discardsPerPage, penSlots, priceFor, rackCapacity, shopOfferCount, upgradeAvailable } from "./upgrades";
import { snapshotPage } from "./history";
import { loadStoryStats } from "./stats";

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

export function buildTiles(): StoryTile[] {
  const tiles: StoryTile[] = [];
  for (const [letter, count] of Object.entries(DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      tiles.push({ id: `${letter}-${i}`, letter, enhancement: null });
    }
  }
  return tiles;
}

export function startPage(state: Omit<StoryState, "page"> & { page?: PageState }, pageIndex: number): StoryState {
  const config = getPage(pageIndex);
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
    wordsPlayed: 0,
    bestWordInk: 0,
    playedWords: [],
    usedPremiums: [],
    primaryWordLengths: [],
    discardsUsed: 0,
  };
  return { ...state, pageIndex, page, phase: "play", offers: null };
}

export function newStory(): StoryState {
  const base = {
    version: 1 as const,
    runId: crypto.randomUUID(),
    endlessPensUnlocked: loadStoryStats().endlessPensUnlocked,
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
    completedPages: [],
  };
  return startPage(base, 0);
}

/** Royalties: +1 Coin per full 10% of Ink above the target, capped at 5. Exact integer comparisons. */
export const ROYALTY_MAX = 5;
export function royaltyCoins(ink: number, target: number): number {
  if (target <= 0 || ink < target) return 0;
  for (let k = ROYALTY_MAX; k >= 1; k--) if (ink * 10 >= target * (10 + k)) return k;
  return 0;
}

/** Ink needed for the next Royalty Coin, or null once the maximum is earned. */
export function nextRoyaltyThreshold(ink: number, target: number): number | null {
  const current = royaltyCoins(ink, target);
  if (current >= ROYALTY_MAX) return null;
  return Math.ceil((target * (11 + current)) / 10);
}

export interface PageRewards {
  base: number;
  royalties: number;
  goldenPayday: number;
  loyalty?: number;
  total: number;
}

export function pageRewards(state: StoryState): PageRewards {
  const config = getPage(state.pageIndex);
  const base = config.coins;
  const royalties = royaltyCoins(state.page.ink, config.inkTarget);
  const goldenPayday = state.upgrades.includes("golden-payday") ? GOLDEN_PAYDAY_BONUS : 0;
  const loyalty = state.endless && state.upgrades.includes("loyalty-card") ? 7 : 0;
  return { base, royalties, goldenPayday, loyalty, total: base + royalties + goldenPayday + loyalty };
}

/** True once the Page's Ink target is met during play: the Page can no longer be lost. */
export function pageSecured(state: StoryState): boolean {
  return state.phase === "play" && state.page.ink >= getPage(state.pageIndex).inkTarget;
}

export interface FinishResult {
  state: StoryState;
  storyWon: boolean;
  rewards: PageRewards;
}

/** Completes a secured Page once, granting its Coins. Returns an error if already finished or not secured. */
export function finishPage(state: StoryState): FinishResult | { error: string } {
  if (!pageSecured(state)) return { error: "This Page can't be finished yet." };
  const rewards = pageRewards(state);
  const storyWon = state.pageIndex === LAST_PAGE_INDEX && !state.endless;
  const next: StoryState = {
    ...state,
    coins: state.coins + rewards.total,
    pagesCompleted: state.pagesCompleted + 1,
    phase: storyWon ? "victory" : "bookstore",
    offers: storyWon ? null : generateOffers(state),
  };
  next.completedPages = [...(state.completedPages ?? []).filter(page => page.pageIndex !== state.pageIndex), snapshotPage(next, rewards.total)];
  return { state: next, storyWon, rewards };
}

export interface PlayResult {
  state: StoryState;
  score: PlacementScore;
  /** target met (now or earlier) but the Page is still open for more words */
  secured: boolean;
  rewards: PageRewards | null;
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
  const config = getPage(state.pageIndex);
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
    firstMoveOfPage: (state.page.wordsPlayed ?? 0) === 0,
    wordsLeft: state.page.wordsLeft,
    discardsUsed: state.page.discardsUsed ?? (discardsPerPage(state.upgrades) - state.page.discardsLeft),
    primaryWordLengths: state.page.primaryWordLengths ?? [],
    chaptersCompleted: Math.floor(state.pageIndex / 3),
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

  const ink = finiteInk(state.page.ink + score.totalInk);
  const wordsLeft = state.page.wordsLeft - 1;
  const bestWord =
    score.words.reduce<{ word: string; ink: number } | null>(
      (best, word) => (!best || word.ink > best.ink ? { word: word.word, ink: word.ink } : best),
      state.bestWord,
    ) ?? state.bestWord;

  const secured = ink >= config.inkTarget;
  const pageCompleted = secured && wordsLeft <= 0;
  const defeated = !secured && wordsLeft <= 0;

  const played: StoryState = {
    ...state,
    pens,
    totalInk: finiteInk(state.totalInk + score.totalInk),
    bestWord,
    page: {
      ...state.page,
      board,
      rack,
      bag,
      ink,
      wordsLeft,
      longestWord: score.longest,
      wordsPlayed: (state.page.wordsPlayed ?? 0) + 1,
      bestWordInk: Math.max(state.page.bestWordInk ?? 0, ...score.words.map((word) => word.ink)),
      playedWords: [...(state.page.playedWords ?? []), ...score.words.map(word => ({ ...word, move: (state.page.wordsPlayed ?? 0) + 1 }))],
      usedPremiums,
      primaryWordLengths: [...new Set([...(state.page.primaryWordLengths ?? []), validated.words[0]?.word.length ?? 0])],
    },
    phase: defeated ? "defeat" : "play",
    offers: null,
  };

  if (pageCompleted) {
    const finished = finishPage(played);
    if ("error" in finished) throw new Error(finished.error);
    return { state: finished.state, score, secured, rewards: finished.rewards, pageCompleted, storyWon: finished.storyWon, defeated, coinReward: finished.rewards.total };
  }
  return { state: played, score, secured, rewards: null, pageCompleted, storyWon: false, defeated, coinReward: 0 };
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
    page: { ...state.page, rack, bag, discardsLeft: state.page.discardsLeft - 1, discardsUsed: (state.page.discardsUsed ?? 0) + 1 },
  };
}

// --- Bookstore -----------------------------------------------------------

export const WORD_LENGTH_PRICE = 7;
const ENHANCEMENT_PRICES = { DL: 6, TL: 9, DW: 12, TW: 16 } as const;

/** Longest word-length upgrade offered, based on the next Page's board. */
export function maxOfferLength(pageIndex: number): number {
  const size = getPage(pageIndex + 1).size;
  return size <= 9 ? Math.min(8, size) : size;
}

function pickRandom<T>(items: T[], count: number): T[] {
  return shuffle(items).slice(0, count);
}

/** Seven offers: 2 letter upgrades, 1 enhancement, 1 word-length, 2 Pens, 1 Upgrade. */
export function generateOffers(state: Pick<StoryState, "tiles" | "pens" | "upgrades" | "pageIndex" | "endless" | "endlessPensUnlocked">): Offer[] {
  const offers: Offer[] = [];

  // Letter base upgrades: favour letters actually in the tile collection.
  const letters = [...new Set(state.tiles.filter((t) => t.letter !== "?").map((t) => t.letter))];
  // One common letter, then any letter (all 26 eligible) except the first.
  const common = letters.filter((l) => "AEIOULNRST".includes(l));
  const first = pickRandom(common.length ? common : letters, 1)[0];
  const second = pickRandom(letters.filter((l) => l !== first), 1)[0];
  const letterPicks = [first, second].filter((l): l is string => !!l);
  for (const letter of letterPicks) offers.push({ kind: "letter", letter, price: 3, sold: false });

  const enhancement = pickRandom(["DL", "TL", "DW", "TW"] as const, 1)[0]!;
  offers.push({ kind: "enhancement", enhancement, price: ENHANCEMENT_PRICES[enhancement], sold: false });

  const length = 2 + Math.floor(Math.random() * (maxOfferLength(state.pageIndex) - 1));
  offers.push({ kind: "word-length", length, price: WORD_LENGTH_PRICE, sold: false });

  const ownedPens = new Set(state.pens.map((pen) => pen.penId));
  const penPool = PENS.filter((pen) => !ownedPens.has(pen.id) && (!pen.endless || state.endlessPensUnlocked));
  for (const pen of pickRandom(state.endless && state.pageIndex === 8 ? penPool.filter(p => p.endless) : penPool, 2)) offers.push({ kind: "pen", penId: pen.id, price: pen.price, sold: false });

  const upgradePool = UPGRADES.filter((upgrade) => upgradeAvailable(upgrade.id, state.upgrades, !!state.endless, getPage(state.pageIndex + 1).chapter));
  const upgrade = pickRandom(state.endless && state.pageIndex === 8 ? upgradePool.filter(u => u.chapter) : upgradePool, 1)[0];
  if (upgrade) offers.push({ kind: "upgrade", upgradeId: upgrade.id, price: upgrade.price, sold: false });

  for (const pen of pickRandom(penPool.filter(p => !offers.some(o => o.kind === "pen" && o.penId === p.id)), shopOfferCount(state.upgrades) - 7)) {
    offers.push({ kind: "pen", penId: pen.id, price: pen.price, sold: false });
  }
  // Endless can exhaust the one-time Upgrade pool; keep all purchased shelf capacity useful.
  if (state.endless) {
    while (offers.length < shopOfferCount(state.upgrades)) {
      const letter = pickRandom(letters, 1)[0];
      if (!letter) break;
      offers.push({ kind: "letter", letter, price: 3, sold: false });
    }
  }
  return offers;
}

export type PurchaseResult = StoryState | { error: string } | { needsLetter: StoryState; offerIndex: number };

export function buyOffer(state: StoryState, offerIndex: number, targetLetter?: string): PurchaseResult {
  const offers = state.offers;
  if (!offers) return { error: "The Bookstore is closed." };
  const offer = offers[offerIndex];
  if (!offer || offer.sold) return { error: "That offer is no longer available." };
  // Enhancement offers ask for a letter first; Coins are only taken once it's picked.
  if (offer.kind === "enhancement" && !targetLetter) return { needsLetter: state, offerIndex };
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
      const letter = (targetLetter ?? "").toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return { error: "Choose a letter to enhance." };
      if (!state.tiles.some((t) => t.letter === letter)) return { error: `No ${letter} tiles to enhance.` };
      return {
        ...paid,
        // The enhancement lands on every tile of the chosen letter.
        tiles: state.tiles.map((t) => (t.letter === letter ? { ...t, enhancement: offer.enhancement } : t)),
      };
    }
    case "pen": {
      if (state.pens.length >= penSlots(state.upgrades)) return { error: "All Pen slots are full — sell a Pen first." };
      return { ...paid, pens: [...state.pens, { penId: offer.penId, bonus: 0 }] };
    }
    case "upgrade": {
      if (!upgradeAvailable(offer.upgradeId, state.upgrades, !!state.endless, getPage(state.pageIndex + 1).chapter)) return { error: "That Upgrade is not available yet." };
      const upgraded = { ...paid, upgrades: [...state.upgrades, offer.upgradeId] };
      if (["endless-extra-shelf", "expanded-bookstore"].includes(offer.upgradeId)) {
        const extra = generateOffers(upgraded).find(o => o.kind === "letter");
        if (extra) upgraded.offers = [...markSold, extra];
      }
      return upgraded;
    }
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

/** Enter through the existing between-Page Bookstore; the completed board and whole build stay intact. */
export function enterEndless(state: StoryState): StoryState {
  if (state.phase !== "victory" || state.pageIndex !== LAST_PAGE_INDEX || state.completionDismissed) return state;
  const next = { ...state, endless: true, endlessPensUnlocked: true, phase: "bookstore" as const };
  return { ...next, offers: generateOffers(next) };
}
