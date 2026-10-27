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
  Menu,
  MoreVertical,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
  Settings,
  Gauge,
  Volume2,
  VolumeX,
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
import { reorderPens } from "@/lib/story/pens";
import { animationEvents, countCrossingTime, getStoryAnimationMode, setStoryAnimationMode, STORY_CONFETTI_MS, totalCountDuration, type StoryAnimationMode } from "@/lib/story/animation";
import { AnimationModeMenu } from "@/components/story/AnimationModeMenu";
import { ScoreFlight, type ScoreFlightData } from "@/components/story/ScoreFlight";
import { PenPurchaseFlight, type PenPurchaseFlightData } from "@/components/story/PenPurchaseFlight";
import { ItemPurchaseFlight, type ItemPurchaseFlightData } from "@/components/story/ItemPurchaseFlight";
import { CountNumber, RoundScore, ScoreBoxes, impactBox } from "@/components/story/ScoreDisplay";
import { loadStorySound, saveStorySound, soundCoin, soundConfetti, soundCount, soundHit, soundSlam, soundWhoosh, unlockStorySound } from "@/lib/story/sound";
import { loadStory, saveStory } from "@/lib/story/storage";
import { loadStoryStats, recordPageCompleted, recordStoryEnded, recordStoryStarted, recordWordsPlayed, saveStoryStats } from "@/lib/story/stats";
import { useStoryLayout } from "@/hooks/useStoryLayout";
import { useStoryTheme } from "@/hooks/useStoryTheme";
import { getStorySpeed, nextStorySpeed, scaled, setStorySpeed } from "@/lib/story/speed";
import { penSlots, priceFor } from "@/lib/story/upgrades";
import type { Offer, PendingPlacement, PenInstance, StoryState, StoryTile } from "@/lib/story/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StoryBoard } from "@/components/story/StoryBoard";
import { StoryRack, type ReturningRackTile } from "@/components/story/StoryRack";
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
  growToTotal?: boolean;
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

