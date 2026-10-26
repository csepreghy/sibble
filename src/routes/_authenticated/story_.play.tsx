import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Coins,
  Home,
  Info,
  Layers,
  MoreVertical,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { loadWordList } from "@/lib/words";
import { LETTER_VALUES } from "@/lib/scrabble";
import { PAGES, TWIST_INFO, pageLabel } from "@/lib/story/boards";
import {
  buyOffer,
  continueToNextPage,
  discardTiles,
  newStory,
  playPlacement,
  sellPen,
} from "@/lib/story/engine";
import { validateStoryMove } from "@/lib/story/placement";
import { scorePlacement } from "@/lib/story/scoring";
import { loadStory, saveStory } from "@/lib/story/storage";
import { penSlots } from "@/lib/story/upgrades";
import type { PendingPlacement, PenInstance, StoryState, StoryTile } from "@/lib/story/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StoryBoard } from "@/components/story/StoryBoard";
import { StoryRack } from "@/components/story/StoryRack";
import { PenSidebar } from "@/components/story/PenSidebar";
import { Bookstore } from "@/components/story/Bookstore";
import {
  BagDialog,
  BlankPickerDialog,
  EnhancePickerDialog,
  PageIntroDialog,
  PenInspectDialog,
  RunInfoDialog,
  StoryEndDialog,
  TileInspectDialog,
} from "@/components/story/dialogs";

export const Route = createFileRoute("/_authenticated/story_/play")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Playing a Story — Sibble" },
      { name: "description", content: "Your singleplayer Sibble Story in progress." },
      { property: "og:title", content: "Playing a Story — Sibble" },
      { property: "og:description", content: "Your singleplayer Sibble Story in progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoryPlay,
});

interface AnimState {
  running: boolean;
  base: number;
  mult: number;
  /** amount just added to Base / Mult, shown next to the number */
  baseDelta: string | null;
  multDelta: string | null;
  activeIndex: number | null;
  activePenId: string | null;
  activeWord: number[] | null;
  label: string | null;
}

const IDLE_ANIM: AnimState = {
  running: false,
  base: 0,
  mult: 0,
  baseDelta: null,
  multDelta: null,
  activeIndex: null,
  activePenId: null,
  activeWord: null,
  label: null,
};

const STEP_MS = 750;

function fmtDelta(diff: number): string {
  const rounded = Math.round(diff);
  return rounded >= 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
}

