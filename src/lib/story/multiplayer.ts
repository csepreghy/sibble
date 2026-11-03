// Competitive two-player Story: pure, server-authoritative match transitions.
// Reuses the solo engine (placement, scoring, Pens, Bookstore) per player while
// the board, turn order and Page victories are shared. Never touches solo saves.

import { getPage } from "./boards";
import { buildTiles, buyOffer, discardTiles, generateOffers, playPlacement, sellPen, startPage } from "./engine";
import type { BoardTile, Offer, PendingPlacement, StoryState, StoryTile } from "./types";
import { GOLDEN_PAYDAY_BONUS, UPGRADES } from "./upgrades";

export type Seat = 0 | 1;
export const WINS_NEEDED = 5;
export const MP_DISCARDS = 3;
/** Upgrades that would break equal word/discard opportunities are not sold in multiplayer. */
export const MP_EXCLUDED_UPGRADES = new Set(["deep-pockets", "extra-chance"]);

export interface MatchPlayer {
  userId: string;
  name: string;
  state: StoryState;
  ready: boolean;
  wins: number;
  bestPageInk: number;
}

export interface PageResult {
  pageIndex: number;
  ink: [number, number];
  winner: Seat;
  coins: [number, number];
}

export interface MatchState {
  v: 1;
  phase: "lobby" | "play" | "bookstore" | "finished" | "cancelled";
  pageIndex: number;
  board: (BoardTile | null)[];
  usedPremiums: number[];
  turn: Seat;
  starter: Seat;
  tiebreaks: number;
  offers: Offer[] | null;
  players: [MatchPlayer, MatchPlayer | null];
  lastPage?: PageResult;
  /** Public move record; `id` increases per move so clients animate each move once. Events are the visible scoring steps. */
  lastMove?: { id?: number; seat: Seat; words: string[]; ink: number; pass?: boolean; events?: import("./scoring").PlacementScore["events"] };
  winner?: Seat;
  abandonedBy?: Seat;
  rematchId?: string;
  /** Public board-tile metadata frozen while shopping so enhancement purchases stay hidden until both are Ready. */
  frozenTiles?: StoryTile[];
}

type Result = { match: MatchState } | { error: string };
const prefix = (seat: Seat) => (seat === 0 ? "a:" : "b:");

function freshPlayerState(seat: Seat): StoryState {
  const tiles: StoryTile[] = buildTiles().map((t) => ({ ...t, id: prefix(seat) + t.id }));
  return startPage({
    version: 1, runId: crypto.randomUUID(), endlessPensUnlocked: true, pageIndex: 0, coins: 0, tiles,
    letterUpgrades: {}, wordLengthUpgrades: {}, pens: [], upgrades: [], totalInk: 0, bestWord: null,
    phase: "play", offers: null, pagesCompleted: 0, completedPages: [],
  }, 0);
}

export function createMatch(userId: string, name: string): MatchState {
  return {
    v: 1, phase: "lobby", pageIndex: 0, board: [], usedPremiums: [], turn: 0, starter: 0, tiebreaks: 0, offers: null,
    players: [{ userId, name, state: freshPlayerState(0), ready: false, wins: 0, bestPageInk: 0 }, null],
  };
}

function beginPage(m: MatchState, pageIndex: number, starter: Seat): MatchState {
  const config = getPage(pageIndex);
  const players = m.players.map((p) => {
    if (!p) return p;
    const state = startPage({ ...p.state, completedPages: [] }, pageIndex);
    // Equal opportunities: identical word and discard counts for both players.
    state.page = { ...state.page, wordsLeft: config.words, discardsLeft: MP_DISCARDS };
    return { ...p, state, ready: false };
  }) as MatchState["players"];
  return { ...m, phase: "play", pageIndex, board: Array(config.size * config.size).fill(null), usedPremiums: [], turn: starter, starter, tiebreaks: 0, offers: null, players };
}

export function joinMatch(m: MatchState, userId: string, name: string, random = Math.random): Result {
  if (m.phase === "cancelled") return { error: "This invitation was cancelled." };
  if (m.players[0].userId === userId) return { error: "You can't join your own invitation." };
  if (m.players[1]) return { error: m.players[1].userId === userId ? "You already joined." : "This match is already full." };
  const seated: MatchState = { ...m, players: [m.players[0], { userId, name, state: freshPlayerState(1), ready: false, wins: 0, bestPageInk: 0 }] };
  return { match: beginPage(seated, 0, random() < 0.5 ? 0 : 1) };
}

