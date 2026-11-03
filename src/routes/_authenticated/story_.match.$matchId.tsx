import { acceptSnapshot, CelebrationLedger, pageCompletionKey, stillCurrent } from "@/lib/story/mpPresentation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Coins, Copy, Crown, Droplet, Hourglass, Shuffle, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StoryBoard } from "@/components/story/StoryBoard";
import { StoryRack } from "@/components/story/StoryRack";
import { Bookstore } from "@/components/story/Bookstore";
import { StoryPlayScreen, type MpDriver } from "@/components/story/StoryPlayScreen";
import { getPage, TWIST_INFO } from "@/lib/story/boards";
import { penDef } from "@/lib/story/pens";
import { PenDescription, PenCurrentBonus } from "@/components/story/PenDescription";
import { ShopDetailTile } from "@/components/story/ShopDetailTile";
import { compactNumber } from "@/lib/story/format";
import { penSlots } from "@/lib/story/upgrades";
import { useStoryTheme } from "@/hooks/useStoryTheme";
import type { PenInstance, PendingPlacement, StoryState, StoryTile } from "@/lib/story/types";
import {
  actStoryMatch, getStoryMatch, joinStoryMatch, rematchStoryMatch, type MatchAction, type MatchSnapshot,
} from "@/lib/story/match.functions";