function StoryPlay() {
  const navigate = useNavigate();
  const [story, setStory] = useState<StoryState | null>(() => loadStory());
  const [words, setWords] = useState<Set<string> | null>(null);
  const [pending, setPending] = useState<PendingPlacement[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [discardMode, setDiscardMode] = useState(false);
  const [discardSelection, setDiscardSelection] = useState<string[]>([]);
  const [anim, setAnim] = useState<AnimState>(IDLE_ANIM);
  const [introDismissed, setIntroDismissed] = useState(-1);
  const [dialog, setDialog] = useState<
    | { kind: "run-info" }
    | { kind: "bag" }
    | { kind: "tile"; tile: StoryTile }
    | { kind: "pen"; pen: PenInstance }
    | { kind: "blank"; index: number; tileId: string }
    | { kind: "enhance"; offerIndex: number; enhancement: string }
    | null
  >(null);
  const cancelAnim = useRef(false);

  // --- drag and drop (mirrors the multiplayer game) -------------------------
  type DragSource = { type: "rack"; tileId: string } | { type: "board"; index: number };
  const [drag, setDrag] = useState<{
    tileId: string;
    letter: string;
    blank: boolean;
    source: DragSource;
    x: number;
    y: number;
  } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const cellUnder = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = element?.closest("[data-cell-index]") as HTMLElement | null;
    if (!cell) return null;
    const value = Number(cell.dataset["cellIndex"]);
    return Number.isNaN(value) ? null : value;
  };

  useEffect(() => {
    loadWordList().then(setWords).catch(() => toast.error("Couldn't load the word list."));
  }, []);

  useEffect(() => {
    saveStory(story);
  }, [story]);

  useEffect(() => {
    cancelAnim.current = false;
    return () => {
      cancelAnim.current = true;
    };
  }, []);

  const config = story ? PAGES[story.pageIndex]! : null;
  const tileById = useMemo(
    () => new Map((story?.tiles ?? []).map((tile) => [tile.id, tile])),
    [story?.tiles],
  );

  // Live preview of the pending placement's Ink.
  const preview = useMemo(() => {
    if (!story || !config || !words || pending.length === 0) return null;
    const validated = validateStoryMove(story.page.board, config.size, pending, (w) => words.has(w));
    if ("error" in validated) return { error: validated.error };
    const score = scorePlacement({
      words: validated.words,
      size: config.size,
      board: story.page.board,
      pending,
      tiles: story.tiles,
      premiums: config.premiums,
      usedPremiums: story.page.usedPremiums,
      plotTwist: config.plotTwist,
      letterUpgrades: story.letterUpgrades,
      wordLengthUpgrades: story.wordLengthUpgrades,
      pens: story.pens,
      longestThisPage: story.page.longestWord,
    });
    return { ink: score.totalInk, words: validated.words.length };
  }, [story, config, words, pending]);

  if (!story || !config) {
    // No saved run — back to the intro.
    navigate({ to: "/story" });
    return null;
  }

  const rackTiles = story.page.rack.map((id) => tileById.get(id)!).filter(Boolean);
  const twist = config.plotTwist ? TWIST_INFO[config.plotTwist] : null;
  const busy = anim.running;

  function handleCellClick(index: number) {
    if (!story || !config || busy || story.phase !== "play") return;
    const placedAt = pending.find((p) => p.index === index);
    if (placedAt) {
      // Take the tile back to the rack.
      setPending(pending.filter((p) => p.index !== index));
      return;
    }
    const committed = story.page.board[index];
    if (committed) {
      const tile = tileById.get(committed.tileId);
      if (tile) setDialog({ kind: "tile", tile });
      return;
    }
    if (!selectedRackId) return;
    const tile = tileById.get(selectedRackId);
    if (!tile) return;
    if (tile.letter === "?") {
      setDialog({ kind: "blank", index, tileId: tile.id });
      return;
    }
    setPending([...pending, { index, tileId: tile.id, letter: tile.letter, blank: false }]);
    setSelectedRackId(null);
  }

  function beginDrag(event: React.PointerEvent, tileId: string, letter: string, blank: boolean, source: DragSource) {
    if (busy || story?.phase !== "play" || discardMode) return;
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
      setDrag({ tileId, letter, blank, source, x: moveEvent.clientX, y: moveEvent.clientY });
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
      if (wasDragging) dropTile(tileId, letter, blank, source, upEvent.clientX, upEvent.clientY);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function dropTile(tileId: string, letter: string, blank: boolean, source: DragSource, x: number, y: number) {
    if (!story || story.phase !== "play") return;
    const target = cellUnder(x, y);
    const withoutSource =
      source.type === "board" ? pending.filter((item) => item.index !== source.index) : pending;

    if (target === null) {
      // Dropped off the board: a pending tile goes back to the rack.
      if (source.type === "board") setPending(withoutSource);
      return;
    }
    if (story.page.board[target] || withoutSource.some((item) => item.index === target)) return;

    if (source.type === "board") {
      setPending([...withoutSource, { index: target, tileId, letter, blank }]);
      return;
    }

    if (blank) {
      setDialog({ kind: "blank", index: target, tileId });
      return;
    }
    setPending([...pending, { index: target, tileId, letter, blank: false }]);
    setSelectedRackId(null);
  }

  function handleRackPointerDown(tileId: string, event: React.PointerEvent) {
    const tile = tileById.get(tileId);
    if (!tile) return;
    beginDrag(event, tile.id, tile.letter, tile.letter === "?", { type: "rack", tileId });
  }

  function handleBoardTilePointerDown(index: number, event: React.PointerEvent) {
    const placement = pending.find((item) => item.index === index);
    if (!placement) return;
    beginDrag(event, placement.tileId, placement.letter, placement.blank, { type: "board", index });
  }

  const draggingRackId = drag?.source.type === "rack" ? drag.source.tileId : null;
  const draggingBoardIndex = drag?.source.type === "board" ? drag.source.index : null;

  function handleRackSelect(tileId: string) {
    if (busy || !story || story.phase !== "play") return;
    if (discardMode) {
      const limit = story.upgrades.includes("flexible-fingers") ? 4 : 3;
      setDiscardSelection((current) =>
        current.includes(tileId)
          ? current.filter((id) => id !== tileId)
          : current.length < limit
            ? [...current, tileId]
            : current,
      );
      return;
    }
    // Tapping the already-selected tile opens its inspector.
    if (selectedRackId === tileId) {
      const tile = tileById.get(tileId);
      if (tile) setDialog({ kind: "tile", tile });
      return;
    }
    setSelectedRackId(tileId);
  }

  function shuffleRack() {
    if (!story || busy) return;
    const rack = [...story.page.rack];
    for (let i = rack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rack[i], rack[j]] = [rack[j]!, rack[i]!];
    }
    setStory({ ...story, page: { ...story.page, rack } });
  }

  function confirmDiscard() {
    if (!story) return;
    const result = discardTiles(story, discardSelection);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setStory(result);
    setDiscardSelection([]);
    setDiscardMode(false);
  }

  async function playWord() {
    if (!story || !config || !words || busy) return;
    const result = playPlacement(story, pending, (w) => words.has(w));
    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    // Animate the scoring step by step, then commit the new state.
    setAnim({ ...IDLE_ANIM, running: true });
    const delay = () => new Promise((resolve) => setTimeout(resolve, STEP_MS));
    for (const event of result.score.events) {
      if (cancelAnim.current) return;
      setAnim((current) => {
        const next = { ...current, running: true };
        switch (event.type) {
          case "word":
            next.activeWord = event.indices;
            next.base = 0;
            next.mult = 0;
            next.label = event.word;
            break;
          case "letter":
            next.activeIndex = event.index;
            next.base = event.runningBase;
            next.label = null;
            break;
          case "letter-mult":
            next.activeIndex = event.index;
            next.base = event.runningBase;
            next.label = event.label;
            break;
          case "pen-base":
            next.activePenId = event.penId;
            next.base = event.runningBase;
            next.label = event.text;
            break;
          case "twist":
            next.base = event.runningBase;
            next.label = event.text;
            break;
          case "mult-init":
            next.mult = event.value;
            next.activeIndex = null;
            next.label = null;
            break;
          case "pen-mult":
            next.activePenId = event.penId;
            next.mult = event.runningMult;
            next.label = event.text;
            break;
          case "word-mult":
            next.activeIndex = event.index;
            next.mult = event.runningMult;
            next.label = event.label;
            break;
          case "result":
            next.activeIndex = null;
            next.activePenId = null;
            next.label = `${event.word}: ${event.ink} Ink`;
            break;
        }
        return next;
      });
      await delay();
      setAnim((current) => ({ ...current, activePenId: null }));
    }
    await delay();

    setStory(result.state);
    setPending([]);
    setAnim(IDLE_ANIM);
    if (result.storyWon) {
      toast.success("Story complete!");
    } else if (result.pageCompleted) {
      toast.success(`Page complete! +${result.coinReward} Coins`);
    } else if (result.defeated) {
      toast.error("Out of words — the Story ends here.");
    }
  }

  function handleBuy(offerIndex: number) {
    if (!story) return;
    const result = buyOffer(story, offerIndex);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if ("needsTile" in result) {
      const offer = result.needsTile.offers?.[offerIndex];
      if (offer?.kind === "enhancement") {
        setDialog({ kind: "enhance", offerIndex, enhancement: offer.enhancement });
      }
      return;
    }
    setStory(result);
    toast.success("Purchased!");
  }

  function handleEnhancePick(tileId: string) {
    if (!story || dialog?.kind !== "enhance") return;
    const result = buyOffer(story, dialog.offerIndex, tileId);
    setDialog(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if ("needsTile" in result) return;
    setStory(result);
    toast.success("Tile enhanced!");
  }

  function startNewStory() {
    const fresh = newStory();
    setStory(fresh);
    setPending([]);
    setSelectedRackId(null);
    setIntroDismissed(-1);
    setDialog(null);
  }

  const showIntro = story.phase === "play" && introDismissed !== story.pageIndex;
  const showEnd = story.phase === "victory" || story.phase === "defeat";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Rotate hint for small portrait screens */}
      <div className="story-rotate-hint fixed inset-0 z-50 flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <RotateCcw className="h-10 w-10 text-primary" />
        <p className="text-lg font-bold">Rotate your device</p>
        <p className="text-sm text-muted-foreground">Story Mode is played in landscape.</p>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {/* Left sidebar — run information */}
        <aside className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card/60 p-3 sm:w-60">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold">{pageLabel(config)}</h1>
              {twist ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label="Plot Twist rules" className="text-accent hover:text-accent/80">
                      <Info className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-sm">
                    <p className="font-bold text-accent">Plot Twist: {twist.name}</p>
                    <p className="mt-1 text-muted-foreground">{twist.description}</p>
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {config.size}×{config.size} board
            </p>
          </div>

          <div className="rounded-lg bg-secondary/70 p-3 text-center">
            <p className="text-xs text-muted-foreground">Ink to beat</p>
            <p className="text-xl font-bold text-base-ink">{config.inkTarget.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">Current Ink</p>
            <p className="text-2xl font-bold">{story.page.ink.toLocaleString()}</p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-base-ink">Base</p>
                <p className="text-xl font-bold text-base-ink">
                  {anim.running ? anim.base : (preview && "ink" in preview ? "—" : "—")}
                </p>
              </div>
              <span className="pb-1 text-muted-foreground">×</span>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-mult-ink">Mult</p>
                <p className="text-xl font-bold text-mult-ink">{anim.running ? anim.mult : "—"}</p>
              </div>
            </div>
            <p className="mt-1 min-h-4 text-center text-xs text-muted-foreground">
              {anim.label ??
                (preview && "ink" in preview
                  ? `This word: ~${preview.ink.toLocaleString()} Ink`
                  : preview?.error ?? "")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-md bg-secondary/70 px-2 py-1.5">
              <p className="text-muted-foreground">Words</p>
              <p className="text-sm font-bold">{story.page.wordsLeft}</p>
            </div>
            <div className="rounded-md bg-secondary/70 px-2 py-1.5">
              <p className="text-muted-foreground">Discards</p>
              <p className="text-sm font-bold">{story.page.discardsLeft}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 rounded-md bg-primary/15 px-2 py-1.5 text-sm font-bold text-primary">
            <Coins className="h-4 w-4" /> {story.coins}
          </div>

          <div className="mt-auto flex gap-1.5">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setDialog({ kind: "run-info" })}>
              Run Info
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: "/lobby" })}>
                  <Home className="mr-2 h-4 w-4" /> Back to Menu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={startNewStory}>
                  <Sparkles className="mr-2 h-4 w-4" /> New Story
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStory({ ...story, phase: "defeat" })}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> End this Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Center — board or Bookstore */}
        <main className="flex min-w-0 flex-1 flex-col justify-center overflow-y-auto rounded-xl border border-border bg-card/30 p-3">
          {story.phase === "bookstore" ? (
            <Bookstore state={story} onBuy={handleBuy} onContinue={() => setStory(continueToNextPage(story))} />
          ) : (
            <StoryBoard
              size={config.size}
              board={story.page.board}
              tiles={story.tiles}
              premiums={config.premiums}
              usedPremiums={story.page.usedPremiums}
              pending={pending}
              letterUpgrades={story.letterUpgrades}
              activeIndex={anim.activeIndex}
              activeWord={anim.activeWord}
              disabled={busy || story.phase !== "play"}
              hoverIndex={hoverIndex}
              draggingIndex={draggingBoardIndex}
              onCellClick={handleCellClick}
              onTilePointerDown={handleBoardTilePointerDown}
            />
          )}
        </main>

        {/* Right sidebar — Pens */}
        <PenSidebar
          pens={story.pens}
          slots={penSlots(story.upgrades)}
          activePenId={anim.activePenId}
          onInspect={(pen) => setDialog({ kind: "pen", pen })}
        />
      </div>

      {/* Bottom — rack and actions */}
      <footer className="flex items-center justify-center gap-2 px-3 pb-3">
        <div className="w-full max-w-md">
          <StoryRack
            tiles={rackTiles}
            selectedId={selectedRackId}
            discardMode={discardMode}
            discardSelection={discardSelection}
            letterUpgrades={story.letterUpgrades}
            draggingId={draggingRackId}
            onSelect={handleRackSelect}
            onTilePointerDown={handleRackPointerDown}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={shuffleRack} disabled={busy || story.phase !== "play"}>
            <Shuffle className="mr-1 h-4 w-4" /> Shuffle
          </Button>
          {discardMode ? (
            <>
              <Button size="sm" variant="secondary" onClick={confirmDiscard} disabled={discardSelection.length === 0}>
                Discard {discardSelection.length || ""}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDiscardMode(false);
                  setDiscardSelection([]);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || story.phase !== "play" || story.page.discardsLeft <= 0}
              onClick={() => setDiscardMode(true)}
            >
              Discard
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setDialog({ kind: "bag" })}>
            <Layers className="mr-1 h-4 w-4" /> Bag
          </Button>
          <Button
            size="sm"
            disabled={busy || story.phase !== "play" || pending.length === 0 || !words}
            onClick={playWord}
          >
            <Play className="mr-1 h-4 w-4" /> Play word
          </Button>
        </div>
      </footer>

      {/* Dialogs */}
      {showIntro ? <PageIntroDialog state={story} onStart={() => setIntroDismissed(story.pageIndex)} /> : null}
      {showEnd ? <StoryEndDialog state={story} won={story.phase === "victory"} onNewStory={startNewStory} /> : null}
      {dialog?.kind === "run-info" ? <RunInfoDialog state={story} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === "bag" ? <BagDialog state={story} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === "tile" ? <TileInspectDialog tile={dialog.tile} state={story} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === "pen" ? (
        <PenInspectDialog
          pen={dialog.pen}
          canSell={story.phase === "bookstore"}
          onSell={() => {
            setStory(sellPen(story, dialog.pen.penId));
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "blank" ? (
        <BlankPickerDialog
          onPick={(letter) => {
            setPending([...pending, { index: dialog.index, tileId: dialog.tileId, letter, blank: true }]);
            setSelectedRackId(null);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "enhance" ? (
        <EnhancePickerDialog
          state={story}
          enhancement={dialog.enhancement}
          onPick={handleEnhancePick}
          onClose={() => setDialog(null)}
        />
      ) : null}

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
    </div>
  );
}
