// Size-parameterized word placement validation for Story mode boards.
// Mirrors the multiplayer rules: one line, contiguous, centre star first,
// must connect afterwards, every formed word must be in the dictionary.

import type { BoardTile, PendingPlacement } from "./types";

export interface StoryWord {
  word: string;
  indices: number[];
}

export interface StoryMoveOk {
  words: StoryWord[];
}

export interface StoryMoveError {
  error: string;
}

const rowOf = (size: number, index: number) => Math.floor(index / size);
const colOf = (size: number, index: number) => index % size;

function letterAt(
  board: (BoardTile | null)[],
  pending: Map<number, PendingPlacement>,
  index: number,
): string | null {
  const placed = pending.get(index);
  if (placed) return placed.letter;
  return board[index]?.letter ?? null;
}

function collectWord(
  board: (BoardTile | null)[],
  pending: Map<number, PendingPlacement>,
  size: number,
  start: number,
  step: number,
): StoryWord | null {
  let head = start;
  while (true) {
    const prev = head - step;
    if (prev < 0 || prev >= size * size) break;
    if (step === 1 && rowOf(size, prev) !== rowOf(size, head)) break;
    if (!letterAt(board, pending, prev)) break;
    head = prev;
  }

  let word = "";
  const indices: number[] = [];
  let cursor = head;
  while (cursor >= 0 && cursor < size * size) {
    if (step === 1 && indices.length > 0 && rowOf(size, cursor) !== rowOf(size, indices[0]!)) break;
    const letter = letterAt(board, pending, cursor);
    if (!letter) break;
    word += letter;
    indices.push(cursor);
    cursor += step;
  }

  if (word.length < 2) return null;
  return { word, indices };
}

export function validateStoryMove(
  board: (BoardTile | null)[],
  size: number,
  placements: PendingPlacement[],
  isDictionaryWord: (word: string) => boolean,
): StoryMoveOk | StoryMoveError {
  if (placements.length === 0) return { error: "Place at least one tile." };
  const pending = new Map<number, PendingPlacement>();
  const tileIds = new Set<string>();
  for (const placement of placements) {
    if (tileIds.has(placement.tileId)) return { error: "A letter tile can only be used once." };
    tileIds.add(placement.tileId);
    if (board[placement.index]) return { error: "A tile is already on that square." };
    if (pending.has(placement.index)) return { error: "Two tiles on the same square." };
    pending.set(placement.index, placement);
  }

  const indices = [...pending.keys()].sort((a, b) => a - b);
  const rows = new Set(indices.map((i) => rowOf(size, i)));
  const cols = new Set(indices.map((i) => colOf(size, i)));
  const horizontal = rows.size === 1;
  const vertical = cols.size === 1;
  if (!horizontal && !vertical) return { error: "Tiles must line up in one row or column." };

  const lineStep = horizontal ? 1 : size;
  for (let i = indices[0]!; i <= indices[indices.length - 1]!; i += lineStep) {
    if (!letterAt(board, pending, i)) return { error: "Your tiles must form one unbroken word." };
  }

  const center = ((size - 1) / 2) * size + (size - 1) / 2;
  const boardIsEmpty = board.every((cell) => cell === null);
  if (boardIsEmpty) {
    if (!pending.has(center)) return { error: "The first word must cross the centre star." };
    if (indices.length < 2) return { error: "The first word needs at least two letters." };
  } else {
    const touches = indices.some((index) => {
      const neighbours: number[] = [];
      if (colOf(size, index) > 0) neighbours.push(index - 1);
      if (colOf(size, index) < size - 1) neighbours.push(index + 1);
      if (rowOf(size, index) > 0) neighbours.push(index - size);
      if (rowOf(size, index) < size - 1) neighbours.push(index + size);
      return neighbours.some((n) => board[n]);
    });
    if (!touches) return { error: "New words must connect to letters already on the board." };
  }

  const words: StoryWord[] = [];
  const main = collectWord(board, pending, size, indices[0]!, horizontal ? 1 : size);
  if (main) words.push(main);
  for (const index of indices) {
    const cross = collectWord(board, pending, size, index, horizontal ? size : 1);
    if (cross) words.push(cross);
  }
  if (words.length === 0) return { error: "That doesn't make a word." };

  const invalid = words.find((entry) => !isDictionaryWord(entry.word));
  if (invalid) return { error: `${invalid.word} is not in the word list.` };

  return { words };
}
