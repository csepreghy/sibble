import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Play, History, ChartNoAxesCombined, User, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MenuSettings } from "@/components/MenuSettings";
import { CollectionDialog } from "@/components/story/CollectionDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { createGame, displayNameOf } from "@/lib/games";
import { newStory } from "@/lib/story/engine";
import { loadStory, saveStory } from "@/lib/story/storage";
import { loadStoryStats, recordStoryStarted, saveStoryStats } from "@/lib/story/stats";

export function SignOutButton() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
    },
    onSuccess: () => navigate({ to: "/", replace: true }),
    onError: () => toast.error("Couldn't sign you out. Please try again."),
  });
  return (
    <Button size="sm" variant="destructive" className="fixed right-4 top-4 z-50 shadow-md" disabled={signOut.isPending} onClick={() => signOut.mutate()} aria-label="Sign out">
      <LogOut /> Sign out
    </Button>
  );
}

export function AppNav({ showSignOut = true }: { showSignOut?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const story = pathname.startsWith("/story");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? "";
  const [hasRun, setHasRun] = useState(false);
  useEffect(() => {
    const saved = loadStory();
    setHasRun(Boolean(saved && saved.phase !== "victory" && saved.phase !== "defeat"));
  }, []);

  const start = useMutation({
    mutationFn: (solo: boolean) => createGame({ userId, name: displayNameOf(user), solo }),
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ["games", userId] });
      navigate({ to: "/game/$gameId", params: { gameId: game.id } });
    },
    onError: () => toast.error("Couldn't start the game. Please try again."),
  });

  function startStory() {
    const fresh = newStory();
    saveStory(fresh);
    saveStoryStats(recordStoryStarted(loadStoryStats()));
    navigate({ to: "/story/play" });
  }

  const tabs = story
    ? [{ to: "/story/history", label: "History", icon: History }, { to: "/story/stats", label: "Statistics", icon: ChartNoAxesCombined }] as const
    : [{ to: "/history", label: "History", icon: History }, { to: "/stats", label: "Statistics", icon: ChartNoAxesCombined }] as const;

  return (
    <>
      <nav aria-label={story ? "Story menu" : "Multiplayer menu"} className="flex max-w-full flex-wrap items-center justify-center gap-1 sm:gap-2">
        {story && !hasRun ? (
          <Button size="sm" variant="story" disabled={start.isPending || !userId} className="h-10 px-3 text-sm sm:px-5" onClick={startStory}>
            <Play /> Play
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant={story ? "story" : "multiplayer"} disabled={start.isPending || !userId} className="h-10 px-3 text-sm sm:px-5">
                <Play /> Play
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {story ? (
                <>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/story/play" })}><Play /> Continue Story</DropdownMenuItem>
                  <DropdownMenuItem onSelect={startStory}><Sparkles /> New Story</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onSelect={() => start.mutate(false)}><Users /> New multiplayer game</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => start.mutate(true)}><User /> Solo practice</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {tabs.map((tab) => (
          <Button key={tab.to} asChild variant="secondary" size="sm" className="h-10 px-2 text-sm sm:px-4">
            <Link to={tab.to} activeProps={{ className: "ring-1 ring-ring" }}>
              <tab.icon className="hidden sm:block" /> {tab.label}
            </Link>
          </Button>
        ))}
        {story && <CollectionDialog />}
        <MenuSettings story={story} />
      </nav>
      {showSignOut ? <SignOutButton /> : null}
    </>
  );
}
