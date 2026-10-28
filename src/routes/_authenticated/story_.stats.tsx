import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { Droplet, Medal } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { BrandLogo } from "@/components/BrandLogo";
import { loadStoryStats, topLetters } from "@/lib/story/stats";

export const Route = createFileRoute("/_authenticated/story_/stats")({
  head: () => ({
    meta: [
      { title: "Story statistics — Sibble" },
      {
        name: "description",
        content: "Your SibbleBook Story records: longest word, best single word, highest page score and most used letters.",
      },
      { property: "og:title", content: "Story statistics — Sibble" },
      { property: "og:description", content: "Your Story mode records and most used letters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoryStats,
});

/** A record card. `ink` puts the Ink drop beside the number. */
function Stat({ label, value, ink }: { label: string; value: ReactNode; ink?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-2xl font-bold">
        {value}
        {ink && <Droplet className="ml-1 inline h-5 w-5 shrink-0 align-[-3px] text-base-ink" aria-label="Ink" />}
      </p>
    </div>
  );
}

const GOLD = { className: "text-gold" } as const;
const SILVER = { className: "text-silver" } as const;
const BRONZE = { className: "text-bronze" } as const;
const MEDALS = [GOLD, SILVER, BRONZE] as const;

function StoryStats() {
  const [stats] = useState(() => loadStoryStats());
  const top = topLetters(stats, 3);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <BrandLogo className="mb-6 h-12 w-auto sm:h-14" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Story statistics</h1>
        <AppNav />
      </header>

      {stats.wordsPlayed === 0 && stats.storiesStarted === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          Nothing to show yet. Start a Story and your records will appear here.
        </p>
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Stories started" value={stats.storiesStarted} />
            <Stat label="Stories won" value={stats.storiesWon} />
            <Stat label="Pages completed" value={stats.pagesCompleted} />
            <Stat label="Total Ink" value={stats.totalInk.toLocaleString()} ink />
            <Stat label="Words played" value={stats.wordsPlayed} />
            <Stat
              label="Longest word"
              value={stats.longestWord ? `${stats.longestWord.word} (${stats.longestWord.word.length})` : "—"}
            />
            <Stat
              label="Best single word"
              value={stats.bestWord ? `${stats.bestWord.word} · ${stats.bestWord.ink.toLocaleString()}` : "—"}
              ink
            />
            <Stat
              label="Highest page score"
              value={stats.bestPage ? stats.bestPage.ink.toLocaleString() : "—"}
              ink
            />
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-bold">Most used letters</h2>
            {top.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Play some words to see your favourites.</p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {top.map((entry, index) => {
                  const medal = MEDALS[index] ?? BRONZE;
                  return (
                    <div
                      key={entry.letter}
                      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 sm:flex-row sm:gap-3 sm:p-4"
                    >
                      <span className="sr-only">{`Rank ${index + 1}`}</span>
                      <Medal className={`size-5 shrink-0 ${medal.className}`} aria-hidden />
                      <span className="text-2xl font-black text-primary">{entry.letter}</span>
                      <span className="text-xs font-semibold text-muted-foreground sm:ml-auto sm:text-sm">
                        x {entry.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
