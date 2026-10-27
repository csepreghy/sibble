import { createFileRoute } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { ModeMenu } from "@/components/ModeMenu";
import { useStoryTheme } from "@/hooks/useStoryTheme";

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
  return <main><ModeMenu mode="Story Mode"><AppNav showSignOut={false} /></ModeMenu></main>;
}
