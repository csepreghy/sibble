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
import { PenSidebar } from "@/components/story/PenSidebar";
import { getPage } from "@/lib/story/boards";
import { compactNumber } from "@/lib/story/format";
import { penSlots } from "@/lib/story/upgrades";
import { useStoryTheme } from "@/hooks/useStoryTheme";
import type { PendingPlacement, StoryTile } from "@/lib/story/types";
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
  const [seenPage, setSeenPage] = useState<number | null>(null);
  const versionRef = useRef(-1);

  const apply = useCallback((s: MatchSnapshot) => {
    if (s.version < versionRef.current) return;
    if (s.version !== versionRef.current) { setPending([]); setSelected(null); setDiscardSel([]); setDiscardMode(false); setRackOrder(null); }
    versionRef.current = s.version;
    setSnap(s);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await getFn({ data: { id: matchId } });
      if ("snapshot" in r) { apply(r.snapshot); setInvite(null); } else setInvite(r.invite);
    } catch (e) { setLoadError(e instanceof Error ? e.message : "Could not load this match."); }
  }, [getFn, matchId, apply]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const channel = supabase.channel(`story-match-${matchId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "story_match_feed", filter: `match_id=eq.${matchId}` }, (payload) => {
        const v = (payload.new as { version?: number } | null)?.version ?? 0;
        if (v > versionRef.current) void refresh();
      })
      .subscribe();
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => { void supabase.removeChannel(channel); document.removeEventListener("visibilitychange", onFocus); };
  }, [matchId, refresh]);

  async function act(action: MatchAction) {
    if (!snap || busy) return;
    setBusy(true);
    try {
      const r = await actFn({ data: { id: matchId, version: snap.version, action } });
      if ("error" in r && r.error) toast.error(r.error);
      if ("stale" in r) toast.message("The match was updated.");
      apply(r.snapshot);

    } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong."); void refresh(); }
    finally { setBusy(false); }
  }

  async function join() {
    setBusy(true);
    try { apply(await joinFn({ data: { id: matchId } })); setInvite(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not join."); void refresh(); }
    finally { setBusy(false); }
  }

  if (loadError) return <Centered><p className="text-muted-foreground">{loadError}</p><Button asChild><Link to="/story">Back to menu</Link></Button></Centered>;
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
  const pendingIds = new Set(pending.map((p) => p.tileId));
  const order = rackOrder ?? me.page.rack;
  const rackTiles = order.filter((id) => me.page.rack.includes(id) && !pendingIds.has(id)).map((id) => me.tiles.find((t) => t.id === id)!).filter(Boolean);

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

  function cellClick(index: number) {
    if (!myTurn || busy) return;
    const existing = pending.find((p) => p.index === index);
    if (existing) { setPending(pending.filter((p) => p !== existing)); return; }
    if (!selected || pub.board[index]) return;
    const tile = me.tiles.find((t) => t.id === selected);
    if (!tile) return;
    setSelected(null);
    if (tile.letter === "?") { setLetterFor({ kind: "blank", index, tileId: tile.id }); return; }
    setPending([...pending, { index, tileId: tile.id, letter: tile.letter, blank: false }]);
  }
  function rackSelect(id: string) {
    if (discardMode) { setDiscardSel(discardSel.includes(id) ? discardSel.filter((x) => x !== id) : [...discardSel, id]); return; }
    setSelected(selected === id ? null : id);
  }
  function chooseLetter(letter: string) {
    const target = letterFor;
    setLetterFor(null);
    if (!target) return;
    if (target.kind === "blank") setPending([...pending, { index: target.index, tileId: target.tileId, letter, blank: true }]);
    else void act({ type: "buy", offerIndex: target.offerIndex, letter });
  }

  const finished = pub.phase === "finished";
  const showPageResult = pub.lastPage && pub.phase === "bookstore" && seenPage !== pub.lastPage.pageIndex;
  const turnBanner = pub.phase === "play"
    ? myTurn ? <span className="flex items-center gap-2 text-gold"><Sparkles className="h-5 w-5" />YOUR TURN</span>
      : <span className="flex items-center gap-2 text-muted-foreground"><Hourglass className="h-5 w-5 animate-pulse" />{theirs?.name ?? "Opponent"}'S TURN</span>
    : pub.phase === "bookstore" ? (mine.ready ? <span className="flex items-center gap-2 text-muted-foreground"><Hourglass className="h-5 w-5 animate-pulse" />Waiting for {theirs?.name} to finish shopping</span> : <span>Bookstore — buy, then Ready</span>)
    : finished ? <span>Story over</span> : null;

  return <main className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-2 px-2 pb-3 pt-2">
    <header className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild aria-label="Back to menu"><Link to="/story"><ArrowLeft className="h-5 w-5" /></Link></Button>
      <div className="flex-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Chapter {config.chapter} · Page {config.page}{config.plotTwist ? " · Plot Twist" : ""}{pub.tiebreaks ? ` · Tie-breaker ${pub.tiebreaks}` : ""}
      </div>
      {!finished && <Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (window.confirm("Abandon this match? It counts as a loss.")) void act({ type: "abandon" }); }}>Abandon</Button>}
    </header>
    <section aria-label="Scores" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border bg-card p-2">
      <PlayerPanel name="You" ink={mine.ink} words={mine.wordsLeft} active={pub.phase === "play" && pub.turn === seat} />
      <div className="text-center"><div className="text-[10px] uppercase text-muted-foreground">Pages</div><div className="font-display text-2xl font-black tabular-nums">{mine.wins}–{theirs?.wins ?? 0}</div></div>
      <PlayerPanel name={theirs?.name ?? "Opponent"} ink={theirs?.ink ?? 0} words={theirs?.wordsLeft ?? 0} active={pub.phase === "play" && pub.turn !== seat} right />
    </section>
    <div className={`rounded-lg py-2 text-center font-display text-lg font-black ${myTurn ? "bg-gold/15 ring-2 ring-gold" : "bg-muted"}`} role="status">{turnBanner}</div>
    {pub.lastMove && pub.phase === "play" && <p className="text-center text-xs text-muted-foreground">
      {pub.lastMove.seat === seat ? "You" : theirs?.name} {pub.lastMove.pass ? "passed" : <>played {pub.lastMove.words.join(", ")} for <strong className="text-base-ink">{compactNumber(pub.lastMove.ink)}</strong> Ink</>}
    </p>}

    {pub.phase === "bookstore" ? <>
      <div className="flex items-center justify-center gap-2 font-black text-gold"><Coins className="h-5 w-5" />{me.coins}</div>
      <Bookstore state={me} compact onBuy={(i) => {
        const offer = me.offers?.[i];
        if (offer?.kind === "enhancement") setLetterFor({ kind: "enh", offerIndex: i });
        else void act({ type: "buy", offerIndex: i });
      }} />
      <Button size="lg" disabled={busy || mine.ready} onClick={() => void act({ type: "ready" })}>{mine.ready ? "Ready — waiting…" : "Ready"}</Button>
    </> : <>
      <div className="mx-auto w-full max-w-[min(100%,70dvh)]">
        <StoryBoard compact size={config.size} board={pub.board} tiles={allTiles} premiums={config.premiums} usedPremiums={pub.usedPremiums}
          pending={pending} letterUpgrades={me.letterUpgrades} disabled={!myTurn || busy} onCellClick={cellClick} />
      </div>
      <StoryRack compact capacity={me.upgrades.includes("bigger-rack") ? 8 : 7} tiles={rackTiles} selectedId={selected} discardMode={discardMode}
        discardSelection={discardSel} letterUpgrades={me.letterUpgrades} onSelect={rackSelect} />
      {!finished && <div className="flex flex-wrap justify-center gap-2">
        {discardMode ? <>
          <Button disabled={!myTurn || busy || !discardSel.length} onClick={() => void act({ type: "discard", tileIds: discardSel })}>Discard {discardSel.length}</Button>
          <Button variant="ghost" onClick={() => { setDiscardMode(false); setDiscardSel([]); }}>Cancel</Button>
        </> : <>
          <Button disabled={!myTurn || busy || !pending.length} onClick={() => void act({ type: "play", placements: pending })}>Play word</Button>
          <Button variant="outline" size="icon" aria-label="Recall letters" disabled={!pending.length} onClick={() => setPending([])}><Undo2 className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" aria-label="Shuffle" onClick={() => setRackOrder([...me.page.rack].sort(() => Math.random() - 0.5))}><Shuffle className="h-4 w-4" /></Button>
          <Button variant="outline" disabled={!myTurn || busy || me.page.discardsLeft <= 0} onClick={() => { setPending([]); setDiscardMode(true); }}>Discard ({me.page.discardsLeft})</Button>
          <Button variant="ghost" disabled={!myTurn || busy} onClick={() => { if (window.confirm("Pass and give up this word play?")) void act({ type: "pass" }); }}>Pass</Button>
        </>}
      </div>}
    </>}
    <PenSidebar horizontal pens={me.pens} slots={penSlots(me.upgrades)} onInspect={(pen) => pub.phase === "bookstore" && window.confirm("Sell this Pen?") && void act({ type: "sell", penId: pen.penId })}
      onReorder={(a, b) => { const ids = me.pens.map((p) => p.penId); const from = ids.indexOf(a); const to = ids.indexOf(b); ids.splice(to, 0, ids.splice(from, 1)[0]!); void act({ type: "reorder", order: ids }); }} disabled={busy} />

    <Dialog open={!!letterFor} onOpenChange={(o) => !o && setLetterFor(null)}>
      <DialogContent><DialogHeader><DialogTitle>{letterFor?.kind === "blank" ? "Choose a letter for the blank" : "Choose a letter to enhance"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-7 gap-1.5">{LETTERS.map((l) => <Button key={l} variant="outline" onClick={() => chooseLetter(l)}>{l}</Button>)}</div>
      </DialogContent>
    </Dialog>

    <Dialog open={!!showPageResult} onOpenChange={(o) => !o && setSeenPage(pub.lastPage?.pageIndex ?? null)}>
      {pub.lastPage && <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-2xl">PAGE COMPLETE</DialogTitle>
          <DialogDescription>{pub.lastPage.winner === seat ? "You win this Page!" : `${theirs?.name} wins this Page.`}</DialogDescription></DialogHeader>
        <ResultRows you={pub.lastPage.ink[seat]} them={pub.lastPage.ink[1 - seat]!} name={theirs?.name ?? "Opponent"} coins={[pub.lastPage.coins[seat], pub.lastPage.coins[1 - seat]!]} />
        <p className="text-center font-display text-xl font-black">Page victories: {mine.wins}–{theirs?.wins ?? 0}</p>
        <Button onClick={() => setSeenPage(pub.lastPage!.pageIndex)}>To the Bookstore</Button>
      </DialogContent>}
    </Dialog>

    <Dialog open={finished}>
      <DialogContent className="text-center">
        <DialogHeader><DialogTitle className="flex items-center justify-center gap-2 font-display text-3xl">{pub.winner === seat ? <><Crown className="h-7 w-7 text-gold" />STORY CHAMPION!</> : "The Story ends"}</DialogTitle>
          <DialogDescription>{pub.abandonedBy != null ? (pub.abandonedBy === seat ? "You abandoned this match." : `${theirs?.name} abandoned the match.`)
            : pub.winner === seat ? "You won five Pages first." : `${theirs?.name} won five Pages first. Well fought!`}</DialogDescription></DialogHeader>
        <p className="font-display text-2xl font-black">{mine.wins}–{theirs?.wins ?? 0}</p>
        <p className="text-sm text-muted-foreground">Total Ink — You {compactNumber(mine.totalInk)} · {theirs?.name} {compactNumber(theirs?.totalInk ?? 0)}</p>
        <div className="flex justify-center gap-2">
          <Button disabled={busy} onClick={async () => { setBusy(true); try { const r = await rematchFn({ data: { id: matchId } }); navigate({ to: "/story/match/$matchId", params: { matchId: r.id } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Rematch failed"); } finally { setBusy(false); } }}>Rematch</Button>
          <Button variant="outline" asChild><Link to="/story">Main Menu</Link></Button>
        </div>
      </DialogContent>
    </Dialog>
  </main>;
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