/** Fresh match between the same two users, used for rematches. */
export function rematch(a: { userId: string; name: string }, b: { userId: string; name: string }, random = Math.random): MatchState {
  const r = joinMatch(createMatch(a.userId, a.name), b.userId, b.name, random);
  if ("error" in r) throw new Error(r.error);
  return r.match;
}

function withPlayer(m: MatchState, seat: Seat, player: MatchPlayer): MatchState {
  const players = [...m.players] as MatchState["players"];
  players[seat] = player;
  return { ...m, players };
}

function turnCheck(m: MatchState, seat: Seat): string | null {
  if (m.phase !== "play") return "The Page isn't in play.";
  if (!m.players[1]) return "Waiting for an opponent.";
  if (m.turn !== seat) return "It's not your turn.";
  if (m.players[seat]!.state.page.wordsLeft <= 0) return "No words left this Page.";
  return null;
}

function advance(m: MatchState, seat: Seat): MatchState {
  const other = (1 - seat) as Seat;
  if (m.players[other]!.state.page.wordsLeft > 0) return { ...m, turn: other };
  if (m.players[seat]!.state.page.wordsLeft > 0) return { ...m, turn: seat };
  return resolvePage(m);
}

export function mpPageCoins(pageIndex: number, won: boolean, myInk: number, theirInk: number, upgrades: string[]): number {
  const base = getPage(pageIndex).coins;
  const result = won ? 3 : 2;
  const dominant = won && myInk > 0 && (theirInk === 0 || myInk * 2 >= theirInk * 3) ? 1 : 0;
  const payday = upgrades.includes("golden-payday") ? GOLDEN_PAYDAY_BONUS : 0;
  return base + result + dominant + payday;
}

/** Offers generated once from a neutral build so both players see identical shelves. */
export function mpOffers(pageIndex: number, random = Math.random): Offer[] {
  const restore = Math.random;
  Math.random = random;
  try {
    const neutral = { tiles: buildTiles(), pens: [], upgrades: [], pageIndex, endless: false, endlessPensUnlocked: true };
    const offers = generateOffers(neutral);
    const allowed = UPGRADES.filter((u) => !u.chapter && !MP_EXCLUDED_UPGRADES.has(u.id));
    return offers.map((o) => (o.kind === "upgrade" && MP_EXCLUDED_UPGRADES.has(o.upgradeId)
      ? (() => { const u = allowed[Math.floor(random() * allowed.length)]!; return { kind: "upgrade" as const, upgradeId: u.id, price: u.price, sold: false }; })()
      : o));
  } finally {
    Math.random = restore;
  }
}

function resolvePage(m: MatchState): MatchState {
  const [p0, p1] = m.players as [MatchPlayer, MatchPlayer];
  const ink: [number, number] = [p0.state.page.ink, p1.state.page.ink];
  if (ink[0] === ink[1]) {
    // Tie-breaker: one extra word each; a crowded board is replaced while scores carry forward.
    const filled = m.board.filter(Boolean).length;
    const fresh = filled > m.board.length * 0.6;
    const players = m.players.map((p) => p && { ...p, state: { ...p.state, page: { ...p.state.page, wordsLeft: 1 } } }) as MatchState["players"];
    return { ...m, players, tiebreaks: m.tiebreaks + 1, turn: m.starter,
      board: fresh ? Array(m.board.length).fill(null) : m.board, usedPremiums: fresh ? [] : m.usedPremiums };
  }
  const winner: Seat = ink[0] > ink[1] ? 0 : 1;
  const coins: [number, number] = [
    mpPageCoins(m.pageIndex, winner === 0, ink[0], ink[1], p0.state.upgrades),
    mpPageCoins(m.pageIndex, winner === 1, ink[1], ink[0], p1.state.upgrades),
  ];
  const finished = (winner === 0 ? p0.wins : p1.wins) + 1 >= WINS_NEEDED;
  const offers = finished ? null : mpOffers(m.pageIndex);
  const players = [p0, p1].map((p, i) => ({
    ...p,
    wins: p.wins + (i === winner ? 1 : 0),
    bestPageInk: Math.max(p.bestPageInk, ink[i]!),
    ready: false,
    state: { ...p.state, coins: p.state.coins + coins[i]!, pagesCompleted: p.state.pagesCompleted + 1,
      phase: finished ? (i === winner ? "victory" : "defeat") : "bookstore", offers: offers && offers.map((o) => ({ ...o })) } as StoryState,
  })) as MatchState["players"];
  return { ...m, players, phase: finished ? "finished" : "bookstore", offers, frozenTiles: publicTiles(m),
    lastPage: { pageIndex: m.pageIndex, ink, winner, coins }, ...(finished ? { winner } : {}) };
}

