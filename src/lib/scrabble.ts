// Core Scrabble rules engine: board, tiles, placement validation and scoring.

export const SIZE = 15;
export const CENTER = 112; // row 7, col 7

export type Premium = "TW" | "DW" | "TL" | "DL" | null;

const TW = [0, 7, 14, 105, 119, 210, 217, 224];
const DW = [16, 28, 32, 42, 48, 56, 64, 70, 112, 154, 160, 168, 176, 182, 192, 196, 208];
const TL = [20, 24, 76, 80, 84, 88, 136, 140, 144, 148, 200, 204];
const DL = [
  3, 11, 36, 38, 45, 52, 59, 92, 96, 98, 102, 108, 116, 122, 126, 128, 132, 165, 172, 179, 186,
  188, 213, 221,
];

export function premiumAt(index: number): Premium {
  if (TW.includes(index)) return "TW";
  if (DW.includes(index)) return "DW";
  if (TL.includes(index)) return "TL";
  if (DL.includes(index)) return "DL";
  return null;
}

export const LETTER_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
  "?": 0,
};

const DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
  "?": 2,
};

export const RACK_SIZE = 7;

export interface Tile {
  letter: string; // the letter shown on the board (A-Z)
  blank: boolean; // true when played from a blank tile (scores 0)
  player: 0 | 1;
  naughty?: boolean; // part of a rude word — scored double, outlined in pink
}

export type Board = (Tile | null)[];

export interface HistoryEntry {
  player: 0 | 1;
  description: string;
  score: number;
}

export interface GameState {
  board: Board;
  bag: string[];
  racks: [string[], string[]];
  scores: [number, number];
  turn: 0 | 1;
  history: HistoryEntry[];
  consecutivePasses: number;
  finished: boolean;
  lastPlayed: number[];
}

