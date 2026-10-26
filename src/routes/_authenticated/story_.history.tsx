import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { BrandLogo } from "@/components/BrandLogo";
import { loadStoryStats } from "@/lib/story/stats";
import { loadStory } from "@/lib/story/storage";
import { PAGES } from "@/lib/story/boards";

export const Route = createFileRoute("/_authenticated/story_/history")({
  head: () => ({
    meta: [
      { title: "Story history — Sibble" },
      { name: "description", content: "Your finished SibbleBook Stories and the pages of your current run." },
      { property: "og:title", content: "Story history — Sibble" },
      { property: "og:description", content: "Browse your past Stories and completed pages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoryHistory,
});

function whenText(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function StoryHistory() {
  const [stats] = useState(() => loadStoryStats());
  const [run] = useState(() => loadStory());
  const completedPages = run?.completedPages ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <BrandLogo className="mb-6 h-12 w-auto sm:h-14" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Story history</h1>
        <AppNav />
      </header>

      {stats.finished.length === 0 && completedPages.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No Stories yet. Start one and it will appear here.
        </p>
      ) : null}

      {completedPages.length > 0 ? (
        <section className="mt-10 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Current Story</h2>
          {completedPages.map((page) => {
            const config = PAGES[page.pageIndex];
            return (
              <div
                key={page.pageIndex}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    Chapter {config?.chapter ?? "?"} · Page {config?.page ?? page.pageIndex + 1}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {page.words} {page.words === 1 ? "word" : "words"} · best word {page.bestWordInk} Ink
                  </p>
                </div>
                <p className="font-bold">{page.ink} Ink</p>
              </div>
            );
          })}
        </section>
      ) : null}

      {stats.finished.length > 0 ? (
        <section className="mt-10 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Finished Stories</h2>
          {stats.finished.map((story) => (
            <div
              key={story.endedAt}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-sm"
            >
              <div>
                <p className="font-semibold">{story.result === "victory" ? "Story complete!" : "Story ended"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {whenText(story.endedAt)} · {story.pagesCompleted}{" "}
                  {story.pagesCompleted === 1 ? "page" : "pages"} completed
                  {story.bestWord ? ` · best word ${story.bestWord.word} (${story.bestWord.ink})` : ""}
                </p>
              </div>
              <p className="font-bold">{story.totalInk} Ink</p>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
