import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Coins,
  Droplet,
  X,
  Home,
  Info,
  Layers,
  MoreVertical,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
  Settings,
  Smartphone,
} from "lucide-react";
import { loadWordList } from "@/lib/words";
import { cn } from "@/lib/utils";
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
import { inspectPlacement } from "@/lib/story/preview";
import { ScoreFlight, type ScoreFlightData } from "@/components/story/ScoreFlight";
import { PenPurchaseFlight, type PenPurchaseFlightData } from "@/components/story/PenPurchaseFlight";
import { RoundScore, ScoreBoxes, impactBox } from "@/components/story/ScoreDisplay";
import { loadStory, saveStory } from "@/lib/story/storage";
import { useStoryLayout } from "@/hooks/useStoryLayout";
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
import { Bookstore, BookstoreSummary } from "@/components/story/Bookstore";
import { ScoreConfetti, type ScoreConfettiData } from "@/components/story/ScoreConfetti";
import { PageCompleteDialog, type PageStats } from "@/components/story/PageCompleteDialog";
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
  baseHidden?: boolean;
  multHidden?: boolean;
  popKey?: number;
  roundScore?: number | null;
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

const STEP_MS = 600;

function fmtDelta(diff: number): string {
  const rounded = Math.round(diff);
  return rounded >= 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
}

