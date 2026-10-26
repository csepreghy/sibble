// Shared types for Sibble's singleplayer Story mode.

export type Enhancement = "DL" | "TL" | "DW" | "TW";

export type PlotTwist = "silent-vowels" | "silent-consonants" | "fading-ink" | null;

/** A physical letter tile owned for the duration of a Story. */
export interface StoryTile {
  id: string;
  letter: string; // "?" for a blank
  enhancement: Enhancement | null;
}

/** A tile committed to the board during the current Page. */
export interface BoardTile {
  tileId: string;
  letter: string; // the letter shown (blank's chosen letter)
  blank: boolean;
}

/** A tile the player is about to play. */
export interface PendingPlacement {
  index: number;
  tileId: string;
  letter: string;
  blank: boolean;
}

export interface PenInstance {
  penId: string;
  /** accumulated scaling bonus (Growing Vocabulary, Vowel Collector) */
  bonus: number;
}

export interface PageState {
  board: (BoardTile | null)[];
  /** tile ids currently on the rack */
  rack: string[];
  /** tile ids still in the bag this Page */
  bag: string[];
  wordsLeft: number;
  discardsLeft: number;
  ink: number;
  longestWord: number;
  /** board indices whose premium square was already activated */
  usedPremiums: number[];
}

export type Offer =
  | { kind: "letter"; letter: string; price: number; sold: boolean }
  | { kind: "word-length"; length: number; price: number; sold: boolean }
  | { kind: "enhancement"; enhancement: Enhancement; price: number; sold: boolean }
  | { kind: "pen"; penId: string; price: number; sold: boolean }
  | { kind: "upgrade"; upgradeId: string; price: number; sold: boolean };

export type StoryPhase = "play" | "bookstore" | "victory" | "defeat";

export interface StoryState {
  version: 1;
  pageIndex: number; // 0..8 into PAGES
  coins: number;
  tiles: StoryTile[]; // every physical tile owned this Story
  letterUpgrades: Record<string, number>;
  wordLengthUpgrades: Record<number, number>;
  pens: PenInstance[];
  upgrades: string[];
  totalInk: number;
  bestWord: { word: string; ink: number } | null;
  phase: StoryPhase;
  page: PageState;
  offers: Offer[] | null;
  pagesCompleted: number;
}