export interface Placement {
  index: number;
  letter: string; // A-Z
  blank: boolean;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function createBag(): string[] {
  const tiles: string[] = [];
  for (const [letter, count] of Object.entries(DISTRIBUTION)) {
    for (let i = 0; i < count; i++) tiles.push(letter);
  }
  return shuffle(tiles);
}

export function draw(bag: string[], rack: string[]): { bag: string[]; rack: string[] } {
  const nextBag = [...bag];
  const nextRack = [...rack];
  while (nextRack.length < RACK_SIZE && nextBag.length > 0) {
    nextRack.push(nextBag.pop()!);
  }
  return { bag: nextBag, rack: nextRack };
}

export function createGameState(): GameState {
  let bag = createBag();
  const first = draw(bag, []);
  bag = first.bag;
  const second = draw(bag, []);
  bag = second.bag;
  return {
    board: Array<Tile | null>(SIZE * SIZE).fill(null),
    bag,
    racks: [first.rack, second.rack],
    scores: [0, 0],
    turn: 0,
    history: [],
    consecutivePasses: 0,
    finished: false,
    lastPlayed: [],
  };
}

export const rowOf = (index: number) => Math.floor(index / SIZE);
export const colOf = (index: number) => index % SIZE;

export interface WordResult {
  word: string;
  score: number;
  indices: number[];
  naughty?: boolean;
}

export interface MoveResult {
  words: WordResult[];
  score: number;
  bingo: boolean;
  naughtyIndices: number[];
}

function tileAt(board: Board, pending: Map<number, Placement>, index: number): Tile | null {
  const placed = pending.get(index);
  if (placed) return { letter: placed.letter, blank: placed.blank, player: 0 };
  return board[index] ?? null;
}

function collectWord(
  board: Board,
  pending: Map<number, Placement>,
  start: number,
  step: number,
): WordResult | null {
  // walk back to the beginning of the word
  let head = start;
  while (true) {
    const prev = head - step;
    if (prev < 0 || prev >= SIZE * SIZE) break;
    if (step === 1 && rowOf(prev) !== rowOf(head)) break;
    if (!tileAt(board, pending, prev)) break;
    head = prev;
  }

  let word = "";
  const indices: number[] = [];
  let raw = 0;
  let wordMultiplier = 1;
  let cursor = head;
  while (cursor >= 0 && cursor < SIZE * SIZE) {
    if (step === 1 && indices.length > 0 && rowOf(cursor) !== rowOf(indices[0]!)) break;
    const tile = tileAt(board, pending, cursor);
    if (!tile) break;
    const isNew = pending.has(cursor);
    const base = tile.blank ? 0 : (LETTER_VALUES[tile.letter] ?? 0);
    let value = base;
    if (isNew) {
      const premium = premiumAt(cursor);
      if (premium === "DL") value = base * 2;
      if (premium === "TL") value = base * 3;
      if (premium === "DW") wordMultiplier *= 2;
      if (premium === "TW") wordMultiplier *= 3;
    }
    raw += value;
    word += tile.letter;
    indices.push(cursor);
    cursor += step;
  }

  if (word.length < 2) return null;
  return { word, score: raw * wordMultiplier, indices };
}

export interface ValidationError {
  error: string;
}

export function validateMove(
  board: Board,
  placements: Placement[],
  isDictionaryWord: (word: string) => boolean,
): MoveResult | ValidationError {
  if (placements.length === 0) return { error: "Place at least one tile." };
  const pending = new Map<number, Placement>();
  for (const placement of placements) {
    if (board[placement.index]) return { error: "A tile is already on that square." };
    pending.set(placement.index, placement);
  }

  const indices = [...pending.keys()].sort((a, b) => a - b);
  const rows = new Set(indices.map(rowOf));
  const cols = new Set(indices.map(colOf));
  const horizontal = rows.size === 1;
  const vertical = cols.size === 1;
  if (!horizontal && !vertical) return { error: "Tiles must line up in one row or column." };

  // contiguity along the line (gaps must be filled by existing tiles)
  const step = horizontal && indices.length > 1 ? 1 : vertical && indices.length > 1 ? SIZE : 1;
  const lineStep = horizontal ? 1 : SIZE;
  for (let i = indices[0]!; i <= indices[indices.length - 1]!; i += lineStep) {
    if (!tileAt(board, pending, i)) return { error: "Your tiles must form one unbroken word." };
  }
  void step;

  const boardIsEmpty = board.every((cell) => cell === null);
  if (boardIsEmpty) {
    if (!pending.has(CENTER)) return { error: "The first word must cover the centre star." };
    if (indices.length < 2) return { error: "The first word needs at least two letters." };
  } else {
    const touches = indices.some((index) => {
      const neighbours: number[] = [];
      if (colOf(index) > 0) neighbours.push(index - 1);
      if (colOf(index) < SIZE - 1) neighbours.push(index + 1);
      if (rowOf(index) > 0) neighbours.push(index - SIZE);
      if (rowOf(index) < SIZE - 1) neighbours.push(index + SIZE);
      return neighbours.some((n) => board[n]);
    });
    if (!touches) return { error: "New words must connect to tiles already on the board." };
  }

  const words: WordResult[] = [];
  const main = collectWord(board, pending, indices[0]!, horizontal ? 1 : SIZE);
  if (main) words.push(main);
  for (const index of indices) {
    const cross = collectWord(board, pending, index, horizontal ? SIZE : 1);
    if (cross) words.push(cross);
  }
  if (words.length === 0) return { error: "That doesn't make a word." };

  const invalid = words.find((entry) => !isDictionaryWord(entry.word));
  if (invalid) return { error: `${invalid.word} is not in the word list.` };

  const bingo = placements.length === RACK_SIZE;
  const score = words.reduce((sum, entry) => sum + entry.score, 0) + (bingo ? 50 : 0);
  return { words, score, bingo };
}

export function removeFromRack(rack: string[], placements: Placement[]): string[] | null {
  const next = [...rack];
  for (const placement of placements) {
    const wanted = placement.blank ? "?" : placement.letter;
    const at = next.indexOf(wanted);
    if (at === -1) return null;
    next.splice(at, 1);
  }
  return next;
}
