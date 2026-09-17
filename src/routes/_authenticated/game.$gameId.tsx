import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shuffle, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import {
  ConflictError,
  displayNameOf,
  fetchGame,
  isAdmin,
  joinGame,
  saveState,
  type GameRow,
} from "@/lib/games";
import { isNaughtyWord, loadWordList } from "@/lib/words";
import {
  LETTER_VALUES,
  RACK_SIZE,
  draw,
  removeFromRack,
  validateMove,
  type GameState,
  type Placement,
} from "@/lib/scrabble";
import { GameBoard } from "@/components/scrabble/Board";
import { LetterPool } from "@/components/scrabble/LetterPool";
import { Rack } from "@/components/scrabble/Rack";
import { Fireworks } from "@/components/scrabble/Fireworks";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/game/$gameId")({
  head: () => ({
    meta: [
      { title: "Game — Tile Table" },
      { name: "description", content: "A game of Scrabble in progress on Tile Table." },
      { property: "og:title", content: "Game — Tile Table" },
      { property: "og:description", content: "A game of Scrabble in progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GamePage,
});

function shuffleTiles(tiles: string[]) {
  const copy = [...tiles];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function GamePage() {
  const { gameId } = useParams({ from: "/_authenticated/game/$gameId" });
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pending, setPending] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeSelection, setExchangeSelection] = useState<number[]>([]);
  const [words, setWords] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGame(gameId),
  });
  const game = gameQuery.data ?? null;

  const adminQuery = useQuery({
    queryKey: ["admin", user?.id],
    queryFn: () => isAdmin(user!.id),
    enabled: Boolean(user?.id),
  });
  const admin = adminQuery.data === true;

  useEffect(() => {
    loadWordList()
      .then(setWords)
      .catch(() => toast.error("Couldn't load the word list. Refresh to try again."));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          queryClient.setQueryData(["game", gameId], payload.new as unknown as GameRow);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);

  const state = game?.state ?? null;
  const myIndex: 0 | 1 | null = !game || !user
    ? null
    : game.player1 === user.id
      ? 0
      : game.player2 === user.id
        ? 1
        : null;

  const activeSeat: 0 | 1 | null = useMemo(() => {
    if (!game || !state || myIndex === null) return null;
    if (game.solo) return state.turn;
    return myIndex;
  }, [game, state, myIndex]);

  const [celebrate, setCelebrate] = useState(0);
  const [birdVisible, setBirdVisible] = useState(false);
  const seenHistoryRef = useRef<number | null>(null);

  const historyLength = state?.history.length ?? 0;
  useEffect(() => {
    if (seenHistoryRef.current === null) {
      seenHistoryRef.current = historyLength;
      return;
    }
    if (historyLength > seenHistoryRef.current) {
      seenHistoryRef.current = historyLength;
      setBirdVisible(true);
    }
  }, [historyLength]);

  const pickPhase = state?.pick ?? null;
  const myPick = Boolean(
    pickPhase && activeSeat !== null && pickPhase.seat === activeSeat && game?.status === "active",
  );

  const isMyTurn = Boolean(
    state &&
      !pickPhase &&
      activeSeat !== null &&
      state.turn === activeSeat &&
      game?.status === "active",
  );

  // tiles can be tried out on the board at any time; only submitting needs your turn
  const canPlace = Boolean(
    state && !pickPhase && activeSeat !== null && game?.status === "active",
  );

  const rack = state && activeSeat !== null ? (state.racks[activeSeat] ?? []) : [];
  const remainingRack = useMemo(() => {
    const copy = [...rack];
    for (const placement of pending) {
      const wanted = placement.blank ? "?" : placement.letter;
      const at = copy.indexOf(wanted);
      if (at !== -1) copy.splice(at, 1);
    }
    return copy;
  }, [rack, pending]);

  const preview = useMemo(() => {
    if (!state || pending.length === 0 || !words) return null;
    const result = validateMove(state.board, pending, (word) => words.has(word), isNaughtyWord);
    const anchor = pending[pending.length - 1]!.index;
    return "error" in result
      ? { valid: false, score: 0, anchor, naughty: false, indices: [] as number[] }
      : {
          valid: true,
          score: result.score,
          anchor,
          naughty: result.naughtyIndices.length > 0,
          indices: result.naughtyIndices,
        };
  }, [state, pending, words]);

  // if the other player takes a square you were trying out, drop that trial tile
  useEffect(() => {
    if (!state || pending.length === 0) return;
    const clashes = pending.filter((placement) => state.board[placement.index]);
    if (clashes.length === 0) return;
    setPending((current) => current.filter((placement) => !state.board[placement.index]));
    toast.message("Some of your practice tiles were on squares the other player just used.");
  }, [state, pending]);


  // --- drag and drop -------------------------------------------------------
  type DragSource = { type: "rack"; position: number } | { type: "board"; index: number };
  const [drag, setDrag] = useState<
    { letter: string; blank: boolean; source: DragSource; x: number; y: number } | null
  >(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const cellUnder = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = element?.closest("[data-cell-index]") as HTMLElement | null;
    if (!cell) return null;
    const value = Number(cell.dataset['cellIndex']);
    return Number.isNaN(value) ? null : value;
  };

  function beginDrag(event: React.PointerEvent, letter: string, blank: boolean, source: DragSource) {
    if (!canPlace || exchangeMode || saving) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    movedRef.current = false;

    const onMove = (moveEvent: PointerEvent) => {
      const origin = dragStart.current;
      if (!origin) return;
      if (!movedRef.current) {
        if (Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) < 6) return;
        movedRef.current = true;
      }
      moveEvent.preventDefault();
      setDrag({ letter, blank, source, x: moveEvent.clientX, y: moveEvent.clientY });
      setHoverIndex(cellUnder(moveEvent.clientX, moveEvent.clientY));
    };

    const onUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const wasDragging = movedRef.current;
      dragStart.current = null;
      movedRef.current = false;
      setDrag(null);
      setHoverIndex(null);
      if (wasDragging) dropTile(letter, blank, source, upEvent.clientX, upEvent.clientY);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function dropTile(letter: string, blank: boolean, source: DragSource, x: number, y: number) {
    if (!state) return;
    const target = cellUnder(x, y);
    const withoutSource =
      source.type === "board" ? pending.filter((item) => item.index !== source.index) : pending;

    if (target === null) {
      if (source.type === "board") setPending(withoutSource);
      return;
    }
    if (state.board[target] || withoutSource.some((item) => item.index === target)) return;

    if (source.type === "board") {
      setPending([...withoutSource, { index: target, letter, blank }]);
      setSelected(null);
      return;
    }

    if (letter === "?") {
      const input = window.prompt("Which letter should this blank tile be?")?.trim().toUpperCase();
      if (!input || !/^[A-Z]$/.test(input)) return;
      setPending([...pending, { index: target, letter: input, blank: true }]);
    } else {
      setPending([...pending, { index: target, letter, blank: false }]);
    }
    setSelected(null);
  }

  function handleRackPointerDown(position: number, event: React.PointerEvent) {
    const letter = (exchangeMode ? rack : remainingRack)[position];
    if (!letter) return;
    beginDrag(event, letter, letter === "?", { type: "rack", position });
  }

  function handleBoardTilePointerDown(index: number, event: React.PointerEvent) {
    const placement = pending.find((item) => item.index === index);
    if (!placement) return;
    beginDrag(event, placement.letter, placement.blank, { type: "board", index });
  }

  const draggingRackPosition = drag?.source.type === "rack" ? drag.source.position : null;
  const draggingBoardIndex = drag?.source.type === "board" ? drag.source.index : null;


  const persist = useCallback(
    async (next: GameState, status: string, expectedVersion?: number | null) => {
      setSaving(true);
      try {
        const saved = await saveState(gameId, next, status, expectedVersion);
        queryClient.setQueryData(["game", gameId], (old: GameRow | null | undefined) =>
          old ? { ...old, state: saved, status } : old,
        );
      } catch (error) {
        if (error instanceof ConflictError) {
          toast.error("The other player moved first — the board has been refreshed.");
        } else {
          toast.error("Couldn't save that move. Please try again.");
        }
        gameQuery.refetch();
      } finally {
        setSaving(false);
      }
    },
    [gameId, queryClient, gameQuery],
  );

  function handleCellClick(index: number) {
    if (!state || !canPlace) return;
    const existing = pending.find((placement) => placement.index === index);
    if (existing) {
      setPending(pending.filter((placement) => placement.index !== index));
      return;
    }
    if (state.board[index]) return;
    if (selected === null) {
      toast.message("Pick a tile from your rack first.");
      return;
    }
    const letter = remainingRack[selected];
    if (!letter) return;
    if (letter === "?") {
      const input = window.prompt("Which letter should this blank tile be?")?.trim().toUpperCase();
      if (!input || !/^[A-Z]$/.test(input)) return;
      setPending([...pending, { index, letter: input, blank: true }]);
    } else {
      setPending([...pending, { index, letter, blank: false }]);
    }
    setSelected(null);
  }

  function handleRackSelect(position: number) {
    if (exchangeMode) {
      setExchangeSelection((current) =>
        current.includes(position)
          ? current.filter((value) => value !== position)
          : [...current, position],
      );
      return;
    }
    setSelected((current) => (current === position ? null : position));
  }

  function finishIfDone(next: GameState, seat: 0 | 1): { state: GameState; status: string } {
    if (next.bag.length === 0 && next.racks[seat].length === 0) {
      const other = seat === 0 ? 1 : 0;
      const leftover = next.racks[other].reduce(
        (sum, letter) => sum + (LETTER_VALUES[letter] ?? 0),
        0,
      );
      next.scores[seat] += leftover;
      next.scores[other] -= leftover;
      next.finished = true;
      next.history = [
        ...next.history,
        { player: seat, description: "played out — leftover tiles counted", score: leftover },
      ];
      return { state: next, status: "finished" };
    }
    return { state: next, status: "active" };
  }

  async function playMove() {
    if (!state || !game || activeSeat === null || !words) return;
    if (pending.length === 0) {
      toast.message("Place some tiles on the board first.");
      return;
    }
    const result = validateMove(state.board, pending, (word) => words.has(word), isNaughtyWord);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const nextRack = removeFromRack(state.racks[activeSeat], pending);
    if (!nextRack) {
      toast.error("Those tiles aren't on your rack.");
      return;
    }

    const naughtyIndices = new Set(result.naughtyIndices);
    const board = [...state.board];
    for (const placement of pending) {
      board[placement.index] = {
        letter: placement.letter,
        blank: placement.blank,
        player: activeSeat,
        ...(naughtyIndices.has(placement.index) ? { naughty: true } : {}),
      };
    }
    // existing tiles that became part of a rude word keep the pink outline too
    for (const index of naughtyIndices) {
      const tile = board[index];
      if (tile && !tile.naughty) board[index] = { ...tile, naughty: true };
    }
    // three tiles or more earns one free choice from the pool before the rest refill
    const earnsPick = !game.solo && pending.length >= 3 && state.bag.length > 0;
    const refilled = earnsPick ? { bag: state.bag, rack: nextRack } : draw(state.bag, nextRack);
    const racks: [string[], string[]] = [...state.racks] as [string[], string[]];
    racks[activeSeat] = refilled.rack;

    const scores: [number, number] = [...state.scores] as [number, number];
    scores[activeSeat] += result.score;

    const next: GameState = {
      ...state,
      board,
      bag: refilled.bag,
      racks,
      scores,
      turn: earnsPick ? activeSeat : activeSeat === 0 ? 1 : 0,
      pick: earnsPick ? { kind: "bonus", seat: activeSeat } : null,
      consecutivePasses: 0,
      lastPlayed: pending.map((placement) => placement.index),
      history: [
        ...state.history,
        {
          player: activeSeat,
          description:
            result.words
              .map((entry) => (entry.naughty ? `${entry.word} (2×)` : entry.word))
              .join(", ") + (result.bingo ? " (bingo!)" : ""),
          score: result.score,
        },
      ],
    };

    const finished = finishIfDone(next, activeSeat);
    setPending([]);
    setSelected(null);
    await persist(finished.state, finished.status, state.version ?? null);
    setCelebrate((n) => n + 1);
    const doubled = result.words.some((entry) => entry.naughty);
    toast.success(doubled ? `${result.score} points — double for a rude word!` : `${result.score} points`);
  }

  async function pass() {
    if (!state || activeSeat === null) return;
    const passes = state.consecutivePasses + 1;
    const next: GameState = {
      ...state,
      turn: activeSeat === 0 ? 1 : 0,
      consecutivePasses: passes,
      finished: passes >= 4,
      history: [...state.history, { player: activeSeat, description: "passed", score: 0 }],
    };
    setPending([]);
    await persist(next, passes >= 4 ? "finished" : "active", state.version ?? null);
  }

  async function exchange() {
    if (!state || activeSeat === null) return;
    if (exchangeSelection.length === 0) {
      toast.message("Tap the tiles you want to swap.");
      return;
    }
    if (state.bag.length < exchangeSelection.length) {
      toast.error("Not enough tiles left in the bag to swap.");
      return;
    }
    const current = state.racks[activeSeat];
    const kept = current.filter((_, position) => !exchangeSelection.includes(position));
    const returned = current.filter((_, position) => exchangeSelection.includes(position));
    const bag = shuffleTiles([...state.bag, ...returned]);
    const refilled = draw(bag, kept);
    const racks: [string[], string[]] = [...state.racks] as [string[], string[]];
    racks[activeSeat] = refilled.rack;

    const next: GameState = {
      ...state,
      bag: refilled.bag,
      racks,
      turn: activeSeat === 0 ? 1 : 0,
      consecutivePasses: state.consecutivePasses + 1,
      history: [
        ...state.history,
        { player: activeSeat, description: `swapped ${returned.length} tiles`, score: 0 },
      ],
    };
    setExchangeMode(false);
    setExchangeSelection([]);
    setPending([]);
    await persist(next, "active", state.version ?? null);
  }

  async function handleShuffle() {
    if (!state || activeSeat === null || saving) return;
    const racks: [string[], string[]] = [...state.racks] as [string[], string[]];
    racks[activeSeat] = shuffleTiles(racks[activeSeat]);
    const next: GameState = { ...state, racks };
    await persist(next, game?.status ?? "active", state.version ?? null);
  }

  async function pickLetter(letter: string) {
    if (!state || !game || activeSeat === null || saving) return;
    const phase = state.pick;
    if (!phase || phase.seat !== activeSeat || game.status !== "active") return;

    const bag = [...state.bag];
    const at = bag.indexOf(letter);
    if (at === -1) return;
    bag.splice(at, 1);
    const racks: [string[], string[]] = [...state.racks] as [string[], string[]];
    racks[phase.seat] = [...racks[phase.seat], letter];

    let next: GameState;
    if (phase.kind === "draft") {
      const other: 0 | 1 = phase.seat === 0 ? 1 : 0;
      const done = racks[0].length >= RACK_SIZE && racks[1].length >= RACK_SIZE;
      const nextSeat: 0 | 1 = racks[other].length < RACK_SIZE ? other : phase.seat;
      const first: 0 | 1 = phase.first ?? 0;
      next = {
        ...state,
        bag,
        racks,
        pick: done ? null : { ...phase, seat: nextSeat },
        turn: done ? first : state.turn,
      };
    } else {
      // the free pick lands first, then the rack tops up at random as usual
      const refilled = draw(bag, racks[phase.seat]);
      racks[phase.seat] = refilled.rack;
      next = {
        ...state,
        bag: refilled.bag,
        racks,
        pick: null,
        turn: phase.seat === 0 ? 1 : 0,
      };
    }
    await persist(next, game.status, state.version ?? null);
  }

  async function resign() {
    if (!state || !game || activeSeat === null || saving) return;
    if (game.status !== "active") return;
    const message = game.solo
      ? "End this practice game? It will be marked as finished."
      : "Give up this game? It will count as a loss for you.";
    if (!window.confirm(message)) return;
    const next: GameState = {
      ...state,
      finished: true,
      resignedBy: game.solo ? undefined : activeSeat,
      history: [
        ...state.history,
        {
          player: activeSeat,
          description: game.solo ? "ended the game" : "gave up 🏳️",
          score: 0,
        },
      ],
    };
    setPending([]);
    await persist(next, "finished", state.version ?? null);
  }

  async function undoLastWord() {
    if (!state || !game || saving) return;
    const indices = (state.lastPlayed ?? []).filter((index) => state.board[index]);
    const entry = state.history[state.history.length - 1] ?? null;
    if (indices.length === 0 || !entry) {
      toast.message("There's no played word to take back.");
      return;
    }
    const seat = state.board[indices[0]!]!.player;
    if (!window.confirm(`Take back ${names[seat]}'s last word (${entry.description})?`)) return;

    const board = [...state.board];
    const returned: string[] = [];
    for (const index of indices) {
      const tile = board[index]!;
      returned.push(tile.blank ? "?" : tile.letter);
      board[index] = null;
    }

    // the mover's rack was topped up after the move: put those draws back in the
    // bag so the rack ends up the size it was before the word was played
    const rack = [...state.racks[seat]];
    const drawnBack = rack.splice(Math.max(0, rack.length - returned.length), returned.length);
    const racks: [string[], string[]] = [...state.racks] as [string[], string[]];
    racks[seat] = [...returned, ...rack];

    const scores: [number, number] = [...state.scores] as [number, number];
    scores[seat] -= entry.score;

    const next: GameState = {
      ...state,
      board,
      bag: shuffleTiles([...state.bag, ...drawnBack]),
      racks,
      scores,
      turn: seat,
      pick: null,
      finished: false,
      resignedBy: undefined,
      consecutivePasses: 0,
      lastPlayed: [],
      history: state.history.slice(0, -1),
    };
    setPending([]);
    setSelected(null);
    await persist(next, "active", state.version ?? null);
    toast.success("Last word taken back.");
  }

  async function join() {
    if (!user) return;
    const joined = await joinGame(gameId, user.id, displayNameOf(user));
    if (!joined) {
      toast.error("Someone already joined this game.");
      return;
    }
    queryClient.setQueryData(["game", gameId], joined);
    toast.success("You're in — good luck!");
  }

  function copyLink() {
    const url = `${window.location.origin}/game/${gameId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Invite link copied"))
      .catch(() => toast.error("Couldn't copy the link."));
  }

  if (gameQuery.isLoading) {
    return <main className="p-10 text-center text-sm text-muted-foreground">Loading game…</main>;
  }

  if (!game || !state) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">This game isn't available</h1>
        <p className="text-sm text-muted-foreground">
          The link may be wrong, or the game already has two players.
        </p>
        <Button onClick={() => navigate({ to: "/lobby" })}>Back to your games</Button>
      </main>
    );
  }

  if (myIndex === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">{game.player1_name} invited you to play</h1>
        <p className="text-sm text-muted-foreground">Join and the board is yours.</p>
        <Button size="lg" onClick={join}>
          Join this game
        </Button>
      </main>
    );
  }

  const names: [string, string] = [game.player1_name, game.player2 ? game.player2_name : "Waiting…"];
  const lastEntry = state.history[state.history.length - 1] ?? null;
  const waiting = game.status === "waiting";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/lobby" className="text-sm text-muted-foreground hover:text-foreground">
          ← Your games
        </Link>
        <div className="flex flex-wrap gap-2">
          {!game.solo ? (
            <Button variant="secondary" size="sm" onClick={copyLink}>
              Copy invite link
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Fireworks trigger={celebrate} />
          {birdVisible ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
              role="dialog"
              aria-label="A round was played"
              onClick={() => setBirdVisible(false)}
            >
              <div
                className="animate-in zoom-in duration-200 relative flex flex-col items-center gap-4 rounded-2xl bg-card p-8 shadow-panel"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="text-[7rem] leading-none" aria-hidden>
                  🖕
                </span>
                <Button variant="secondary" onClick={() => setBirdVisible(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
          {pickPhase && game.status === "active" ? (
            <LetterPool
              bag={state.bag}
              canPick={myPick}
              disabled={saving}
              title={pickPhase.kind === "draft" ? "Choose your tiles" : "Bonus pick"}
              subtitle={
                myPick
                  ? pickPhase.kind === "draft"
                    ? `Your pick — tap a letter (${state.racks[activeSeat ?? 0]?.length ?? 0} of ${RACK_SIZE}).`
                    : "You played three or more tiles — choose one letter, the rest come at random."
                  : `Waiting for ${names[pickPhase.seat]} to choose a letter.`
              }
              onPick={pickLetter}
            />
          ) : null}
          <GameBoard
            board={state.board}
            pending={pending}
            lastPlayed={state.lastPlayed ?? []}
            preview={preview}
            hoverIndex={hoverIndex}
            draggingIndex={draggingBoardIndex}
            naughtyIndices={preview?.indices ?? []}
            onCellClick={handleCellClick}
            onTilePointerDown={handleBoardTilePointerDown}
          />

          <Rack
            tiles={exchangeMode ? rack : remainingRack}
            selected={selected}
            exchangeSelection={exchangeSelection}
            exchangeMode={exchangeMode}
            draggingPosition={draggingRackPosition}
            onSelect={handleRackSelect}
            onTilePointerDown={handleRackPointerDown}
          />


          <div className="flex flex-wrap gap-2">
            {exchangeMode ? (
              <>
                <Button onClick={exchange} disabled={saving}>
                  Swap {exchangeSelection.length} tiles
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setExchangeMode(false);
                    setExchangeSelection([]);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button onClick={playMove} disabled={!isMyTurn || saving || !words}>
                  {isMyTurn ? "Play word" : "Waiting for your turn"}
                </Button>
                <Button variant="secondary" onClick={() => setPending([])} disabled={!pending.length}>
                  Recall tiles
                </Button>
                <Button variant="secondary" onClick={pass} disabled={!isMyTurn || saving}>
                  Pass
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setExchangeMode(true)}
                  disabled={!isMyTurn || saving}
                >
                  Swap tiles
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleShuffle}
                  disabled={saving || exchangeMode}
                  className="gap-1.5"
                >
                  <Shuffle className="h-4 w-4" />
                  Shuffle
                </Button>
                <Button
                  variant="ghost"
                  onClick={resign}
                  disabled={saving}
                  className="text-destructive hover:text-destructive"
                >
                  {game.solo ? "End game" : "Give up"}
                </Button>
              </>
            )}
          </div>

          {!words ? (
            <p className="text-xs text-muted-foreground">Loading the word list…</p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-bold">
              {game.solo ? "Solo practice" : "Score"}
            </h2>
            {[0, 1].map((seat) => (
              <div
                key={seat}
                className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 ${
                  state.turn === seat && game.status === "active"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary"
                }`}
              >
                <span className="text-sm font-semibold">{names[seat]}</span>
                <span className="text-lg font-bold">{state.scores[seat]}</span>
              </div>
            ))}
            <p className="mt-3 text-xs text-muted-foreground">
              {game.status === "finished"
                ? state.resignedBy !== undefined
                  ? `${names[state.resignedBy]} gave up — game over.`
                  : "Game over."
                : waiting
                  ? "Waiting for the other player to open your link."
                  : pickPhase
                    ? myPick
                      ? "Choose a letter from the pool."
                      : `${names[pickPhase.seat]} is choosing a letter.`
                    : game.solo
                    ? `${names[state.turn]}'s move — you play both sides.`
                    : isMyTurn
                      ? "Your move."
                      : `Waiting for ${names[state.turn]}.`}
            </p>
            {lastEntry ? (
              <div className="mt-4 rounded-lg border border-border bg-secondary/60 p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                  Last score
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">{names[lastEntry.player]}</span>{" "}
                  {lastEntry.description}
                </p>
                <p className="text-lg font-bold">
                  {lastEntry.score} {lastEntry.score === 1 ? "point" : "points"}
                </p>
              </div>
            ) : null}
          </div>
          <p className="text-sm font-bold text-foreground">
            {state.bag.length} tiles left in the bag
          </p>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Moves
            </h3>
            <ol className="mt-3 space-y-2 text-sm">
              {state.history.length === 0 ? (
                <li className="text-muted-foreground">No moves yet.</li>
              ) : (
                [...state.history].reverse().map((entry, position) => (
                  <li key={position} className="flex justify-between gap-3">
                    <span className="truncate">
                      <span className="text-muted-foreground">{names[entry.player]}:</span>{" "}
                      {entry.description}
                    </span>
                    <span className="font-semibold">{entry.score}</span>
                  </li>
                ))
              )}
            </ol>
          </div>
        </aside>
      </div>

      {drag ? (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: drag.x, top: drag.y, transform: "translate(-50%, -50%)" }}
        >
          <div className="tile-face relative flex h-12 w-12 rotate-[-6deg] scale-125 items-center justify-center rounded-md text-xl font-bold shadow-2xl transition-transform">
            {drag.letter === "?" ? "" : drag.letter}
            <span className="absolute bottom-0.5 right-1 text-[0.6rem] font-semibold opacity-70">
              {drag.blank ? "" : LETTER_VALUES[drag.letter]}
            </span>
          </div>
        </div>
      ) : null}
    </main>
  );
}

