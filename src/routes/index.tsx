import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Coins, Feather, Flame, Link2, ListOrdered, Sparkles, Swords, Users, Zap } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { fetchMyGames } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { LandingBoard } from "@/components/landing/LandingBoard";
import { BookstoreMock, GameplayMock, ProgressionMock, ScoringMock, Tile } from "@/components/landing/StoryMocks";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sibble — A word-game roguelike, plus Scrabble with friends" },
    { name: "description", content: "Play Story Mode, a roguelike word adventure with Pens, upgrades and explosive scoring — or challenge a friend to ad-free multiplayer." },
    { property: "og:title", content: "Sibble — Write your way through Story Mode" },
    { property: "og:description", content: "A roguelike word game: chase Required Ink, build combos in the Bookstore, and watch Base × Mult explode. Multiplayer included." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const STORY_FEATURES = [
  { icon: BookOpen, title: "Chapters & Pages", copy: "Every Page sets a Required Ink target. Boards grow from 5×5 to 15×15 as the Story unfolds." },
  { icon: Zap, title: "Base × Mult scoring", copy: "Every letter pours Base, every bonus stacks Mult, and the total slams into your Page score." },
  { icon: Feather, title: "Pens that break the rules", copy: "Collect Pens with wild effects, reorder them, and watch synergies chain together." },
  { icon: Coins, title: "The Bookstore", copy: "Spend coins between Pages on Pens, letter enhancements and word-length upgrades." },
  { icon: Flame, title: "Plot Twists", copy: "Some Pages bend the rules. Adapt your build or the Story ends there." },
  { icon: ListOrdered, title: "Every run remembered", copy: "Review completed Pages, best words and lifetime stats for each Story." },
] as const;

function Index() {
  const { user, loading } = useSession();
  const userId = user?.id ?? "";
  const games = useQuery({ queryKey: ["games", userId], queryFn: () => fetchMyGames(userId), enabled: Boolean(userId) });
  const ongoing = (games.data ?? []).filter((g) => g.status !== "finished").slice(0, 3);
  const storyTo = user ? "/story" : "/auth";
  const mpTo = user ? "/multiplayer" : "/auth";

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <BrandLogo className="h-12 w-auto sm:h-14" />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex" aria-label="Landing page">
            <a className="hover:text-foreground" href="#story">Story Mode</a>
            <a className="hover:text-foreground" href="#scoring">Scoring</a>
            <a className="hover:text-foreground" href="#bookstore">Bookstore</a>
            <a className="hover:text-foreground" href="#multiplayer">Multiplayer</a>
          </nav>
          {!loading ? <Button asChild size="sm" variant="story"><Link to={user ? "/lobby" : "/auth"}>{user ? "Play" : "Play free"}<ArrowRight /></Link></Button> : <span className="h-8 w-24" />}
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-14 sm:px-8 lg:min-h-[min(880px,calc(100svh-4rem))] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-10 max-w-xl landing-rise">
          <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-mode-story"><Sparkles className="size-4" /> New · Story Mode</p>
          <h1 className="text-5xl font-bold leading-[0.98] sm:text-6xl lg:text-7xl">Write your way through <span className="text-mode-story">the SibbleBook.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">A roguelike word game. Hit each Page's ink target, collect Pens that bend the rules, and watch Base × Mult explode into ridiculous scores. Prefer a rival? Multiplayer is one tap away.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!loading ? <>
              <Button asChild variant="story" size="lg" className="h-13 px-7 text-base font-bold"><Link to={storyTo}>Start a Story<ArrowRight /></Link></Button>
              <Button asChild variant="multiplayer" size="lg" className="h-13 px-7 text-base font-bold"><Link to={mpTo}>Play a friend</Link></Button>
            </> : null}
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[620px]">
          <div className="absolute -inset-10 bg-mode-story/15 blur-3xl" aria-hidden="true" />
          <div className="landing-float relative" style={{ ["--r" as string]: "-1deg" }}><GameplayMock /></div>
          <div className="landing-float absolute -bottom-10 -right-4 hidden w-[52%] sm:block" style={{ ["--r" as string]: "2deg", animationDelay: "-3s" }}><ScoringMock className="scale-[0.85] origin-bottom-right" /></div>
        </div>
      </section>

      {user && ongoing.length > 0 ? (
        <section className="border-y border-border bg-card/35 px-5 py-12 sm:px-8"><div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-2xl font-bold">Your multiplayer games</h2><Button variant="ghost" asChild><Link to="/multiplayer">All games <ArrowRight /></Link></Button></div>
          <div className="grid gap-3 md:grid-cols-3">{ongoing.map((game) => {
            const scores = game.state?.scores ?? [0, 0];
            return <Link key={game.id} to="/game/$gameId" params={{ gameId: game.id }} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-5 transition-colors hover:border-primary"><div className="min-w-0"><p className="text-sm font-semibold">{game.solo ? "Solo practice board" : `${game.player1_name} vs ${game.player2 ? game.player2_name : "waiting…"}`}</p><p className="mt-1 text-xs text-muted-foreground">{scores[0]} – {scores[1]}</p></div><ArrowRight className="size-5 shrink-0 text-primary" /></Link>;
          })}</div>
        </div></section>
      ) : null}

      {/* Progression */}
      <section id="story" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-mode-story">The run</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Every Page is harder. Every run is different.</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Start on a tiny board with a handful of words and discards. Fill the Required Ink before you run out, earn coins, and turn the Page. Chapters raise the stakes, boards grow, and Plot Twists throw curveballs.</p>
        </div>
        <ProgressionMock />
      </section>

      {/* Scoring */}
      <section id="scoring" className="border-y border-border bg-card/35 py-24"><div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <ScoringMock className="order-2 lg:order-1" />
        <div className="order-1 lg:order-2">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-mult-ink">The rush</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Watch your word <span className="text-base-ink">add up</span>, then <span className="text-mult-ink">multiply</span>.</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Each letter flies its value into Base. Pens and premium squares pile on Mult. Then the boxes collide, the Page score counts up, and confetti bursts the moment you cross the target.</p>
        </div>
      </div></section>

      {/* Bookstore */}
      <section id="bookstore" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-gold">Between Pages</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Build a broken combo in the Bookstore.</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Spend your coins on Pens, letter enhancements and word-length upgrades. Hover to preview, drag your Pens into the perfect order, and find the build that carries you to the last Chapter.</p>
        </div>
        <BookstoreMock />
      </section>

      {/* Feature grid */}
      <section className="border-y border-border bg-card/35 py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 className="max-w-2xl text-4xl font-bold sm:text-5xl">Everything in Story Mode</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">{STORY_FEATURES.map(({ icon: Icon, title, copy }, i) => (
          <article key={title} className="landing-rise min-h-48 bg-card p-6 transition-colors hover:bg-secondary" style={{ animationDelay: `${i * 0.06}s` }}><Icon className="size-6 text-mode-story" strokeWidth={1.8} /><h3 className="mt-6 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p></article>
        ))}</div>
      </div></section>

      {/* Multiplayer */}
      <section id="multiplayer" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative mx-auto w-full max-w-[560px]"><div className="absolute -inset-8 bg-mode-multiplayer/15 blur-3xl" aria-hidden="true" /><div className="relative rotate-[-1.5deg]"><LandingBoard theme="grape" variant="bold" /></div></div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-mode-multiplayer">Multiplayer</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Classic Scrabble, without the clutter.</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">When you want a real opponent, play the traditional 15×15 board with a friend — live or at your own pace.</p>
          <ul className="mt-6 space-y-3 text-muted-foreground">
            {[[Link2, "Invite with one link, join from any device"], [Swords, "Coin toss, tile picks, rematches and head-to-head stats"], [Users, "Ad-free, notifications when it's your turn, ten personal themes"]].map(([Icon, t]) => {
              const I = Icon as typeof Link2;
              return <li key={t as string} className="flex gap-3"><I className="mt-0.5 size-5 shrink-0 text-mode-multiplayer" />{t as string}</li>;
            })}
          </ul>
          {!loading ? <Button asChild variant="multiplayer" size="lg" className="mt-8 font-bold"><Link to={mpTo}>Challenge a friend<ArrowRight /></Link></Button> : null}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-5 py-24 sm:px-8"><div className="mx-auto max-w-4xl text-center">
        <div className="mx-auto mb-8 flex w-fit gap-1.5">{["S", "T", "O", "R", "Y"].map((l, i) => <Tile key={l} letter={l} className="landing-drop size-12 text-xl" style={{ animationDelay: `${i * 0.1}s` }} />)}</div>
        <h2 className="text-4xl font-bold sm:text-6xl">Your first Page is waiting.</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Free, ad-free, and impossible to play just once.</p>
        {!loading ? <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="story" size="lg" className="font-bold"><Link to={storyTo}>Start a Story<ArrowRight /></Link></Button>
          <Button asChild variant="multiplayer" size="lg" className="font-bold"><Link to={mpTo}>Multiplayer</Link></Button>
        </div> : null}
      </div></section>

      <footer className="border-t border-border px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><BrandLogo className="h-10 w-auto" /><p>Made for good words and better combos.</p></div></footer>
    </main>
  );
}
