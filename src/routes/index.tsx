import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { fetchMyGames } from "@/lib/games";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tile Table — Play Scrabble online with no ads" },
      {
        name: "description",
        content:
          "Play a proper game of Scrabble with someone you like. Sign in with Google or Apple, share a link and start playing — no ads, no clutter.",
      },
      { property: "og:title", content: "Tile Table — Play Scrabble online with no ads" },
      {
        property: "og:description",
        content: "Sign in, send a link, play a full game of Scrabble with the official word list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const LETTERS = [
  { letter: "T", value: 1 },
  { letter: "I", value: 1 },
  { letter: "L", value: 1 },
  { letter: "E", value: 1 },
];

function Index() {
  const { user, loading } = useSession();
  const userId = user?.id ?? "";

  const games = useQuery({
    queryKey: ["games", userId],
    queryFn: () => fetchMyGames(userId),
    enabled: Boolean(userId),
  });
  const ongoing = (games.data ?? []).filter((game) => game.status !== "finished").slice(0, 5);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-8 flex gap-2">
        {LETTERS.map((tile) => (
          <span
            key={tile.letter}
            className="tile-face relative flex h-16 w-16 items-center justify-center rounded-lg text-3xl font-bold"
          >
            {tile.letter}
            <span className="absolute bottom-1 right-1.5 text-[0.65rem] font-semibold opacity-70">
              {tile.value}
            </span>
          </span>
        ))}
      </div>

      <h1 className="text-4xl font-bold sm:text-5xl">Tile Table</h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        A quiet place to play Scrabble with one other person. The full board, the official word
        list, and absolutely no adverts.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {loading ? null : user ? (
          <Button asChild size="lg">
            <Link to="/lobby">Go to your games</Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/auth">Sign in to play</Link>
          </Button>
        )}
      </div>

      <ul className="mt-12 grid gap-3 text-left text-sm text-muted-foreground sm:grid-cols-3">
        <li className="rounded-lg border border-border bg-card/60 p-4">
          Start a game and send the link to whoever you want to play.
        </li>
        <li className="rounded-lg border border-border bg-card/60 p-4">
          Every word is checked against the tournament English word list.
        </li>
        <li className="rounded-lg border border-border bg-card/60 p-4">
          Moves appear on the other person's board straight away.
        </li>
      </ul>
    </main>
  );
}
