import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteGame, type GameRow } from "@/lib/games";
import { Button } from "@/components/ui/button";

export function visibleGames(games: GameRow[] | undefined, userId: string) {
  return (games ?? []).filter(
    (game) => !game.state?.hiddenFor?.includes(game.player1 === userId ? 0 : 1),
  );
}

export function GameCard({ game, userId }: { game: GameRow; userId: string }) {
  const queryClient = useQueryClient();
  const names: [string, string] = [
    game.player1_name,
    game.player2 ? game.player2_name : "waiting for a player",
  ];
  const scores = game.state?.scores ?? [0, 0];
  const history = game.state?.history ?? [];
  const last = history[history.length - 1] ?? null;
  const seat: 0 | 1 = game.player1 === userId ? 0 : 1;
  const yourTurn = game.status === "active" && (game.solo || game.state?.turn === seat);

  const remove = useMutation({
    mutationFn: () => deleteGame(game.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games", userId] });
      toast.message("Game deleted.");
    },
    onError: () => toast.error("Couldn't delete the game. Please try again."),
  });

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/game/$gameId"
        params={{ gameId: game.id }}
        className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
      >
        <div className="min-w-0">
          <p className="font-semibold">
            {game.solo ? "Solo practice board" : `${names[0]} vs ${names[1]}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {scores[0]} – {scores[1]} · {game.status === "finished" ? "finished" : game.status}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {last
              ? `Last move: ${names[last.player]} — ${last.description} (${last.score} points)`
              : "No moves yet"}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-primary">
          {game.status === "finished" ? "View" : yourTurn ? "Your move" : "Open"}
        </span>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete game"
        disabled={remove.isPending}
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => {
          if (window.confirm("Delete this game? This can't be undone.")) remove.mutate();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
