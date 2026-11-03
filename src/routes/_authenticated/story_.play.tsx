import { createFileRoute } from "@tanstack/react-router";
import { StoryPlayScreen } from "@/components/story/StoryPlayScreen";

export const Route = createFileRoute("/_authenticated/story_/play")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Playing a Story — Sibble" },
      { name: "description", content: "Your singleplayer Sibble Story in progress." },
      { property: "og:title", content: "Playing a Story — Sibble" },
      { property: "og:description", content: "Your singleplayer Sibble Story in progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StoryPlayScreen />,
});
