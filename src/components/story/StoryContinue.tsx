// Story menu: Solo / Multiplayer entry points and the Continue Playing list.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Hourglass, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getPage } from "@/lib/story/boards";
import { loadStory } from "@/lib/story/storage";
import { actStoryMatch, createStoryMatch } from "@/lib/story/match.functions";
import type { PublicMatch } from "@/lib/story/multiplayer";

export interface FeedRow { match_id: string; player1: string; player2: string | null; status: string; version: number; public: PublicMatch; updated_at: string }

export function useMatchFeed(statuses: string[]) {
  const [rows, setRows] = useState<FeedRow[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data } = await supabase.from("story_match_feed").select("*").in("status", statuses).order("updated_at", { ascending: false }).limit(100);
      if (alive) { setUserId(auth.user?.id ?? null); setRows((data ?? []) as unknown as FeedRow[]); }
    };
    void load();
    const channel = supabase.channel(`story-feed-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "story_match_feed" }, () => void load()).subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses.join(",")]);
  return { rows, userId };
}

export function StoryContinue() {
  const navigate = useNavigate();
  const createFn = useServerFn(createStoryMatch);
  const actFn = useServerFn(actStoryMatch);
  const [busy, setBusy] = useState(false);
  const [solo, setSolo] = useState<ReturnType<typeof loadStory>>(null);
  useEffect(() => setSolo(loadStory()), []);
  const { rows, userId } = useMatchFeed(["waiting", "active"]);
  const soloActive = solo && (solo.phase === "play" || solo.phase === "bookstore");

  async function create() {
    setBusy(true);
    try { const r = await createFn(); navigate({ to: "/story/match/$matchId", params: { matchId: r.id } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not create a match."); setBusy(false); }
  }
  async function abandon(row: FeedRow) {
    if (!window.confirm(row.status === "waiting" ? "Cancel this invitation?" : "Abandon this match? It counts as a loss.")) return;
    try {
      const r = await actFn({ data: { id: row.match_id, version: row.version, action: { type: "abandon" } } });
      if ("error" in r && r.error) toast.error(r.error);
      if ("stale" in r) toast.message("The match changed — try again.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not abandon."); }
  }

  return <div className="mx-auto mt-6 w-full max-w-md space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <Button size="lg" asChild><Link to="/story/play"><BookOpen className="h-5 w-5" />Solo Story</Link></Button>
      <Button size="lg" variant="secondary" disabled={busy} onClick={create}><Users className="h-5 w-5" />Multiplayer</Button>
    </div>
    {(soloActive || (rows && rows.length > 0)) && <section aria-label="Continue Playing" className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Continue Playing</h2>
      {soloActive && <Card title="Solo Story" sub={pageLabel(solo.pageIndex)} action={<Button size="sm" asChild><Link to="/story/play">Continue</Link></Button>} />}
      {rows?.map((row) => {
        const p = row.public;
        const seat = row.player1 === userId ? 0 : 1;
        const opp = p.players[1 - seat];
        const mine = p.players[seat];
        const yourTurn = p.phase === "play" && p.turn === seat && (mine?.wordsLeft ?? 0) > 0;
        const shopping = p.phase === "bookstore" && !mine?.ready;
        const status = row.status === "waiting" ? "WAITING FOR OPPONENT TO JOIN" : yourTurn ? "YOUR TURN" : shopping ? "BOOKSTORE OPEN" : "WAITING FOR OPPONENT";
        const hot = yourTurn || shopping;
        return <Card key={row.match_id} hot={hot} title={opp ? `You vs ${opp.name}` : "Invitation sent"}
          sub={row.status === "waiting" ? "Share your link" : `${pageLabel(p.pageIndex)} · ${mine?.wins ?? 0}–${opp?.wins ?? 0}`}
          status={<span className={`flex items-center gap-1 text-xs font-black ${hot ? "text-gold" : "text-muted-foreground"}`}>{hot ? <Sparkles className="h-3.5 w-3.5" /> : <Hourglass className="h-3.5 w-3.5" />}{status}</span>}
          action={<div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => void abandon(row)}>{row.status === "waiting" ? "Cancel" : "Abandon"}</Button>
            <Button size="sm" variant={hot ? "default" : "outline"} asChild><Link to="/story/match/$matchId" params={{ matchId: row.match_id }}>{hot ? "Continue" : "View"}</Link></Button>
          </div>} />;
      })}
    </section>}
  </div>;
}

function pageLabel(pageIndex: number) {
  const c = getPage(pageIndex);
  return `Chapter ${c.chapter} · Page ${c.page}`;
}

function Card({ title, sub, status, action, hot }: { title: string; sub: string; status?: React.ReactNode; action: React.ReactNode; hot?: boolean }) {
  return <div className={`flex items-center gap-3 rounded-xl border bg-card p-3 text-left ${hot ? "ring-2 ring-gold" : ""}`}>
    <div className="min-w-0 flex-1"><div className="truncate font-bold">{title}</div><div className="text-xs text-muted-foreground">{sub}</div>{status}</div>
    {action}
  </div>;
}
