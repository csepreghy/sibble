// Story mode Ink scoring: Base × Mult, with enhancements, Plot Twists and Pens.
// Returns both the numeric result and a step-by-step event list the UI uses
// for the scoring animation, so what the player sees always matches the maths.

import { LETTER_VALUES } from "@/lib/scrabble";
import type { StoryWord } from "./placement";
import type { BoardTile, PageState, PendingPlacement, PenInstance, PlotTwist, StoryTile } from "./types";

export const VOWELS = new Set(["A", "E", "I", "O", "U"]);

export type ScoreEvent =
  | { type: "word"; word: string; indices: number[] }
  | { type: "letter"; index: number; letter: string; base: number; runningBase: number }
  | { type: "letter-mult"; index: number; label: string; factor: number; runningBase: number }
  | { type: "pen-base"; penId: string; text: string; runningBase: number }
  | { type: "twist"; text: string; runningBase: number }
  | { type: "mult-init"; value: number }
  | { type: "pen-mult"; penId: string; text: string; runningMult: number }
  | { type: "word-mult"; index: number; label: string; factor: number; runningMult: number }
  | { type: "result"; word: string; base: number; mult: number; ink: number };

export interface WordScore {
  word: string;
  base: number;
  mult: number;
  ink: number;
}

export interface PlacementScore {
  words: WordScore[];
  totalInk: number;
  events: ScoreEvent[];
  /** pen bonus deltas earned by this placement (applied after scoring) */
  penGains: Record<string, number>;
  /** longest word length seen in this placement */
  longest: number;
}

interface LetterContext {
  index: number;
  letter: string;
  blank: boolean;
  isNew: boolean;
  enhancement: StoryTile["enhancement"];
  boardPremium: "DL" | "TL" | "DW" | "TW" | null; // only when newly placed on it
}

