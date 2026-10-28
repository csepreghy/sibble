// Page progression: nine Pages across three Chapters, with fixed Plot Twists.

import type { Enhancement, PlotTwist } from "./types";

export interface PageConfig {
  chapter: 1 | 2 | 3;
  page: 1 | 2 | 3; // 3 is always the Chapter's Plot Twist
  plotTwist: PlotTwist;
  size: number;
  inkTarget: number;
  words: number;
  coins: number;
  premiums: Record<number, Enhancement>;
}

type RowCol = [number, number];

/** Mirrors coordinates into all four corners of a size×size board. */
function sym(size: number, kind: Enhancement, coords: RowCol[]): Record<number, Enhancement> {
  const out: Record<number, Enhancement> = {};
  for (const [r, c] of coords) {
    const points: RowCol[] = [
      [r, c],
      [r, size - 1 - c],
      [size - 1 - r, c],
      [size - 1 - r, size - 1 - c],
    ];
    for (const [rr, cc] of points) out[rr * size + cc] = kind;
  }
  return out;
}

function merge(...maps: Record<number, Enhancement>[]): Record<number, Enhancement> {
  return Object.assign({}, ...maps);
}

function premiumsFor(size: number): Record<number, Enhancement> {
  if (size === 5) {
    return merge(sym(5, "DL", [[1, 1]]));
  }
  if (size === 7) {
    return merge(sym(7, "DL", [[1, 1]]), sym(7, "TL", [[0, 3]]));
  }
  if (size === 9) {
    return merge(
      sym(9, "DL", [[1, 1]]),
      sym(9, "TL", [[0, 4]]),
      sym(9, "DW", [[2, 2]]),
    );
  }
  if (size === 11) {
    return merge(
      sym(11, "DL", [[1, 1], [3, 5]]),
      sym(11, "TL", [[0, 5], [2, 2]]),
      sym(11, "DW", [[3, 3]]),
      sym(11, "TW", [[0, 0]]),
    );
  }
  if (size === 13) {
    return merge(
      sym(13, "DL", [[1, 1], [3, 6], [5, 5]]),
      sym(13, "TL", [[0, 6], [2, 2], [4, 4]]),
      sym(13, "DW", [[3, 3]]),
      sym(13, "TW", [[0, 0]]),
    );
  }
  // 15×15: the classic layout, with a neutral centre (no DW)
  const out: Record<number, Enhancement> = {};
  const put = (indices: number[], kind: Enhancement) => {
    for (const i of indices) out[i] = kind;
  };
  put([0, 7, 14, 105, 119, 210, 217, 224], "TW");
  put([16, 28, 32, 42, 48, 56, 64, 70, 154, 160, 168, 176, 182, 192, 196, 208], "DW");
  put([20, 24, 76, 80, 84, 88, 136, 140, 144, 148, 200, 204], "TL");
  put(
    [3, 11, 36, 38, 45, 52, 59, 92, 96, 98, 102, 108, 116, 122, 126, 128, 132, 165, 172, 179, 186, 188, 213, 221],
    "DL",
  );
  return out;
}

export const PAGES: PageConfig[] = [
  { chapter: 1, page: 1, plotTwist: null, size: 5, inkTarget: 30, words: 2, coins: 16, premiums: premiumsFor(5) },
  { chapter: 1, page: 2, plotTwist: null, size: 7, inkTarget: 130, words: 3, coins: 18, premiums: premiumsFor(7) },
  { chapter: 1, page: 3, plotTwist: "silent-vowels", size: 7, inkTarget: 90, words: 3, coins: 20, premiums: premiumsFor(7) },
  { chapter: 2, page: 1, plotTwist: null, size: 9, inkTarget: 600, words: 4, coins: 22, premiums: premiumsFor(9) },
  { chapter: 2, page: 2, plotTwist: null, size: 11, inkTarget: 1400, words: 4, coins: 24, premiums: premiumsFor(11) },
  { chapter: 2, page: 3, plotTwist: "silent-consonants", size: 11, inkTarget: 450, words: 4, coins: 26, premiums: premiumsFor(11) },
  { chapter: 3, page: 1, plotTwist: null, size: 13, inkTarget: 3500, words: 5, coins: 28, premiums: premiumsFor(13) },
  { chapter: 3, page: 2, plotTwist: null, size: 15, inkTarget: 8500, words: 5, coins: 30, premiums: premiumsFor(15) },
  { chapter: 3, page: 3, plotTwist: "fading-ink", size: 15, inkTarget: 5000, words: 5, coins: 32, premiums: premiumsFor(15) },
];

export const LAST_PAGE_INDEX = PAGES.length - 1;

export const TWIST_INFO: Record<Exclude<PlotTwist, null>, { name: string; description: string }> = {
  "silent-vowels": {
    name: "Silent Vowels",
    description:
      "A, E, I, O and U contribute no Base Ink this Page — upgrades and DL/TL can't restore it. They still count toward word length and can trigger DW/TW effects and Pens.",
  },
  "silent-consonants": {
    name: "Silent Consonants",
    description:
      "Consonants contribute no Base Ink this Page — upgrades and DL/TL can't restore it. They still count toward word length and can trigger DW/TW effects and Pens.",
  },
  "fading-ink": {
    name: "Fading Ink",
    description: "The total Base Ink of every scored word is halved before the word multiplier is applied.",
  },
};

export function pageLabel(config: PageConfig): string {
  return config.page === 3 ? `Chapter ${config.chapter} — Plot Twist` : `Chapter ${config.chapter} — Page ${config.page}`;
}
