import { GOLDEN_PAYDAY_BONUS } from "./upgrades";
import type { CompletedPage, StoryState } from "./types";
import { PAGES } from "./boards";

/** Freeze the page's presentation values before Bookstore upgrades change them. */
export function snapshotPage(state: StoryState, coins: number): CompletedPage {
  return {
    pageIndex: state.pageIndex,
    board: state.page.board.map(cell => cell ? { ...cell } : null),
    tiles: state.tiles.map(tile => ({ ...tile })),
    letterUpgrades: { ...state.letterUpgrades },
    usedPremiums: [...state.page.usedPremiums],
    playedWords: (state.page.playedWords ?? []).map(word => ({ ...word })),
    ink: state.page.ink,
    words: state.page.wordsPlayed ?? 0,
    bestWordInk: state.page.bestWordInk ?? 0,
    coins,
  };
}

/** Older saves can recover only the completed board still held by their run. */
export function restorePageHistory(state: StoryState): StoryState {
  const completedPages = state.completedPages ?? [];
  const config = PAGES[state.pageIndex];
  if (config && (state.phase === "bookstore" || state.phase === "victory") &&
      !completedPages.some(page => page.pageIndex === state.pageIndex)) {
    return { ...state, completedPages: [...completedPages, snapshotPage(state, config.coins + (state.upgrades.includes("golden-payday") ? GOLDEN_PAYDAY_BONUS : 0))] };
  }
  return { ...state, completedPages };
}