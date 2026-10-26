import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Coins, Feather, Play, Sparkles } from "lucide-react";
import { newStory } from "@/lib/story/engine";
import { loadStory, saveStory } from "@/lib/story/storage";
import { AppNav } from "@/components/AppNav";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/story")({
  head: () => ({
    meta: [
      { title: "Story Mode — Sibble" },
      {
        name: "description",
        content:
          "A singleplayer roguelike word adventure: nine Pages, three Chapters, Plot Twists, Pens, upgrades and the Bookstore.",
      },
      { property: "og:title", content: "Story Mode — Sibble" },
      {
        property: "og:description",
        content: "Build a deck of upgraded letters and Pens across nine Pages of word puzzles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoryIntro,
});

function StoryIntro() {
  const navigate = useNavigate();
  const [saved] = useState(() => loadStory());

  function begin() {
    const story = newStory();
    saveStory(story);
    navigate({ to: "/story/play" });
  }

  function continueStory() {
    navigate({ to: "/story/play" });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <BrandLogo className="mb-6 h-12 w-auto sm:h-14" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Story Mode</h1>
          <p className="mt-1 text-sm text-muted-foreground">A singleplayer word roguelike.</p>
        </div>
        <AppNav />
      </header>

      <div className="mt-8 space-y-3">
        {saved && saved.phase !== "victory" && saved.phase !== "defeat" ? (
          <Button size="lg" className="w-full" onClick={continueStory}>
            <Play className="mr-1 h-5 w-5" /> Continue your Story
          </Button>
        ) : null}
        <Button
          size="lg"
          variant={saved && saved.phase !== "victory" && saved.phase !== "defeat" ? "outline" : "default"}
          className="w-full"
          onClick={begin}
        >
          <Sparkles className="mr-1 h-5 w-5" /> Begin a new Story
        </Button>
      </div>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="mt-2 font-semibold">Nine Pages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Three Chapters of word puzzles on growing boards, each ending in a Plot Twist.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Feather className="h-5 w-5 text-primary" />
          <h2 className="mt-2 font-semibold">Pens &amp; upgrades</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Collect literary Pens, enhance your tiles and upgrade letters to score ever more Ink.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Coins className="h-5 w-5 text-primary" />
          <h2 className="mt-2 font-semibold">The Bookstore</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Earn Coins on every Page and spend them between rounds to shape your strategy.
          </p>
        </div>
      </section>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Best played in landscape — on a phone, rotate your device.{" "}
        <Link to="/lobby" className="text-primary underline-offset-2 hover:underline">
          Back to your games
        </Link>
      </p>
    </main>
  );
}