export function playMove(m: MatchState, seat: Seat, placements: PendingPlacement[], isWord: (w: string) => boolean): Result {
  const problem = turnCheck(m, seat);
  if (problem) return { error: problem };
  const me = m.players[seat]!;
  const opponent = m.players[(1 - seat) as Seat]!;
  const rack = new Set(me.state.page.rack);
  const own = new Map(me.state.tiles.map((t) => [t.id, t]));
  if (!placements.length) return { error: "Place at least one letter." };
  if (new Set(placements.map((p) => p.tileId)).size !== placements.length) return { error: "Each letter can only be used once." };
  for (const p of placements) {
    const tile = own.get(p.tileId);
    if (!tile || !rack.has(p.tileId)) return { error: "That letter isn't on your rack." };
    const blank = tile.letter === "?";
    if (blank !== !!p.blank || (!blank && tile.letter !== p.letter) || !/^[A-Z]$/.test(p.letter)) return { error: "Invalid letter." };
  }
  // Opponent tiles already on the board keep their own enhancements when reused.
  const scoringState: StoryState = { ...me.state, tiles: [...me.state.tiles, ...opponent.state.tiles],
    page: { ...me.state.page, board: m.board, usedPremiums: m.usedPremiums } };
  const r = playPlacement(scoringState, placements, isWord);
  if ("error" in r) return r;
  const state: StoryState = { ...me.state, pens: r.state.pens, totalInk: r.state.totalInk, bestWord: r.state.bestWord,
    page: { ...r.state.page }, phase: "play", offers: null };
  const next: MatchState = { ...withPlayer(m, seat, { ...me, state }), board: r.state.page.board, usedPremiums: r.state.page.usedPremiums,
    lastMove: { id: (m.lastMove?.id ?? 0) + 1, seat, words: r.score.words.map((w) => w.word), ink: r.score.totalInk, events: r.score.events } };
  return { match: advance(next, seat) };
}

export function passTurn(m: MatchState, seat: Seat): Result {
  const problem = turnCheck(m, seat);
  if (problem) return { error: problem };
  const me = m.players[seat]!;
  const state = { ...me.state, page: { ...me.state.page, wordsLeft: me.state.page.wordsLeft - 1 } };
  return { match: advance({ ...withPlayer(m, seat, { ...me, state }), lastMove: { id: (m.lastMove?.id ?? 0) + 1, seat, words: [], ink: 0, pass: true } }, seat) };
}

export function discard(m: MatchState, seat: Seat, tileIds: string[]): Result {
  const problem = turnCheck(m, seat);
  if (problem) return { error: problem };
  const me = m.players[seat]!;
  if (tileIds.some((id) => !me.state.page.rack.includes(id))) return { error: "That letter isn't on your rack." };
  const state = discardTiles(me.state, [...new Set(tileIds)]);
  if ("error" in state) return state;
  return { match: withPlayer(m, seat, { ...me, state }) };
}

function shopCheck(m: MatchState, seat: Seat): string | null {
  if (m.phase !== "bookstore") return "The Bookstore is closed.";
  if (m.players[seat]!.ready) return "You're already Ready.";
  return null;
}

export function buy(m: MatchState, seat: Seat, offerIndex: number, letter?: string): Result {
  const problem = shopCheck(m, seat);
  if (problem) return { error: problem };
  const me = m.players[seat]!;
  const offer = me.state.offers?.[offerIndex];
  if (offer?.kind === "pen" && me.state.pens.some((p) => p.penId === offer.penId)) return { error: "You already own that Pen." };
  if (offer?.kind === "upgrade" && MP_EXCLUDED_UPGRADES.has(offer.upgradeId)) return { error: "Not available in multiplayer." };
  if (offer?.kind === "enhancement" && !letter) return { error: "Choose a letter to enhance." };
  const r = buyOffer(me.state, offerIndex, letter);
  if ("error" in r) return r;
  if ("needsLetter" in r) return { error: "Choose a letter to enhance." };
  return { match: withPlayer(m, seat, { ...me, state: r }) };
}

