import { createFileRoute, Link } from "@tanstack/react-router";
import { ModeMenu } from "@/components/ModeMenu";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/lobby")({
  head: () => ({
    meta: [
      { title: "Choose your game — Sibble" },
      { name: "description", content: "Choose Story Mode or Multiplayer on Sibble." },
      { property: "og:title", content: "Choose your game — Sibble" },
      { property: "og:description", content: "A word adventure or a game with friends: choose your Sibble mode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lobby,
});

function Lobby() {
  return (
    <main>
      <ModeMenu>
        <div className="flex w-full max-w-xs flex-col gap-4">
          <Button asChild variant="story" className="h-16 text-xl font-bold">
            <Link to="/story">Story Mode</Link>
          </Button>
          <Button asChild variant="multiplayer" className="h-16 text-xl font-bold">
            <Link to="/multiplayer">Multiplayer</Link>
          </Button>
        </div>
      </ModeMenu>
    </main>
  );
}