// Brief pause between consecutive flying numbers so each impact reads before the next launches.
const STEP_MS = 300;

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
  const [returningTiles, setReturningTiles] = useState<ReturningRackTile[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [discardMode, setDiscardMode] = useState(false);
  useStoryTheme();
  const [speed, setSpeed] = useState(1);
  const [animationMode, setAnimationMode] = useState<StoryAnimationMode>("normal");
  useEffect(() => setAnimationMode(getStoryAnimationMode()), []);
  const changeAnimationMode = (mode: StoryAnimationMode) => { setStoryAnimationMode(mode); setAnimationMode(mode); };
  useEffect(() => setSpeed(getStorySpeed()), []);
  const cycleSpeed = () => { const v = nextStorySpeed(speed); setStorySpeed(v); setSpeed(v); };
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
  const [itemFlight, setItemFlight] = useState<ItemPurchaseFlightData | null>(null);
  const [sibblePulse, setSibblePulse] = useState(false);
  const sibblePulseTimer = useRef<number | null>(null);
  const [arrivingPenId, setArrivingPenId] = useState<string | null>(null);
  const [pageStats, setPageStats] = useState<PageStats | null>(null);
  const flightId = useRef(0);
  const [confetti, setConfetti] = useState<ScoreConfettiData | null>(null);
  const [coinFlight, setCoinFlight] = useState<{ id: number; amount: number; x: number; y: number; dx: number; dy: number } | null>(null);
  const [coinBonus, setCoinBonus] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [shopEntering, setShopEntering] = useState(false);
  const pendingCommit = useRef<(() => void) | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  useEffect(() => setSoundOn(loadStorySound()), []);
  const toggleSound = () => { const v = !soundOn; saveStorySound(v); setSoundOn(v); if (v) unlockStorySound(); };

  /** Page Complete -> push the board away, slide the Bookstore in, pop the items. */
  async function visitBookstore() {
    setPageStats(null);
    const main = document.querySelector(".story-main");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (main && !reducedMotion) {
      await main.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-110%)", opacity: 0 }], { duration: 380, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" }).finished.catch(() => {});
    }
    soundWhoosh();
    setShopEntering(true);
    pendingCommit.current?.();
    pendingCommit.current = null;
    window.setTimeout(() => setShopEntering(false), 1800);
  }

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
  // Keep the last message mounted while it animates out.
  const previewError = preview?.error ?? null;
  useEffect(() => { if (previewError) setLastError(previewError); }, [previewError]);

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
      returnTileToRack(placedAt);
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

  function returnTileToRack(placement: PendingPlacement) {
    const cell = document.querySelector(`[data-story-board] [data-cell-index="${placement.index}"]`);
    const from = cell?.getBoundingClientRect();
    if (from && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReturningTiles(current => [...current, { tileId: placement.tileId, from: { left: from.left, top: from.top, width: from.width, height: from.height } }]);
    }
    setSelectedRackId(null);
    setPending(current => current.filter(item => item.tileId !== placement.tileId));
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
      if (source.type === "board") {
        const placement = pending.find(item => item.index === source.index);
        if (placement) returnTileToRack(placement);
      }
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
    if (busy || !story || story.phase !== "play" || pendingIds.has(tileId) || returningTiles.some(item => item.tileId === tileId)) return;
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
    const delay = () => new Promise((resolve) => setTimeout(resolve, scaled(STEP_MS)));
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, scaled(ms)));
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
    const inkTarget = PAGES[story.pageIndex]!.inkTarget;
    let confettiFired = false;
    let confettiDone: Promise<void> | null = null;
    let popKey = 0;
    let hitStep = 0;
    unlockStorySound();
    for (const event of animationEvents(result.score.events, animationMode)) {
      if (cancelAnim.current) return;
      const next: AnimState = { ...current, running: true, activeIndex: null, activePenId: null, baseDelta: null, multDelta: null, growToTotal: false };
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
            if (animationMode === "reduced") {
              next.base = event.base;
              next.mult = event.mult;
              next.growToTotal = true;
              // One simultaneous count from zero, without contribution tags or impacts.
              next.baseDelta = null;
              next.multDelta = null;
            }
            next.activeIndex = null;
            next.activePenId = null;
            if (animationMode === "normal") {
              next.baseDelta = null;
              next.multDelta = null;
            }
            next.label = `${event.word}: ${event.ink} Ink`;
            break;
        }
      const kind = next.base !== current.base && next.baseDelta ? "base" : next.mult !== current.mult && next.multDelta ? "mult" : null;
      if (kind && animationMode === "normal") {
        const selectors = next.activePenId ? [`[data-owned-pen="${next.activePenId}"]`] : kind === "base" && next.activeIndex !== null ? [`[data-cell-index="${next.activeIndex}"]`] : (next.activeWord ?? []).map(index => `[data-cell-index="${index}"]`);
        const rects = selectors.flatMap(selector => { const rect = [...document.querySelectorAll(selector)].map(el => el.getBoundingClientRect()).find(r => r.width > 0); return rect ? [rect] : []; });
        const boxes = [...document.querySelectorAll(`[data-score-box="${kind}"]`)];
        const target = boxes.map(box => box.getBoundingClientRect()).find(rect => rect.width > 0 && rect.height > 0);
        setAnim({ ...next, base: current.base, mult: current.mult, baseDelta: null, multDelta: null });
        if (target && rects.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const x = (Math.min(...rects.map(r => r.left)) + Math.max(...rects.map(r => r.right))) / 2;
          const y = Math.min(...rects.map(r => r.top)) + 8;
          setFlight({ id: ++flightId.current, kind, text: (kind === "base" ? next.baseDelta : next.multDelta) ?? "", x, y, dx: target.left + target.width / 2 - x, dy: target.top + target.height / 2 - y });
          await wait(500);
          if (cancelAnim.current) return;
        }
        setFlight(null);
        soundHit(kind, hitStep++);
      }
      setAnim(next);
      current = next;
      if (next.growToTotal) {
        const ms = Math.max(totalCountDuration(next.base), totalCountDuration(next.mult));
        soundCount(scaled(ms));
        await wait(ms + 100);
      }
      else await delay();
      if (cancelAnim.current) return;
      if (event.type === "result") {
        // Mult -> Base: the blue box counts up to the word's Ink with the accelerating count.
        await flyBox('[data-score-box="mult"]', '[data-score-box="base"]', "mult", `×${event.mult.toLocaleString(undefined, { maximumFractionDigits: 1 })}`);
        if (cancelAnim.current) return;
        soundSlam();
        current = { ...current, multHidden: true, base: event.ink, baseDelta: `×${event.mult}`, activePenId: null, growToTotal: true };
        setAnim(current);
        soundCount(scaled(totalCountDuration(event.ink)));
        await wait(totalCountDuration(event.ink) + 100);
        // Base -> Round score: purple box counts up.
        await flyBox('[data-score-box="base"]', ".story-current-score", "base", event.ink.toLocaleString());
        if (cancelAnim.current) return;
        soundSlam();
        const roundFrom = roundShown;
        roundShown += event.ink;
        current = { ...current, baseHidden: true, baseDelta: null, roundScore: roundShown };
        setAnim(current);
        soundCount(scaled(totalCountDuration(event.ink)));
        const purple = visible(".story-current-score");
        if (purple) impactBox(purple);
        // Confetti pops the moment the count passes the target; the count keeps going.
        if (!confettiFired && roundFrom < inkTarget && roundShown >= inkTarget) {
          confettiFired = true;
          const at = scaled(countCrossingTime(roundFrom, roundShown, inkTarget));
          confettiDone = new Promise((resolve) => setTimeout(() => {
            if (cancelAnim.current) { resolve(); return; }
            soundConfetti();
            const box = visible(".story-current-score")?.getBoundingClientRect();
            if (!box || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { resolve(); return; }
            setConfetti({ id: ++flightId.current, x: box.left + box.width / 2, y: box.top + box.height / 2 });
            setTimeout(() => { setConfetti(null); resolve(); }, STORY_CONFETTI_MS);
          }, at));
        }
        await wait(Math.max(600, totalCountDuration(event.ink) + 100));
        // Empty boxes regrow their zeros.
        current = { ...current, base: 0, mult: 0, baseHidden: false, multHidden: false, popKey: ++popKey };
        setAnim(current);
        await wait(300);
      }
      setAnim(value => ({ ...value, activePenId: null }));
    }
    await delay();

    if (confettiDone) await confettiDone;

    let stats = recordWordsPlayed(loadStoryStats(), result.score.words.map((word) => ({ word: word.word, ink: word.ink })));
    if (result.pageCompleted) stats = recordPageCompleted(stats, result.state.pageIndex, result.state.page.ink);
    if (result.storyWon) stats = recordStoryEnded(stats, result.state, true);
    else if (result.defeated) stats = recordStoryEnded(stats, result.state, false);
    saveStoryStats(stats);

    const commit = () => {
      setStory(result.state);
      setPending([]);
      setAnim(IDLE_ANIM);
      setCoinBonus(0);
    };

    if (result.pageCompleted && !result.storyWon) {
      // Persist now; the screen keeps showing the finished board until the Bookstore opens.
      saveStory(result.state);
      const reward = result.coinReward;
      if (!reduced) flyLettersOut();
      if (reward > 0) {
        const from = visible(".story-current-score")?.getBoundingClientRect();
        const to = visible(".story-play-coins")?.getBoundingClientRect();
        if (from && to && !reduced) {
          const x = from.left + from.width / 2, y = from.top + from.height / 2;
          setCoinFlight({ id: ++flightId.current, amount: reward, x, y, dx: to.left + to.width / 2 - x, dy: to.top + to.height / 2 - y });
          await new Promise((resolve) => setTimeout(resolve, 900));
          setCoinFlight(null);
        }
        if (cancelAnim.current) return;
        const coinsEl = visible(".story-play-coins");
        if (coinsEl) impactBox(coinsEl);
        soundCoin();
        setCoinBonus(reward);
        const countMs = scaled(totalCountDuration(reward));
        soundCount(countMs);
        await new Promise((resolve) => setTimeout(resolve, countMs + 100));
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (cancelAnim.current) return;
      pendingCommit.current = commit;
      soundWhoosh();
      setPageStats({
        ink: result.state.page.ink,
        words: result.state.page.wordsPlayed ?? 0,
        bestWordInk: result.state.page.bestWordInk ?? 0,
        coins: result.coinReward,
      });
      return;
    }

    commit();
    if (result.storyWon) {
      toast.success("Story complete!");
    } else if (result.defeated) {
      toast.error("Out of words — the Story ends here.");
    }
  }

  /** Presentation only: clones every board letter and flies it off to the right on a curve. */
  function flyLettersOut() {
    const cells = Array.from(document.querySelectorAll<HTMLElement>("[data-story-board] [data-cell-index]"))
      .filter((el) => el.classList.contains("tile-gloss") && el.offsetParent !== null);
    if (!cells.length) return;
    const vw = window.innerWidth;
    const minLeft = Math.min(...cells.map((el) => el.getBoundingClientRect().left));
    cells.forEach((el) => {
      const r = el.getBoundingClientRect();
      const clone = el.cloneNode(true) as HTMLElement;
      clone.removeAttribute("data-cell-index");
      Object.assign(clone.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: "0", zIndex: "60", pointerEvents: "none", transition: "none" });
      document.body.appendChild(clone);
      el.style.visibility = "hidden";
      const dx = vw - r.left + r.width * 2;
      const lift = -(60 + Math.random() * 80);
      const spin = 20 + Math.random() * 40;
      const delayMs = ((r.left - minLeft) / Math.max(1, vw)) * 900 + Math.random() * 60;
      const anim = clone.animate([
        { transform: "translate(0,0) rotate(0deg)", offset: 0 },
        { transform: `translate(${dx * 0.12}px, ${lift}px) rotate(${spin * 0.3}deg)`, offset: 0.35 },
        { transform: `translate(${dx * 0.55}px, ${lift * 0.6}px) rotate(${spin * 0.7}deg)`, offset: 0.7 },
        { transform: `translate(${dx}px, ${-lift * 0.8}px) rotate(${spin}deg)`, offset: 1 },
      ], { duration: 750, delay: delayMs, easing: "cubic-bezier(0.45, 0, 0.75, 0.6)", fill: "both" });
      anim.onfinish = () => clone.remove();
      anim.oncancel = () => clone.remove();
    });
  }

  function pulseSibble() {
    setSibblePulse(true);
    if (sibblePulseTimer.current) window.clearTimeout(sibblePulseTimer.current);
    sibblePulseTimer.current = window.setTimeout(() => setSibblePulse(false), scaled(420));
  }

  /** Flies a purchased item into the decorative Sibble rack at the bottom of the Bookstore. */
  function flyToSibble(offer: Offer, source?: DOMRect) {
    if (!source || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = document.querySelector("[data-story-deco-rack]")?.getBoundingClientRect();
    if (!target || target.width === 0) return;
    const x = source.left + source.width / 2;
    const y = source.top + source.height / 2;
    setItemFlight({ id: ++flightId.current, offer, x, y, dx: target.left + target.width / 2 - x, dy: target.top + target.height / 2 - y });
  }

  function handleBuy(offerIndex: number, source?: DOMRect) {
    if (!story) return;
    const result = buyOffer(story, offerIndex);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if ("needsLetter" in result) {
      const offer = result.needsLetter.offers?.[offerIndex];
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
    } else if (offer) {
      flyToSibble(offer, source);
    }
    setStory(result);
  }

  function handleEnhancePick(letter: string) {
    if (!story || dialog?.kind !== "enhance") return;
    const source = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
    const offer = story.offers?.[dialog.offerIndex];
    const result = buyOffer(story, dialog.offerIndex, letter);
    setDialog(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if ("needsLetter" in result) return;
    if (offer) flyToSibble(offer, source);
    setStory(result);
  }

  function startNewStory() {
    if (!window.confirm("Start a new Story? This replaces your current Story.")) return;
    const fresh = newStory();
    saveStoryStats(recordStoryStarted(loadStoryStats()));
    setStory(fresh);
    setPending([]);
    setSelectedRackId(null);
    setIntroDismissed(-1);
    setDialog(null);
  }

  function endStory() {
    if (!story) return;
    if (!window.confirm("End this Story? Your run will be over.")) return;
    saveStoryStats(recordStoryEnded(loadStoryStats(), story, false));
    setStory({ ...story, phase: "defeat" });
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

      {(compact || story.phase === "bookstore") && <header className={cn("story-hud", !compact && "!min-h-0 !max-w-none px-3 pt-3")}>
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
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); cycleSpeed(); }}><Gauge /> Animation speed: {speed}×</DropdownMenuItem>
              <AnimationModeMenu mode={animationMode} onChange={changeAnimationMode} disabled={busy} />
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggleSound(); }}>{soundOn ? <VolumeX /> : <Volume2 />} {soundOn ? "Mute sounds" : "Unmute sounds"}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={endStory}><Trash2 /> End this Story</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {story.phase !== "bookstore" && <>
          <RoundScore target={config.inkTarget} current={busy && anim.roundScore != null ? anim.roundScore : story.page.ink} running={busy} />
          <ScoreBoxes base={busy ? anim.base : 0} mult={busy ? anim.mult : 0} running={busy} baseDelta={anim.baseDelta} multDelta={anim.multDelta} baseHidden={busy && anim.baseHidden} multHidden={busy && anim.multHidden} popKey={busy ? anim.popKey : 0} growToTotal={busy && anim.growToTotal === true} />
          <div className="story-score-caption text-xs text-muted-foreground">{anim.label ?? ""}</div>
        </>}
      </header>}
      <div className="story-workspace flex min-h-0 flex-1 gap-3 p-3">
        {/* Left sidebar — run information */}
        <aside className="story-desktop-sidebar flex w-52 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card/60 p-3 sm:w-60">
          {story.phase === "bookstore" ? (
            <BookstoreSummary state={story} onContinue={() => setStory(continueToNextPage(story))} onOpenBag={() => setDialog({ kind: "bag" })} />
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
          <ScoreBoxes base={busy ? anim.base : 0} mult={busy ? anim.mult : 0} running={busy} baseDelta={anim.baseDelta} multDelta={anim.multDelta} baseHidden={busy && anim.baseHidden} multHidden={busy && anim.multHidden} popKey={busy ? anim.popKey : 0} growToTotal={busy && anim.growToTotal === true} />
          <p className="min-h-4 text-center text-xs text-muted-foreground">{anim.label ?? ""}</p>
          {!compact && <div className="story-remaining-counters story-sidebar-counters"><span>Words left <strong className="tabular-nums text-base-ink">{story.page.wordsLeft}</strong></span><span>Discards left <strong className="tabular-nums text-mult-ink">{story.page.discardsLeft}</strong></span></div>}

          </>
          )}

          <div className="mt-auto flex flex-col gap-3">
          {!compact && story.phase === "play" && <span className="story-play-coins flex items-center gap-2 text-3xl font-black tabular-nums text-gold"><Coins className="h-7 w-7 shrink-0" /><CountNumber value={story.coins + coinBonus} running={coinBonus > 0} growToTotal byDelta /></span>}
          <div className="flex gap-1.5">
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
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); cycleSpeed(); }}>
                  <Gauge className="mr-2 h-4 w-4" /> Animation speed: {speed}×
                </DropdownMenuItem>
                <AnimationModeMenu mode={animationMode} onChange={changeAnimationMode} disabled={busy} />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggleSound(); }}>
                  {soundOn ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />} {soundOn ? "Mute sounds" : "Unmute sounds"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={endStory}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> End this Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </aside>

        {/* Center — board or Bookstore */}
        <main key={story.phase === "bookstore" ? "shop" : "play"} className={cn("story-main flex min-w-0 flex-1 flex-col justify-center overflow-y-auto rounded-xl border border-border bg-card/30 p-3", shopEntering && story.phase === "bookstore" && "story-shop-enter")}>
          {story.phase === "bookstore" ? (
            <Bookstore state={story} onBuy={handleBuy} compact={compact} entering={shopEntering} />
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
            {compact && <>
            <span className="story-play-coins flex items-center gap-1 text-3xl font-black tabular-nums text-gold"><Coins className="h-6 w-6 shrink-0" /><CountNumber value={story.coins + coinBonus} running={coinBonus > 0} growToTotal byDelta /></span>
            <div className="story-remaining-counters"><span>Words left <strong className="text-xl tabular-nums text-base-ink">{story.page.wordsLeft}</strong></span><span>Discards left <strong className="text-xl tabular-nums text-mult-ink">{story.page.discardsLeft}</strong></span></div>
            </>}
            <span className="story-preview-tag-slot story-error-slot" data-error="true" data-open={!busy && !!preview?.error ? "true" : "false"} aria-hidden={!(!busy && preview?.error)}>
              <span className="story-error-inner">
                {lastError && <span className="story-preview-tag story-error-tag bg-destructive/15 text-destructive">
                  <X className="h-4 w-4 shrink-0" /><span>{lastError}</span>
                </span>}
              </span>
            </span>
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
          disabled={busy || !!penFlight || (story.phase !== "play" && story.phase !== "bookstore")}
          onReorder={(activeId, overId) => setStory((current) => current ? { ...current, pens: reorderPens(current.pens, activeId, overId) } : current)}
        />
      </div>

      {/* Bottom — rack and actions */}
      <footer className="story-footer flex items-center justify-center gap-2 px-3 pb-3">
        <div className={cn("w-full", story.phase === "bookstore" ? "max-w-2xl" : "max-w-md")}>
          {story.phase === "bookstore" ? (
            <div data-story-deco-rack className={cn("pointer-events-none", sibblePulse && "story-sibble-arrival")}>
              <StoryRack
                compact={compact}
                capacity={story.upgrades.includes("bigger-rack") ? 8 : 7}
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
            returningTiles={returningTiles}
            onReturnEnd={tileId => setReturningTiles(current => current.filter(item => item.tileId !== tileId))}
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
          <Button title="Bag and completed pages" aria-label="Bag" variant="outline" size="sm" onClick={() => setDialog({ kind: "bag" })}>
            <Layers className="mr-1 h-4 w-4" /><span className="story-action-label">Bag</span>
          </Button>
          <Button
            size="sm"
            disabled={busy || story.phase !== "play" || pending.length === 0 || !words}
            className="story-play-button relative tile-gloss text-base"
            onClick={playWord}
          >
            <Play className="mr-1 h-4 w-4" /> Play word
          </Button>
          {!busy && preview && !preview.error && <span className="story-preview-tag story-preview-tag-action bg-story-valid/15 text-story-valid" title="Ink before Pens" aria-live="polite">
            <span>+{preview.ink?.toLocaleString()}</span><Droplet className="-mr-[2px] h-4 w-4" aria-label="Ink before Pens" />
          </span>}
        </div>
      </footer>

      {compact && story.phase === "bookstore" && <div className="story-continue">
        <span className="flex items-center gap-1.5 text-3xl font-black tabular-nums text-gold"><Coins className="h-7 w-7" />{story.coins}</span>
        <div className="flex items-center gap-2">
          <Button className="relative tile-gloss px-3" onClick={() => setStory(continueToNextPage(story))}>Continue Story <ArrowRight /></Button>
          <Button variant="outline" size="icon" aria-label="Bag and completed pages" onClick={() => setDialog({ kind: "bag" })}><Menu className="h-4 w-4" /></Button>
        </div>
      </div>}
      {/* Dialogs */}
      {showIntro ? <PageIntroDialog state={story} onStart={() => setIntroDismissed(story.pageIndex)} /> : null}
      {showEnd ? <StoryEndDialog state={story} won={story.phase === "victory"} onNewStory={startNewStory} /> : null}
      {pageStats ? <PageCompleteDialog stats={pageStats} onClose={visitBookstore} /> : null}
      {coinFlight && <span key={coinFlight.id} className="story-coin-flight text-gold" style={{ left: coinFlight.x, top: coinFlight.y, ["--dx" as string]: `${coinFlight.dx}px`, ["--dy" as string]: `${coinFlight.dy}px` }}>+{coinFlight.amount}</span>}
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
          price={priceFor(story.upgrades, story.offers?.[dialog.offerIndex]?.price ?? 0)}
          onPick={handleEnhancePick}
          onClose={() => setDialog(null)}
        />
      ) : null}

      <ScoreFlight flight={flight} />
      <ScoreConfetti burst={confetti} />
      <PenPurchaseFlight flight={penFlight} onArrive={() => { setArrivingPenId(penFlight?.penId ?? null); setPenFlight(null); }} />
      <ItemPurchaseFlight flight={itemFlight} state={story} onArrive={() => { setItemFlight(null); pulseSibble(); }} />
      {drag ? (() => {
        // Desktop: over the board, the dragged tile shrinks/grows to the board's cell size.
        const cell = layout === "desktop" && hoverIndex !== null
          ? document.querySelector<HTMLElement>(`[data-cell-index="${hoverIndex}"]`)
          : null;
        const cellSize = cell ? cell.getBoundingClientRect().width : null;
        const size = cellSize ?? 60; // 48px × scale-125 when off the board
        return (
          <div
            className="pointer-events-none fixed z-50"
            style={{ left: drag.x, top: drag.y, transform: "translate(-50%, -50%)" }}
          >
            <div
              className="tile-face relative flex rotate-[-6deg] items-center justify-center rounded-md font-bold shadow-2xl"
              style={{
                width: size,
                height: size,
                fontSize: size * 0.42,
                transition: "width 160ms ease-out, height 160ms ease-out, font-size 160ms ease-out",
              }}
            >
              {drag.letter === "?" ? "" : drag.letter}
              <span className="absolute bottom-0.5 right-1 font-semibold opacity-70" style={{ fontSize: Math.max(7, size * 0.17) }}>
                {drag.blank ? "" : LETTER_VALUES[drag.letter]}
              </span>
            </div>
          </div>
        );
      })() : null}
    </div>
  );
}