export const Route = createFileRoute("/_authenticated/story_/match/$matchId")({
  head: () => ({
    meta: [
      { title: "Multiplayer Story — Sibble" },
      { name: "description", content: "Compete with a friend on a shared SibbleBook board: first to win five Pages." },
      { property: "og:title", content: "Multiplayer Story — Sibble" },
      { property: "og:description", content: "Join a two-player SibbleBook Story and race to five Page victories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchPage,
});

type Invite = { host: string; open: boolean; cancelled: boolean };
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function MatchPage() {
  useStoryTheme();
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getStoryMatch);
  const joinFn = useServerFn(joinStoryMatch);
  const actFn = useServerFn(actStoryMatch);
  const rematchFn = useServerFn(rematchStoryMatch);
  const [snap, setSnap] = useState<MatchSnapshot | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingPlacement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [discardMode, setDiscardMode] = useState(false);
  const [discardSel, setDiscardSel] = useState<string[]>([]);
  const [rackOrder, setRackOrder] = useState<string[] | null>(null);
  const [letterFor, setLetterFor] = useState<{ kind: "blank"; index: number; tileId: string } | { kind: "enh"; offerIndex: number } | null>(null);
  const [hold, setHold] = useState(false);
  const [seenPage, setSeenPage] = useState<number | null>(null);
  const [inspect, setInspect] = useState<PenInstance | null>(null);
  const versionRef = useRef(-1);
  const idRef = useRef(matchId);
  // A new match ID (rematch/navigation) starts from a clean slate; answers for the old ID are ignored.
  const ledger = useRef(new CelebrationLedger());
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const seenMove = useRef<number | null>(null);
  if (idRef.current !== matchId) {
    idRef.current = matchId; versionRef.current = -1; ledger.current.reset();
    chain.current = Promise.resolve(); seenMove.current = null;
  }
  useEffect(() => {
    setSnap(null); setInvite(null); setLoadError(null); setPending([]); setSelected(null);
    setDiscardSel([]); setDiscardMode(false); setRackOrder(null); setLetterFor(null); setSeenPage(null); setHold(false); setBusy(false);
  }, [matchId]);

  const apply = useCallback((s: MatchSnapshot) => {
    if (!acceptSnapshot(idRef.current, versionRef.current, s)) return;
    ledger.current.observe(s);
    if (s.version !== versionRef.current) { setPending([]); setSelected(null); setDiscardSel([]); setDiscardMode(false); setRackOrder(null); }
    versionRef.current = s.version;
    setSnap(s);
  }, []);

  const refresh = useCallback(async () => {
    const id = matchId;
    try {
      const r = await getFn({ data: { id } });
      if (id !== idRef.current) return;
      setLoadError(null);
      if ("snapshot" in r) { apply(r.snapshot); setInvite(null); } else setInvite(r.invite);
    } catch (e) { if (id === idRef.current) setLoadError(e instanceof Error ? e.message : "Could not load this match."); }
  }, [getFn, matchId, apply]);

  useEffect(() => {
    // Refresh once subscribed (covers changes made before the channel was live) and on every reconnect.
    const channel = supabase.channel(`story-match-${matchId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "story_match_feed", filter: `match_id=eq.${matchId}` }, (payload) => {
        const v = (payload.new as { version?: number } | null)?.version ?? 0;
        if (v > versionRef.current) void refresh();
      })
      .subscribe((status) => { if (status === "SUBSCRIBED") void refresh(); });
    void refresh();
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    const onOnline = () => void refresh();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("online", onOnline);
    return () => { void supabase.removeChannel(channel); document.removeEventListener("visibilitychange", onFocus); window.removeEventListener("online", onOnline); };
  }, [matchId, refresh]);

  async function act(action: MatchAction) {
    setBusy(true);
    try { await send(action); } finally { setBusy(false); }
  }

  async function join() {
    setBusy(true);
    try { apply(await joinFn({ data: { id: matchId } })); setInvite(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not join."); void refresh(); }
    finally { setBusy(false); }
  }

  const snapRef = useRef(snap);
  snapRef.current = snap;
  // Serialized intents: each one uses the newest version, so quick purchases never collide as stale.
  function send(action: MatchAction): Promise<MatchSnapshot | null> {
    const origin = matchId;
    const run = async () => {
      const cur = snapRef.current;
      if (!cur || !stillCurrent(origin, idRef.current) || cur.id !== origin) return null;
      try {
        const r = await actFn({ data: { id: cur.id, version: cur.version, action } });
        if (!stillCurrent(origin, idRef.current)) return null;
        apply(r.snapshot);
        snapRef.current = r.snapshot;
        if ("error" in r && r.error) { toast.error(r.error); return null; }
        if ("stale" in r) { toast.message("The match was updated."); return null; }
        return r.snapshot;
      } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong."); void refresh(); return null; }
    };
    const queue = chain.current;
    const p = queue.then(run, run);
    chain.current = p;
    return p;
  }
  const view = useMemo<StoryState | null>(() => {
    if (!snap?.me) return null;
    const me = snap.me.state, pub = snap.public;
    const tiles = [...me.tiles, ...pub.boardTiles.filter((t) => !me.tiles.some((m) => m.id === t.id))];
    const phase = pub.phase === "bookstore" ? "bookstore" : pub.phase === "finished" ? (pub.winner === snap.seat ? "victory" : "defeat") : "play";
    return { ...me, tiles, phase, page: { ...me.page, board: pub.board, usedPremiums: pub.usedPremiums } } as StoryState;
  }, [snap]);

  if (loadError && !snap) return <Centered><p className="text-muted-foreground">{loadError}</p><Button asChild><Link to="/story">Back to menu</Link></Button></Centered>;
  if (invite) return <Centered>
    <h1 className="font-display text-3xl font-black">Multiplayer Story</h1>
    {invite.open ? <><p className="text-muted-foreground"><strong className="text-foreground">{invite.host}</strong> invited you to a SibbleBook duel. First to win five Pages.</p>
      <Button size="lg" disabled={busy} onClick={join}>Join the Story</Button></>
      : <p className="text-muted-foreground">{invite.cancelled ? "This invitation was cancelled." : "This invitation has already been accepted."}</p>}
    <Button variant="ghost" asChild><Link to="/story">Back to menu</Link></Button>
  </Centered>;
  if (!snap || !snap.me) return <Centered><p className="text-muted-foreground">Loading match…</p></Centered>;

  const pub = snap.public;
  const me = snap.me.state;
  const seat = snap.seat;
  const mine = pub.players[seat]!;
  const theirs = pub.players[1 - seat];
  const config = getPage(pub.pageIndex);
  const myTurn = pub.phase === "play" && pub.turn === seat && mine.wordsLeft > 0;
  const allTiles: StoryTile[] = [...me.tiles, ...pub.boardTiles.filter((t) => !me.tiles.some((m) => m.id === t.id))];

  if (pub.phase === "lobby") {
    const link = typeof window !== "undefined" ? `${window.location.origin}/story/match/${matchId}` : "";
    return <Centered>
      <h1 className="font-display text-3xl font-black">Invite a friend</h1>
      <p className="text-muted-foreground">Share this link. The match starts as soon as they join — you can leave and come back.</p>
      <div className="flex w-full max-w-md gap-2"><input readOnly value={link} className="min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" aria-label="Invitation link" />
        <Button onClick={() => { void navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy className="h-4 w-4" />Copy Link</Button></div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Hourglass className="h-4 w-4 animate-pulse" />Waiting for your opponent…</p>
      <div className="flex gap-2"><Button variant="ghost" asChild><Link to="/story">Back to menu</Link></Button>
        <Button variant="outline" disabled={busy} onClick={async () => { if (window.confirm("Cancel this invitation?")) { await act({ type: "abandon" }); navigate({ to: "/story" }); } }}>Cancel invitation</Button></div>
    </Centered>;
  }

  const finished = pub.phase === "finished";
  const showPageResult = pub.lastPage && pub.phase === "bookstore" && seenPage !== pub.lastPage.pageIndex;
  const status = pub.phase === "play"
    ? myTurn ? <span className="flex items-center gap-1 text-gold"><Sparkles className="h-4 w-4" />YOUR TURN</span>
      : <span className="flex items-center gap-1 text-muted-foreground"><Hourglass className="h-4 w-4 animate-pulse" />{(theirs?.name ?? "Opponent").toUpperCase()}'S TURN</span>
    : pub.phase === "bookstore" ? (mine.ready ? <span className="flex items-center gap-1 text-muted-foreground"><Hourglass className="h-4 w-4 animate-pulse" />Waiting for {theirs?.name}</span> : <span>Shop, then Ready</span>)
    : <span>Story over</span>;
  const header = <div className="story-mp-bar flex items-center gap-2 px-3 pt-2 text-xs font-bold" role="status">
    <Button variant="ghost" size="icon" className="h-7 w-7" asChild aria-label="Back to menu"><Link to="/story"><ArrowLeft className="h-4 w-4" /></Link></Button>
    <span className="truncate">{mine.name} <span className="font-display text-base tabular-nums">{mine.wins}–{theirs?.wins ?? 0}</span> {theirs?.name}</span>
    <span className="text-muted-foreground tabular-nums" title="Word plays left">{mine.wordsLeft}w · {theirs?.wordsLeft ?? 0}w</span>
    {pub.tiebreaks ? <span className="text-accent">Tie-breaker</span> : null}
    <span className="ml-auto">{status}</span>
    {!finished && <Button variant="ghost" size="sm" className="h-7 px-2" disabled={busy} onClick={() => { if (window.confirm("Abandon this match? It counts as a loss.")) void send({ type: "abandon" }); }}>Abandon</Button>}
  </div>;
  const remoteKey = ledger.current.pending(snap);
  const driver: MpDriver = {
    state: view!, canAct: myTurn, isReady: mine.ready, opponentName: theirs?.name ?? "Opponent", opponentInk: theirs?.ink ?? 0, header,
    play: async (placements) => {
      const beforePage = pub.pageIndex;
      setHold(true);
      const next = await send({ type: "play", placements });
      if (!next) { setHold(false); return { error: "That word wasn't accepted." }; }
      const lm = next.public.lastMove;
      if (lm?.id != null && seenMove.current != null && lm.id <= seenMove.current) { setHold(false); return { error: "That move was already shown." }; }
      seenMove.current = lm?.id ?? seenMove.current;
      const done = next.public.phase !== "play" || next.public.pageIndex !== beforePage;
      // This client presents the completion itself; don't present it again as a remote Page.
      const k = pageCompletionKey(next);
      if (done && k) ledger.current.claim(k);
      return { events: lm?.events ?? [], ink: lm?.ink ?? 0, pageCompleted: done, coins: done ? next.public.lastPage?.coins[seat] ?? 0 : 0 };
    },
    discard: async (ids) => !!(await send({ type: "discard", tileIds: ids })),
    buy: async (i, letter) => !!(await send({ type: "buy", offerIndex: i, ...(letter ? { letter } : {}) })),
    sell: async (penId) => !!(await send({ type: "sell", penId })),
    reorder: async (order) => !!(await send({ type: "reorder", order })),
    ready: async () => !!(await send({ type: "ready" })),
    pass: () => { if (window.confirm("Pass and give up this word play?")) void send({ type: "pass" }); },
    settled: () => setHold(false),
    remotePage: remoteKey ? { key: remoteKey, coins: pub.lastPage?.coins[seat] ?? 0 } : undefined,
    claimRemote: (key) => { if (!ledger.current.claim(key)) return false; setHold(true); return true; },
    opponentWordsLeft: theirs?.wordsLeft ?? 0,
    shopCoins: pub.lastPage?.coins[seat] ?? 0,
  };

  return <>
    <StoryPlayScreen key={snap.id} mp={driver} />
    <Dialog open={!!showPageResult && !hold && !remoteKey} onOpenChange={(o) => !o && setSeenPage(pub.lastPage?.pageIndex ?? null)}>
      {pub.lastPage && <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-2xl">PAGE COMPLETE</DialogTitle>
          <DialogDescription>{pub.lastPage.winner === seat ? "You win this Page!" : `${theirs?.name} wins this Page.`}</DialogDescription></DialogHeader>
        <ResultRows you={pub.lastPage.ink[seat]} them={pub.lastPage.ink[1 - seat]!} name={theirs?.name ?? "Opponent"} coins={[pub.lastPage.coins[seat], pub.lastPage.coins[1 - seat]!]} />
        <p className="text-center font-display text-xl font-black">Page victories: {mine.wins}–{theirs?.wins ?? 0}</p>
        <Button onClick={() => setSeenPage(pub.lastPage!.pageIndex)}>To the Bookstore</Button>
      </DialogContent>}
    </Dialog>

    <Dialog open={finished && !hold && !remoteKey}>
      <DialogContent className="text-center">
        <DialogHeader><DialogTitle className="flex items-center justify-center gap-2 font-display text-3xl">{pub.winner === seat ? <><Crown className="h-7 w-7 text-gold" />STORY CHAMPION!</> : "The Story ends"}</DialogTitle>
          <DialogDescription>{pub.abandonedBy != null ? (pub.abandonedBy === seat ? "You abandoned this match." : `${theirs?.name} abandoned the match.`)
            : pub.winner === seat ? `${mine.name} won five Pages first — champion!` : `${theirs?.name} won five Pages first. Well fought!`}</DialogDescription></DialogHeader>
        <p className="font-display text-2xl font-black">{mine.wins}–{theirs?.wins ?? 0}</p>
        <p className="text-sm text-muted-foreground">Total Ink — You {compactNumber(mine.totalInk)} · {theirs?.name} {compactNumber(theirs?.totalInk ?? 0)}</p>
        <div className="flex justify-center gap-2">
          <Button disabled={busy} onClick={async () => { setBusy(true); try { const r = await rematchFn({ data: { id: matchId } }); navigate({ to: "/story/match/$matchId", params: { matchId: r.id } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Rematch failed"); } finally { setBusy(false); } }}>Rematch</Button>
          <Button variant="outline" asChild><Link to="/story">Main Menu</Link></Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">{children}</main>;
}

function PlayerPanel({ name, ink, words, active, right }: { name: string; ink: number; words: number; active: boolean; right?: boolean }) {
  return <div className={`min-w-0 rounded-lg p-1.5 ${right ? "text-right" : ""} ${active ? "bg-gold/10 ring-1 ring-gold" : ""}`}>
    <div className="truncate text-sm font-bold">{name}</div>
    <div className={`flex items-center gap-1 font-display text-xl font-black tabular-nums text-base-ink ${right ? "justify-end" : ""}`}>{compactNumber(ink)}<Droplet className="h-4 w-4" /></div>
    <div className="text-[11px] text-muted-foreground">{words} word{words === 1 ? "" : "s"} left</div>
  </div>;
}

function ResultRows({ you, them, name, coins }: { you: number; them: number; name: string; coins: [number, number] }) {
  const rows = useMemo(() => [["You", you, coins[0]], [name, them, coins[1]]] as const, [you, them, name, coins]);
  return <div className="space-y-1">{rows.map(([n, ink, c]) => <div key={n} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
    <span className="font-bold">{n}</span><span className="flex items-center gap-3 tabular-nums"><span className="flex items-center gap-1 text-base-ink">{compactNumber(ink)}<Droplet className="h-3.5 w-3.5" /></span><span className="flex items-center gap-1 text-gold">+{c}<Coins className="h-3.5 w-3.5" /></span></span>
  </div>)}</div>;
}