function StoryPlay() {
  const navigate = useNavigate();
  const layout = useStoryLayout();
  const compact = layout !== "desktop";
  const [story, setStory] = useState<StoryState | null>(() => loadStory());
  const [words, setWords] = useState<Set<string> | null>(null);
  const [pending, setPending] = useState<PendingPlacement[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [discardMode, setDiscardMode] = useState(false);
  const [discardSelection, setDiscardSelection] = useState<string[]>([]);
  const discardOutRef = useRef(false);
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
  const [flight, setFlight] = useState<ScoreFlightData | null>(null);
  const [penFlight, setPenFlight] = useState<PenPurchaseFlightData | null>(null);
  const [arrivingPenId, setArrivingPenId] = useState<string | null>(null);
  const [pageStats, setPageStats] = useState<PageStats | null>(null);
  const flightId = useRef(0);
  const [confetti, setConfetti] = useState<ScoreConfettiData | null>(null);

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

  const config = story ? PAGES[story.pageIndex] : null;
  const tileById = useMemo(
    () => new Map((story?.tiles ?? []).map((tile) => [tile.id, tile])),
    [story?.tiles],
  );

  // Live preview of the pending placement's Ink.
  const preview = useMemo(() => {
    if (!story || !config || !words || pending.length === 0) return null;
    return inspectPlacement({
      size: config.size, board: story.page.board, pending, tiles: story.tiles,
      premiums: config.premiums, usedPremiums: story.page.usedPremiums,
      plotTwist: config.plotTwist, letterUpgrades: story.letterUpgrades,
      wordLengthUpgrades: story.wordLengthUpgrades, pens: story.pens,
      longestThisPage: story.page.longestWord,
    }, w => words.has(w));
  }, [story, config, words, pending]);

  if (!story || !config) {
    // No saved run — back to the intro.
    navigate({ to: "/story" });
    return null;
  }

  const pendingIds = new Set(pending.map(p => p.tileId));
  const rackTiles = story.page.rack.filter(id => !pendingIds.has(id)).flatMap((id) => { const tile = tileById.get(id); return tile ? [tile] : []; });
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
    if (!selectedRackId || pendingIds.has(selectedRackId)) return;
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

    if (pendingIds.has(tileId) || !story.page.rack.includes(tileId)) return;

    if (blank) {
      setDialog({ kind: "blank", index: target, tileId });
      return;
    }
    setPending([...pending, { index: target, tileId, letter, blank: false }]);
    setSelectedRackId(null);
  }

  function handleRackPointerDown(tileId: string, event: React.PointerEvent) {
    const tile = tileById.get(tileId);
    if (!tile || pendingIds.has(tileId)) return;
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
    if (busy || !story || story.phase !== "play" || pendingIds.has(tileId)) return;
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
      const a = rack[i];
      const b = rack[j];
      if (a && b) [rack[i], rack[j]] = [b, a];
    }
    setStory({ ...story, page: { ...story.page, rack } });
  }

  async function confirmDiscard() {
    if (!story || discardOutRef.current) return;
    const result = discardTiles(story, discardSelection);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      discardOutRef.current = true;
      const animations = discardSelection.flatMap((id, i) => {
        const el = document.querySelector<HTMLElement>(`[data-rack-tile-id="${CSS.escape(id)}"]`);
        if (!el) return [];
        const dx = window.innerWidth - el.getBoundingClientRect().left + 40;
        return [
          el.animate(
            [
              { transform: "translateY(-6px)", opacity: 1 },
              { transform: `translate(${dx}px, -30px) rotate(25deg)`, opacity: 1 },
            ],
            { duration: 450, delay: i * 60, easing: "cubic-bezier(0.5,0,0.9,0.5)", fill: "forwards" },
          ).finished.catch(() => undefined),
        ];
      });
      await Promise.all(animations);
      discardOutRef.current = false;
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
    let current = { ...IDLE_ANIM, running: true };
    setAnim(current);
    const delay = () => new Promise((resolve) => setTimeout(resolve, STEP_MS));
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const visible = (selector: string) => [...document.querySelectorAll(selector)].find(el => el.getBoundingClientRect().width > 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Fly a number from one score box into another (presentation only).
    // Box-to-box flights keep the boxes' white number colour.
    const flyBox = async (from: string, to: string, kind: "base" | "mult", text: string) => {
      const a = visible(from)?.getBoundingClientRect();
      const b = visible(to)?.getBoundingClientRect();
      if (!a || !b || reduced) return;
      const x = a.left + a.width / 2, y = a.top + a.height / 2;
      setFlight({ id: ++flightId.current, kind, text, x, y, dx: b.left + b.width / 2 - x, dy: b.top + b.height / 2 - y, white: true });
      await wait(500);
      setFlight(null);
    };
    let roundShown = story.page.ink;
    let popKey = 0;
    for (const event of result.score.events) {
      if (cancelAnim.current) return;
      const next: AnimState = { ...current, running: true, activeIndex: null, activePenId: null, baseDelta: null, multDelta: null };
        switch (event.type) {
          case "word":
            next.activeWord = event.indices;
            next.base = 0;
            next.mult = 0;
            next.baseDelta = null;
            next.multDelta = null;
            next.label = event.word;
            break;
          case "letter":
            next.activeIndex = event.index;
            next.baseDelta = fmtDelta(event.base);
            next.base = event.runningBase;
            next.label = null;
            break;
          case "letter-mult":
            next.activeIndex = event.index;
            next.baseDelta = fmtDelta(event.runningBase - current.base);
            next.base = event.runningBase;
            next.label = event.label;
            break;
          case "pen-base":
            next.activePenId = event.penId;
            next.baseDelta = fmtDelta(event.runningBase - current.base);
            next.base = event.runningBase;
            next.label = event.text;
            break;
          case "twist":
            next.baseDelta = fmtDelta(event.runningBase - current.base);
            next.base = event.runningBase;
            next.label = event.text;
            break;
          case "mult-init":
            next.mult = event.value;
            next.multDelta = `+${event.value}`;
            next.activeIndex = null;
            next.label = null;
            break;
          case "pen-mult":
            next.activePenId = event.penId;
            next.multDelta = fmtDelta(event.runningMult - current.mult);
            next.mult = event.runningMult;
            next.label = event.text;
            break;
          case "word-mult":
            next.activeIndex = null;
            next.multDelta = `×${event.factor}`;
            next.mult = event.runningMult;
            next.label = event.label;
            break;
          case "result":
            next.activeIndex = null;
            next.activePenId = null;
            next.baseDelta = null;
            next.multDelta = null;
            next.label = `${event.word}: ${event.ink} Ink`;
            break;
        }
      const kind = next.base !== current.base && next.baseDelta ? "base" : next.mult !== current.mult && next.multDelta ? "mult" : null;
      if (kind) {
        const selectors = next.activePenId ? [`[data-owned-pen="${next.activePenId}"]`] : kind === "base" && next.activeIndex !== null ? [`[data-cell-index="${next.activeIndex}"]`] : (next.activeWord ?? []).map(index => `[data-cell-index="${index}"]`);
        const rects = selectors.flatMap(selector => { const rect = [...document.querySelectorAll(selector)].map(el => el.getBoundingClientRect()).find(r => r.width > 0); return rect ? [rect] : []; });
        const boxes = [...document.querySelectorAll(`[data-score-box="${kind}"]`)];
        const target = boxes.map(box => box.getBoundingClientRect()).find(rect => rect.width > 0 && rect.height > 0);
        setAnim({ ...next, base: current.base, mult: current.mult, baseDelta: null, multDelta: null });
        if (target && rects.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const x = (Math.min(...rects.map(r => r.left)) + Math.max(...rects.map(r => r.right))) / 2;
          const y = Math.min(...rects.map(r => r.top)) + 8;
          setFlight({ id: ++flightId.current, kind, text: (kind === "base" ? next.baseDelta : next.multDelta) ?? "", x, y, dx: target.left + target.width / 2 - x, dy: target.top + target.height / 2 - y });
          await new Promise(resolve => setTimeout(resolve, 500));
          if (cancelAnim.current) return;
        }
        setFlight(null);
      }
      setAnim(next);
      current = next;
      await delay();
      if (cancelAnim.current) return;
      if (event.type === "result") {
        // Mult -> Base: Base counts up to the word's Ink.
        await flyBox('[data-score-box="mult"]', '[data-score-box="base"]', "mult", `×${event.mult.toLocaleString(undefined, { maximumFractionDigits: 1 })}`);
        if (cancelAnim.current) return;
        current = { ...current, multHidden: true, base: event.ink, baseDelta: `×${event.mult}`, activePenId: null };
        setAnim(current);
        await delay();
        // Base -> Round score: purple box counts up.
        await flyBox('[data-score-box="base"]', ".story-current-score", "base", event.ink.toLocaleString());
        if (cancelAnim.current) return;
        roundShown += event.ink;
        current = { ...current, baseHidden: true, baseDelta: null, roundScore: roundShown };
        setAnim(current);
        const purple = visible(".story-current-score");
        if (purple) impactBox(purple);
        await delay();
        // Empty boxes regrow their zeros.
        current = { ...current, base: 0, mult: 0, baseHidden: false, multHidden: false, popKey: ++popKey };
        setAnim(current);
        await wait(300);
      }
      setAnim(value => ({ ...value, activePenId: null }));
    }
    await delay();

    if (result.pageCompleted && !cancelAnim.current) {
      const box = [...document.querySelectorAll(".story-current-score")].map(el => el.getBoundingClientRect()).find(r => r.width > 0);
      if (box && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setConfetti({ id: ++flightId.current, x: box.left + box.width / 2, y: box.top + box.height / 2 });
        await new Promise(resolve => setTimeout(resolve, 800));
        setConfetti(null);
      }
    }

    setStory(result.state);
    setPending([]);
    setAnim(IDLE_ANIM);
    if (result.storyWon) {
      toast.success("Story complete!");
    } else if (result.pageCompleted) {
      setPageStats({
        ink: result.state.page.ink,
        words: result.state.page.wordsPlayed ?? 0,
        bestWordInk: result.state.page.bestWordInk ?? 0,
        coins: result.coinReward,
      });
    } else if (result.defeated) {
      toast.error("Out of words — the Story ends here.");
    }
  }

  function handleBuy(offerIndex: number, source?: DOMRect) {
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
    const offer = story.offers?.[offerIndex];
    if (offer?.kind === "pen" && source && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const target = [...document.querySelectorAll(`[data-pen-slot="${story.pens.length}"]`)]
        .map(slot => slot.getBoundingClientRect()).find(rect => rect.width > 0 && rect.height > 0);
      if (target) {
        const x = source.left + source.width / 2;
        const y = source.top + source.height / 2;
        setArrivingPenId(null);
        setPenFlight({ id: ++flightId.current, penId: offer.penId, x, y, dx: target.left + target.width / 2 - x, dy: target.top + target.height / 2 - y });
      }
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
    if (!window.confirm("Start a new Story? This replaces your current Story.")) return;
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
    <div className={cn("story-screen flex h-dvh flex-col overflow-hidden", compact && "story-compact", story.phase === "bookstore" && "story-shopping")} data-layout={layout}>
      {layout === "rotate" && <div className="story-rotate-hint fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="relative text-primary"><Smartphone className="h-20 w-20 rotate-90" /><RotateCcw className="absolute -right-5 -top-3 h-8 w-8" /></div>
        <h1 className="text-2xl font-bold">SibbleBook is best played in portrait</h1>
        <p className="text-sm text-muted-foreground">Rotate your phone to continue writing your Story.</p>
      </div>}

      {compact && <header className="story-hud">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-muted-foreground">Chapter {config.chapter} · Page {config.page}{story.phase === "bookstore" ? " · Complete!" : ""}</p>
            {twist && story.phase === "play" && <Popover><PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-5 max-w-full justify-start px-0 text-xs text-accent hover:bg-transparent hover:text-accent" aria-label="Plot Twist rules"><Info className="h-3 w-3" />{twist.name}</Button></PopoverTrigger><PopoverContent><p className="font-bold">{twist.name}</p><p>{twist.description}</p></PopoverContent></Popover>}
            {story.phase === "bookstore" && <p className="text-xl font-bold">The Bookstore</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Story settings"><Settings /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate({ to: "/lobby" })}><Home /> Return to main menu</DropdownMenuItem>
              <DropdownMenuItem onClick={startNewStory}><Sparkles /> Start new Story</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog({ kind: "run-info" })}><Info /> Run Info</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => { if (window.confirm("End this Story? Your run will be over.")) setStory({ ...story, phase: "defeat" }); }}><Trash2 /> End this Story</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {story.phase !== "bookstore" && <>
          <RoundScore target={config.inkTarget} current={busy && anim.roundScore != null ? anim.roundScore : story.page.ink} running={busy} />
          <ScoreBoxes base={busy ? anim.base : 0} mult={busy ? anim.mult : 0} running={busy} baseDelta={anim.baseDelta} multDelta={anim.multDelta} baseHidden={busy && anim.baseHidden} multHidden={busy && anim.multHidden} popKey={busy ? anim.popKey : 0} />
          <div className="story-score-caption text-xs text-muted-foreground">{anim.label ?? ""}</div>
        </>}
      </header>}
      <div className="story-workspace flex min-h-0 flex-1 gap-3 p-3">
        {/* Left sidebar — run information */}
        <aside className="story-desktop-sidebar flex w-52 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card/60 p-3 sm:w-60">
          {story.phase === "bookstore" ? (
            <BookstoreSummary state={story} onContinue={() => setStory(continueToNextPage(story))} />
          ) : (
          <>
          <div>
            <div className="flex flex-col items-start gap-1">
              <h1 className="text-sm font-bold">{pageLabel(config)}</h1>
              {twist ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Plot Twist rules" className="h-6 px-0 text-accent hover:bg-transparent hover:text-accent">
                      <Info className="h-4 w-4" /> {twist.name}
                    </Button>
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

          <RoundScore target={config.inkTarget} current={busy && anim.roundScore != null ? anim.roundScore : story.page.ink} running={busy} />
          <ScoreBoxes base={busy ? anim.base : 0} mult={busy ? anim.mult : 0} running={busy} baseDelta={anim.baseDelta} multDelta={anim.multDelta} baseHidden={busy && anim.baseHidden} multHidden={busy && anim.multHidden} popKey={busy ? anim.popKey : 0} />
          <p className="min-h-4 text-center text-xs text-muted-foreground">{anim.label ?? ""}</p>


          </>
          )}

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
                  onClick={() => { if (window.confirm("End this Story? Your run will be over.")) setStory({ ...story, phase: "defeat" }); }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> End this Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Center — board or Bookstore */}
        <main className="story-main flex min-w-0 flex-1 flex-col justify-center overflow-y-auto rounded-xl border border-border bg-card/30 p-3">
          {story.phase === "bookstore" ? (
            <Bookstore state={story} onBuy={handleBuy} compact={compact} />
          ) : (
            <StoryBoard
              compact={compact}
              size={config.size}
              board={story.page.board}
              tiles={story.tiles}
              premiums={config.premiums}
              usedPremiums={story.page.usedPremiums}
              pending={pending}
              letterUpgrades={story.letterUpgrades}
              activeIndex={anim.activeIndex}
              activeWord={anim.activeWord}
              wordHighlights={busy ? [] : preview?.wordHighlights ?? []}
              disabled={busy || story.phase !== "play"}
              hoverIndex={hoverIndex}
              draggingIndex={draggingBoardIndex}
              onCellClick={handleCellClick}
              onTilePointerDown={handleBoardTilePointerDown}
            />
          )}
          {story.phase === "play" && <div className="story-board-status" aria-live="polite">
            <span className="story-play-coins flex items-center gap-1 text-3xl font-black tabular-nums text-gold"><Coins className="h-6 w-6 shrink-0" />{story.coins}</span>
            <div className="story-remaining-counters"><span>Words left <strong className="text-xl tabular-nums text-base-ink">{story.page.wordsLeft}</strong></span><span>Discards left <strong className="text-xl tabular-nums text-mult-ink">{story.page.discardsLeft}</strong></span></div>
            {!busy && preview && <span className={cn("story-preview-tag", preview.error ? "bg-destructive/15 text-destructive" : "bg-story-valid/15 text-story-valid")} title={preview.error ?? "Ink before Pens"}>
              {preview.error ? <><X className="h-4 w-4 shrink-0" /><span className="truncate">{preview.error}</span></> : <><span>+{preview.ink?.toLocaleString()}</span><Droplet className="h-4 w-4" aria-label="Ink before Pens" /></>}
            </span>}
          </div>}
        </main>

        {/* Right sidebar — Pens */}
        <PenSidebar
          horizontal={compact}
          pens={story.pens}
          slots={penSlots(story.upgrades)}
          activePenId={anim.activePenId}
          arrivingPenId={arrivingPenId}
          onArrivalEnd={() => setArrivingPenId(null)}
          onInspect={(pen) => setDialog({ kind: "pen", pen })}
        />
      </div>

      {/* Bottom — rack and actions */}
      <footer className="story-footer flex items-center justify-center gap-2 px-3 pb-3">
        <div className={cn("w-full", story.phase === "bookstore" ? "max-w-2xl" : "max-w-md")}>
          {story.phase === "bookstore" ? (
            <div className="pointer-events-none">
              <StoryRack
                compact={compact}
                capacity={compact ? 6 : 10}
                gloss={false}
                tiles={(compact ? "SIBBLE" : "SIBBLEBOOK").split("").map((letter, i) => ({ id: `deco-${i}`, letter, enhancement: null }))}
                selectedId={null}
                discardMode={false}
                discardSelection={[]}
                letterUpgrades={story.letterUpgrades}
                onSelect={() => {}}
              />
            </div>
          ) : (
          <StoryRack
            compact={compact}
            capacity={story.upgrades.includes("bigger-rack") ? 8 : 7}
            tiles={rackTiles}
            selectedId={selectedRackId}
            discardMode={discardMode}
            discardSelection={discardSelection}
            letterUpgrades={story.letterUpgrades}
            draggingId={draggingRackId}
            onSelect={handleRackSelect}
            onTilePointerDown={handleRackPointerDown}
          />
          )}
        </div>
        <div className={cn("story-actions items-center gap-1.5", story.phase === "bookstore" ? "hidden" : "flex flex-wrap")}>
          <Button title="Shuffle" aria-label="Shuffle" variant="outline" size="sm" onClick={shuffleRack} disabled={busy || story.phase !== "play"}>
            <Shuffle className="mr-1 h-4 w-4" /><span className="story-action-label">Shuffle</span>
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
          <Button title="Bag" aria-label="Bag" variant="outline" size="sm" onClick={() => setDialog({ kind: "bag" })}>
            <Layers className="mr-1 h-4 w-4" /><span className="story-action-label">Bag</span>
          </Button>
          <Button
            size="sm"
            disabled={busy || story.phase !== "play" || pending.length === 0 || !words}
            className="story-play-button"
            onClick={playWord}
          >
            <Play className="mr-1 h-4 w-4" /> Play word
          </Button>
        </div>
      </footer>

      {compact && story.phase === "bookstore" && <div className="story-continue">
        <span className="flex items-center gap-1.5 text-3xl font-black tabular-nums text-gold"><Coins className="h-7 w-7" />{story.coins}</span>
        <Button className="relative tile-gloss px-6" onClick={() => setStory(continueToNextPage(story))}>Next Page <ArrowRight /></Button>
      </div>}
      {/* Dialogs */}
      {showIntro ? <PageIntroDialog state={story} onStart={() => setIntroDismissed(story.pageIndex)} /> : null}
      {showEnd ? <StoryEndDialog state={story} won={story.phase === "victory"} onNewStory={startNewStory} /> : null}
      {pageStats ? <PageCompleteDialog stats={pageStats} onClose={() => setPageStats(null)} /> : null}
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
            if (!pendingIds.has(dialog.tileId)) setPending([...pending, { index: dialog.index, tileId: dialog.tileId, letter, blank: true }]);
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

      <ScoreFlight flight={flight} />
      <ScoreConfetti burst={confetti} />
      <PenPurchaseFlight flight={penFlight} onArrive={() => { setArrivingPenId(penFlight?.penId ?? null); setPenFlight(null); }} />
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
