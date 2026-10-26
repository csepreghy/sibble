import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ThemeSelector } from "@/components/ThemeSelector";
import { NotificationToggle } from "@/components/NotificationToggle";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { createGame, displayNameOf } from "@/lib/games";
import { newStory } from "@/lib/story/engine";
import { loadStory, saveStory } from "@/lib/story/storage";
import { loadStoryStats, recordStoryStarted, saveStoryStats } from "@/lib/story/stats";
import { cn } from "@/lib/utils";

const TABS = {
  sibble: [
    { to: "/lobby", label: "Home" },
    { to: "/history", label: "History" },
    { to: "/stats", label: "Statistics" },
  ],
  story: [
    { to: "/story", label: "Home" },
    { to: "/story/history", label: "History" },
    { to: "/story/stats", label: "Statistics" },
  ],
} as const;

export function AppNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const mode = pathname.startsWith("/story") ? "story" : "sibble";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? "";
  const [hasRun] = useState(() => {
    const saved = loadStory();
    return Boolean(saved && saved.phase !== "victory" && saved.phase !== "defeat");
  });

  const start = useMutation({
    mutationFn: () => createGame({ userId, name: displayNameOf(user), solo: false }),
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ["games", userId] });
      navigate({ to: "/game/$gameId", params: { gameId: game.id } });
    },
    onError: () => toast.error("Couldn't start the game. Please try again."),
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
    },
    onSuccess: () => navigate({ to: "/", replace: true }),
    onError: () => toast.error("Couldn't sign you out. Please try again."),
  });

  function startStory() {
    if (hasRun) {
      navigate({ to: "/story/play" });
      return;
    }
    const fresh = newStory();
    saveStory(fresh);
    saveStoryStats(recordStoryStarted(loadStoryStats()));
    navigate({ to: "/story/play" });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <nav className="flex gap-1 rounded-full border border-border bg-secondary/60 p-1">
        {TABS[mode].map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground" }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {mode === "sibble" ? (
        <Button size="sm" disabled={start.isPending || !userId} onClick={() => start.mutate()}>
          <Plus className="mr-1 h-4 w-4" /> New game
        </Button>
      ) : (
        <Button size="sm" onClick={startStory}>
          <Sparkles className="mr-1 h-4 w-4" /> {hasRun ? "Continue Story" : "Start Story"}
        </Button>
      )}
      <div className="flex rounded-full border border-border bg-secondary/60 p-1 text-sm font-semibold" role="group" aria-label="Game mode">
        <button
          type="button"
          onClick={() => mode !== "sibble" && navigate({ to: "/lobby" })}
          className={cn(
            "rounded-full px-3 py-1.5 transition-colors",
            mode === "sibble" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sibble
        </button>
        <button
          type="button"
          onClick={() => mode !== "story" && navigate({ to: "/story" })}
          className={cn(
            "rounded-full px-3 py-1.5 transition-colors",
            mode === "story" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Story Mode
        </button>
      </div>
      <NotificationToggle />
      {mode === "sibble" && <ThemeSelector />}
      <Button
        size="sm"
        variant="destructive"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
        aria-label="Sign out"
      >
        <LogOut className="mr-1 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