export function scorePlacement(args: {
  words: StoryWord[];
  size: number;
  board: (BoardTile | null)[];
  pending: PendingPlacement[];
  tiles: StoryTile[];
  premiums: Record<number, "DL" | "TL" | "DW" | "TW">;
  usedPremiums: number[];
  plotTwist: PlotTwist;
  letterUpgrades: Record<string, number>;
  wordLengthUpgrades: Record<number, number>;
  pens: PenInstance[];
  longestThisPage: number;
}): PlacementScore {
  const {
    words,
    board,
    pending,
    tiles,
    premiums,
    usedPremiums,
    plotTwist,
    letterUpgrades,
    wordLengthUpgrades,
    pens,
  } = args;

  const tileById = new Map(tiles.map((tile) => [tile.id, tile]));
  const pendingByIndex = new Map(pending.map((p) => [p.index, p]));
  const usedPremiumSet = new Set(usedPremiums);
  const hasPen = (id: string) => pens.some((pen) => pen.penId === id);
  const penBonus = (id: string) => pens.find((pen) => pen.penId === id)?.bonus ?? 0;

  const events: ScoreEvent[] = [];
  const results: WordScore[] = [];
  const penGains: Record<string, number> = {};
  let longest = args.longestThisPage;
  let totalInk = 0;

  for (const storyWord of words) {
    const letters: LetterContext[] = storyWord.indices.map((index) => {
      const placed = pendingByIndex.get(index);
      if (placed) {
        const tile = tileById.get(placed.tileId);
        return {
          index,
          letter: placed.letter,
          blank: placed.blank,
          isNew: true,
          enhancement: tile?.enhancement ?? null,
          boardPremium: usedPremiumSet.has(index) ? null : (premiums[index] ?? null),
        };
      }
      const cell = board[index]!;
      const tile = tileById.get(cell.tileId);
      return {
        index,
        letter: cell.letter,
        blank: cell.blank,
        isNew: false,
        enhancement: tile?.enhancement ?? null,
        boardPremium: null, // board squares only activate for newly placed tiles
      };
    });

    const length = letters.length;
    const setsRecord = length > longest;
    const linguist = hasPen("linguist") && setsRecord;
    // The Linguist re-triggers the other pens once; scaling pens don't gain twice.
    const penRuns = linguist ? 2 : 1;

    events.push({ type: "word", word: storyWord.word, indices: storyWord.indices });

    // --- Base Ink -------------------------------------------------------
    let base = 0;
    for (const letter of letters) {
      const silenced =
        !letter.blank &&
        ((plotTwist === "silent-vowels" && VOWELS.has(letter.letter)) ||
          (plotTwist === "silent-consonants" && !VOWELS.has(letter.letter)));
      let letterBase = letter.blank
        ? 0
        : (LETTER_VALUES[letter.letter] ?? 0) + (letterUpgrades[letter.letter] ?? 0);
      if (silenced) letterBase = 0;
      base += letterBase;
      events.push({
        type: "letter",
        index: letter.index,
        letter: letter.letter,
        base: letterBase,
        runningBase: base,
      });
    }

    // DL/TL: permanent tile enhancement + newly activated board square.
    for (const letter of letters) {
      const factors: { label: string; factor: number }[] = [];
      if (letter.enhancement === "DL") factors.push({ label: "DL tile", factor: 2 });
      if (letter.enhancement === "TL") factors.push({ label: "TL tile", factor: 3 });
      if (letter.boardPremium === "DL") factors.push({ label: "DL square", factor: 2 });
      if (letter.boardPremium === "TL") factors.push({ label: "TL square", factor: 3 });
      for (const { label, factor } of factors) {
        const silenced =
          !letter.blank &&
          ((plotTwist === "silent-vowels" && VOWELS.has(letter.letter)) ||
            (plotTwist === "silent-consonants" && !VOWELS.has(letter.letter)));
        const raw = letter.blank
          ? 0
          : (LETTER_VALUES[letter.letter] ?? 0) + (letterUpgrades[letter.letter] ?? 0);
        const contribution = silenced ? 0 : raw * (factor - 1);
        base += contribution;
        events.push({ type: "letter-mult", index: letter.index, label, factor, runningBase: base });
      }
    }

    // Pens that modify Base Ink (retriggered by The Linguist).
    for (let run = 0; run < penRuns; run++) {
      if (hasPen("minimalist") && length === 3) {
        base += 5 * length;
        events.push({ type: "pen-base", penId: "minimalist", text: `+${5 * length} Base`, runningBase: base });
      }
      if (hasPen("vowel-power")) {
        let extra = 0;
        for (const letter of letters) {
          if (letter.blank || !VOWELS.has(letter.letter)) continue;
          if (plotTwist === "silent-vowels") continue;
          const raw = (LETTER_VALUES[letter.letter] ?? 0) + (letterUpgrades[letter.letter] ?? 0);
          let factor = 1;
          if (letter.enhancement === "DL") factor *= 2;
          if (letter.enhancement === "TL") factor *= 3;
          if (letter.boardPremium === "DL") factor *= 2;
          if (letter.boardPremium === "TL") factor *= 3;
          extra += raw * factor;
        }
        if (extra > 0) {
          base += extra;
          events.push({ type: "pen-base", penId: "vowel-power", text: `+${extra} Base`, runningBase: base });
        }
      }
      if (hasPen("echo-chamber")) {
        let extra = 0;
        for (const letter of letters) {
          if (letter.isNew) continue;
          const silenced =
            !letter.blank &&
            ((plotTwist === "silent-vowels" && VOWELS.has(letter.letter)) ||
              (plotTwist === "silent-consonants" && !VOWELS.has(letter.letter)));
          const raw = letter.blank
            ? 0
            : (LETTER_VALUES[letter.letter] ?? 0) + (letterUpgrades[letter.letter] ?? 0);
          let factor = 1;
          if (letter.enhancement === "DL") factor *= 2;
          if (letter.enhancement === "TL") factor *= 3;
          extra += silenced ? 0 : raw * factor;
        }
        if (extra > 0) {
          base += extra;
          events.push({ type: "pen-base", penId: "echo-chamber", text: `+${extra} Base`, runningBase: base });
        }
      }
    }

    if (plotTwist === "fading-ink") {
      base *= 0.5;
      events.push({ type: "twist", text: "Fading Ink: Base halved", runningBase: base });
    }

    // --- Mult -----------------------------------------------------------
    let mult = length + (wordLengthUpgrades[length] ?? 0);
    events.push({ type: "mult-init", value: mult });

    for (let run = 0; run < penRuns; run++) {
      if (hasPen("catnip") && length === 3) {
        mult += 10;
        events.push({ type: "pen-mult", penId: "catnip", text: "+10 Mult", runningMult: mult });
      }
      if (hasPen("crossword") && words.length > 1) {
        const add = 2 * (words.length - 1);
        mult += add;
        events.push({ type: "pen-mult", penId: "crossword", text: `+${add} Mult`, runningMult: mult });
      }
      if (hasPen("growing-vocabulary") && penBonus("growing-vocabulary") > 0) {
        mult += penBonus("growing-vocabulary");
        events.push({
          type: "pen-mult",
          penId: "growing-vocabulary",
          text: `+${penBonus("growing-vocabulary")} Mult`,
          runningMult: mult,
        });
      }
      if (hasPen("vowel-collector") && penBonus("vowel-collector") > 0) {
        mult += penBonus("vowel-collector");
        events.push({
          type: "pen-mult",
          penId: "vowel-collector",
          text: `+${penBonus("vowel-collector")} Mult`,
          runningMult: mult,
        });
      }
    }

    // DW/TW: permanent tile enhancements + newly activated board squares.
    for (const letter of letters) {
      const factors: { label: string; factor: number }[] = [];
      if (letter.enhancement === "DW") factors.push({ label: "DW tile", factor: 2 });
      if (letter.enhancement === "TW") factors.push({ label: "TW tile", factor: 3 });
      if (letter.boardPremium === "DW") factors.push({ label: "DW square", factor: 2 });
      if (letter.boardPremium === "TW") factors.push({ label: "TW square", factor: 3 });
      for (const { label, factor } of factors) {
        mult *= factor;
        events.push({ type: "word-mult", index: letter.index, label, factor, runningMult: mult });
      }
    }

    for (let run = 0; run < penRuns; run++) {
      if (hasPen("short-circuit") && length <= 4) {
        mult *= 2;
        events.push({ type: "pen-mult", penId: "short-circuit", text: "×2 Mult", runningMult: mult });
      }
      if (hasPen("architect") && words.length >= 3) {
        mult *= 3;
        events.push({ type: "pen-mult", penId: "architect", text: "×3 Mult", runningMult: mult });
      }
    }

    if (linguist) {
      events.push({ type: "pen-mult", penId: "linguist", text: "Pens triggered again!", runningMult: mult });
    }

    const ink = Math.floor(base * mult);
    results.push({ word: storyWord.word, base, mult, ink });
    events.push({ type: "result", word: storyWord.word, base, mult, ink });
    totalInk += ink;

    // --- Post-scoring gains --------------------------------------------
    if (hasPen("growing-vocabulary") && length === 5) {
      penGains["growing-vocabulary"] = (penGains["growing-vocabulary"] ?? 0) + 1;
    }
    if (length > longest) longest = length;
  }

  if (hasPen("vowel-collector")) {
    const newVowels = pending.filter((p) => !p.blank && VOWELS.has(p.letter)).length;
    if (newVowels > 0) penGains["vowel-collector"] = (penGains["vowel-collector"] ?? 0) + newVowels;
  }

  return { words: results, totalInk, events, penGains, longest };
}

/** Live preview of what the current pending placement would earn. */
export function previewPlacement(
  page: PageState,
  size: number,
  pending: PendingPlacement[],
  tiles: StoryTile[],
  premiums: Record<number, "DL" | "TL" | "DW" | "TW">,
  plotTwist: PlotTwist,
  letterUpgrades: Record<string, number>,
  wordLengthUpgrades: Record<number, number>,
  pens: PenInstance[],
  words: StoryWord[],
): number {
  return scorePlacement({
    words,
    size,
    board: page.board,
    pending,
    tiles,
    premiums,
    usedPremiums: page.usedPremiums,
    plotTwist,
    letterUpgrades,
    wordLengthUpgrades,
    pens,
    longestThisPage: page.longestWord,
  }).totalInk;
}
