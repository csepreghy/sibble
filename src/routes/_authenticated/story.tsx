import { useEffect, useState } from "react";
import { Droplet } from "lucide-react";
import { loadStoryStats, type StoryStats } from "@/lib/story/stats";
import { compactNumber } from "@/lib/story/format";
import { createFileRoute } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { ModeMenu } from "@/components/ModeMenu";
import { useStoryTheme } from "@/hooks/useStoryTheme";
import { StoryContinue } from "@/components/story/StoryContinue";

export const Route = createFileRoute("/_authenticated/story")({
  head: () => ({
    meta: [
      { title: "Story Mode — Sibble" },
      { name: "description", content: "Play your singleplayer Sibble word adventure, or view your Story history and statistics." },
      { property: "og:title", content: "Story Mode — Sibble" },
      { property: "og:description", content: "Start or continue a Story and explore your word adventure records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoryMenu,
});

function StoryMenu() {
  useStoryTheme();
  const [stats, setStats] = useState<StoryStats | null>(null);
  useEffect(() => setStats(loadStoryStats()), []);
  return <main><ModeMenu mode="Story Mode"><AppNav showSignOut={false} />
    <StoryContinue />
    {stats?.endlessPensUnlocked && <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Endless records">
      <span>Endless · Chapter <strong className="text-foreground">{stats.highestEndlessChapter}</strong></span>
      <span className="flex items-center gap-1">Best Page <strong className="text-base-ink">{compactNumber(stats.highestEndlessPageInk)}</strong><Droplet className="h-3 w-3 text-base-ink" /></span>
    </div>}
  </ModeMenu></main>;
}
