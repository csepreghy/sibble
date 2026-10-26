import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { fetchMyGames } from "@/lib/games";
import { AppNav } from "@/components/AppNav";
import { BrandLogo } from "@/components/BrandLogo";
import { GameCard, visibleGames } from "@/components/GameCard";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Game history — Sibble" },
      { name: "description", content: "Every Scrabble game you've played on Sibble." },
      { property: "og:title", content: "Game history — Sibble" },
      { property: "og:description", content: "Browse your past and ongoing games." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: History,
});

function History() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const games = useQuery({
    queryKey: ["games", userId],
    queryFn: () => fetchMyGames(userId),
    enabled: Boolean(userId),
  });
  const visible = visibleGames(games.data, userId);
  const ongoing = visible.filter((g) => g.status !== "finished");
  const done = visible.filter((g) => g.status === "finished");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <BrandLogo className="mb-6 h-12 w-auto sm:h-14" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Game history</h1>
        <AppNav />
      </header>
      {games.isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No games yet.
        </p>
      ) : null}
      {ongoing.length > 0 ? (
        <section className="mt-10 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">In progress</h2>
          {ongoing.map((g) => <GameCard key={g.id} game={g} userId={userId} />)}
        </section>
      ) : null}
      {done.length > 0 ? (
        <section className="mt-10 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Finished</h2>
          {done.map((g) => <GameCard key={g.id} game={g} userId={userId} />)}
        </section>
      ) : null}
    </main>
  );
}
