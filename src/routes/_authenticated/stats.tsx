import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSession } from "@/hooks/useSession";
import { computeStats, fetchMyGames, type GameRow } from "@/lib/games";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Your statistics — Tile Table" },
      {
        name: "description",
        content: "Wins, losses, best words and head-to-head records for every Tile Table game you've played.",
      },
      { property: "og:title", content: "Your statistics — Tile Table" },
      { property: "og:description", content: "Your Scrabble history and head-to-head records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stats,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function whenText(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Stats() {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const games = useQuery({
    queryKey: ["games", userId],
    queryFn: () => fetchMyGames(userId),
    enabled: Boolean(userId),
  });

  const rows: GameRow[] = useMemo(() => games.data ?? [], [games.data]);
  const stats = useMemo(() => computeStats(rows, userId), [rows, userId]);
  const history = rows.filter((game) => !game.solo);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Statistics</h1>
        <AppNav />
      </header>

      {games.isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : stats.played === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          Nothing to show yet. Play a game with someone and your record will appear here.
        </p>
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Games" value={stats.played} />
            <Stat label="Won" value={stats.wins} />
            <Stat label="Lost" value={stats.losses} />
            <Stat label="Still going" value={stats.ongoing} />
            <Stat label="Points scored" value={stats.pointsFor} />
            <Stat label="Points against" value={stats.pointsAgainst} />
            <Stat label="Best single move" value={stats.bestScore} />
            <Stat
              label="Average per game"
              value={stats.played ? Math.round(stats.pointsFor / stats.played) : 0}
            />
          </section>

          {stats.bestWord ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Your best move so far: <span className="font-semibold text-foreground">{stats.bestWord.word}</span> for{" "}
              {stats.bestWord.score} points.
            </p>
          ) : null}

          <section className="mt-10">
            <h2 className="text-lg font-bold">One-on-ones</h2>
            <div className="mt-3 space-y-2">
              {stats.opponents.map((opponent) => (
                <div
                  key={opponent.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <p className="font-semibold">{opponent.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {opponent.played} {opponent.played === 1 ? "game" : "games"} · {opponent.pointsFor} –{" "}
                      {opponent.pointsAgainst} points
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {opponent.wins}W · {opponent.losses}L
                    {opponent.draws ? ` · ${opponent.draws}D` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-bold">History</h2>
            <div className="mt-3 space-y-2">
              {history.map((game) => {
                const seat = game.player1 === userId ? 0 : 1;
                const other = seat === 0 ? 1 : 0;
                const scores = game.state?.scores ?? [0, 0];
                const opponentName = other === 0 ? game.player1_name : game.player2_name;
                const finished = game.status === "finished";
                const resignedBy = game.state?.resignedBy;
                const result = !finished
                  ? "in progress"
                  : resignedBy === seat
                    ? "gave up"
                    : resignedBy === other
                      ? "won — opponent gave up"
                      : scores[seat]! > scores[other]!
                        ? "won"
                        : scores[seat]! < scores[other]!
                          ? "lost"
                          : "drew";
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-sm"
                  >
                    <div>
                      <p className="font-semibold">vs {opponentName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {whenText(game.updated_at)} · {result}
                      </p>
                    </div>
                    <p className="font-bold">
                      {scores[seat]} – {scores[other]}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