export function sell(m: MatchState, seat: Seat, penId: string): Result {
  const problem = shopCheck(m, seat);
  if (problem) return { error: problem };
  const me = m.players[seat]!;
  if (!me.state.pens.some((p) => p.penId === penId)) return { error: "You don't own that Pen." };
  return { match: withPlayer(m, seat, { ...me, state: sellPen(me.state, penId) }) };
}

export function reorderPens(m: MatchState, seat: Seat, order: string[]): Result {
  if (m.phase !== "play" && m.phase !== "bookstore") return { error: "Pens can't be reordered now." };
  const me = m.players[seat];
  if (!me) return { error: "Invalid order." };
  const owned = me.state.pens.map((p) => p.penId);
  // Must be an exact permutation: unique IDs, all owned, none missing (no duplicating Pens).
  if (order.length !== owned.length || new Set(order).size !== order.length || order.some((id) => !owned.includes(id))) return { error: "Invalid order." };
  const pens = order.map((id) => me.state.pens.find((p) => p.penId === id)!);
  return { match: withPlayer(m, seat, { ...me, state: { ...me.state, pens } }) };
}

export function setReady(m: MatchState, seat: Seat): Result {
  const problem = shopCheck(m, seat);
  if (problem) return { error: problem };
  const next = withPlayer(m, seat, { ...m.players[seat]!, ready: true });
  if (!next.players.every((p) => p?.ready)) return { match: next };
  return { match: beginPage(next, m.pageIndex + 1, (1 - m.starter) as Seat) };
}

export function abandon(m: MatchState, seat: Seat): Result {
  if (m.phase === "finished" || m.phase === "cancelled") return { error: "This match is already over." };
  if (m.phase === "lobby") return { match: { ...m, phase: "cancelled" } };
  return { match: { ...m, phase: "finished", winner: (1 - seat) as Seat, abandonedBy: seat } };
}

export function seatOf(m: MatchState, userId: string): Seat | null {
  if (m.players[0].userId === userId) return 0;
  if (m.players[1]?.userId === userId) return 1;
  return null;
}

export function statusOf(m: MatchState): "waiting" | "active" | "finished" | "cancelled" {
  return m.phase === "lobby" ? "waiting" : m.phase === "finished" ? "finished" : m.phase === "cancelled" ? "cancelled" : "active";
}

function publicTiles(m: MatchState): StoryTile[] {
  const onBoard = new Set(m.board.filter(Boolean).map((b) => b!.tileId));
  return m.players.flatMap((p) => p?.state.tiles.filter((t) => onBoard.has(t.id)) ?? []);
}

/** Shared, non-secret view: no racks, bags, purchases or Pens. */
export function publicView(m: MatchState) {
  const boardTiles = m.phase === "bookstore" && m.frozenTiles ? m.frozenTiles : publicTiles(m);
  return {
    phase: m.phase, pageIndex: m.pageIndex, board: m.board, usedPremiums: m.usedPremiums, boardTiles,
    turn: m.turn, tiebreaks: m.tiebreaks, lastPage: m.lastPage ?? null, lastMove: m.lastMove ?? null,
    winner: m.winner ?? null, abandonedBy: m.abandonedBy ?? null, rematchId: m.rematchId ?? null,
    players: m.players.map((p) => p && { userId: p.userId, name: p.name, ink: p.state.page.ink, wordsLeft: p.state.page.wordsLeft,
      wins: p.wins, totalInk: p.state.totalInk, ready: p.ready, bestPageInk: p.bestPageInk }),
  };
}
export type PublicMatch = ReturnType<typeof publicView>;

/** The caller's own private state; the bag order stays secret. */
export function privateView(m: MatchState, seat: Seat): { state: StoryState; bagCount: number } | null {
  const p = m.players[seat];
  if (!p) return null;
  return { state: { ...p.state, page: { ...p.state.page, bag: [] } }, bagCount: p.state.page.bag.length };
}
