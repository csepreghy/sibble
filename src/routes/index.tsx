import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, BellRing, CheckCircle2, Link2, Palette, RotateCcw, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { fetchMyGames } from "@/lib/games";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LandingBoard } from "@/components/landing/LandingBoard";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Tile Table — A better way to play Scrabble online" },
    { name: "description", content: "Play Scrabble online with someone you like. Share a game, choose your look, and take your turn without adverts or clutter." },
    { property: "og:title", content: "Tile Table — A better way to play Scrabble online" },
    { property: "og:description", content: "A vivid, ad-free Scrabble board for two. Share a link, choose a theme, and play at your own pace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const FEATURES = [
  { icon: Users, title: "Built for two", copy: "Invite someone you know and play together on a shared, live board." },
  { icon: ShieldCheck, title: "No adverts. Ever.", copy: "Just the board, your letters and the quiet tension of a good move." },
  { icon: Link2, title: "Invite by link", copy: "Start a game and send one simple link. They can join from any device." },
  { icon: Sparkles, title: "Words feel rewarding", copy: "Glossy tiles, move highlights, fireworks and a playful naughty-word bonus." },
  { icon: BellRing, title: "Know when to play", copy: "Optional notifications tell you when your opponent has taken their turn." },
  { icon: BarChart3, title: "A history together", copy: "See wins, losses, best moves and your record against every opponent." },
  { icon: Palette, title: "Make it yours", copy: "Choose from vivid personal themes without changing anyone else’s board." },
  { icon: RotateCcw, title: "Run it back", copy: "Finish a game, send a rematch invitation and settle the score." },
] as const;

const THEMES = [
  { id: "circuit", name: "Night Circuit", mood: "Orange / violet", variant: "hero" as const },
  { id: "reef", name: "Neon Reef", mood: "Teal / navy", variant: "social" as const },
  { id: "grape", name: "Grape Soda", mood: "Pink / purple", variant: "bold" as const },
] as const;

function Index() {
  const { user, loading } = useSession();
  const userId = user?.id ?? "";
  const games = useQuery({ queryKey: ["games", userId], queryFn: () => fetchMyGames(userId), enabled: Boolean(userId) });
  const ongoing = (games.data ?? []).filter((game) => game.status !== "finished").slice(0, 5);
  const destination = user ? "/lobby" : "/auth";
  const actionLabel = user ? "Your games" : "Play now";

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="relative z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Tile Table home">
            <span className="tile-face flex size-8 items-center justify-center rounded-md font-display text-lg font-bold">T</span>
            <span className="font-display text-lg font-bold">Tile Table</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex" aria-label="Landing page">
            <a className="transition-colors hover:text-foreground" href="#features">Features</a>
            <a className="transition-colors hover:text-foreground" href="#themes">Themes</a>
            <a className="transition-colors hover:text-foreground" href="#how-it-works">How it works</a>
          </nav>
          {!loading ? <Button asChild size="sm"><Link to={destination}>{actionLabel}<ArrowRight /></Link></Button> : <span className="h-8 w-24" />}
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:min-h-[min(900px,calc(100svh-4rem))] lg:grid-cols-[0.82fr_1.18fr] lg:py-20">
        <div className="relative z-10 max-w-xl">
          <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-primary"><span className="h-px w-8 bg-primary" /> Scrabble, minus the noise</p>
          <h1 className="text-5xl font-bold leading-[0.98] sm:text-6xl lg:text-7xl">Your favourite word game, <span className="text-primary">beautifully played.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">A vibrant, ad-free table for two. Invite someone you like, choose your own look and keep the game going for as long as it takes.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {!loading ? <Button asChild size="lg" className="h-12 px-6 text-base"><Link to={destination}>{user ? "Continue playing" : "Start a game"}<ArrowRight /></Link></Button> : null}
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-accent" /> Google or Apple sign-in</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[680px] lg:translate-x-8">
          <div className="absolute -inset-8 bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="relative rotate-[1.5deg] transition-transform duration-500 hover:rotate-0">
            <div className="mb-3 flex items-center justify-between rounded-md border border-border bg-card/90 px-4 py-3 shadow-panel backdrop-blur">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Your turn</p><p className="font-bold">Andrew <span className="text-muted-foreground">186</span></p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Last move</p><p className="font-bold">PLAY <span className="text-accent">+18</span></p></div>
            </div>
            <LandingBoard />
          </div>
        </div>
      </section>

      {user && ongoing.length > 0 ? (
        <section className="border-y border-border bg-card/35 px-5 py-16 sm:px-8"><div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Welcome back</p><h2 className="mt-2 text-3xl font-bold">Pick up where you left off</h2></div><Button variant="ghost" asChild><Link to="/lobby">All games <ArrowRight /></Link></Button></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ongoing.map((game) => {
            const history = game.state?.history ?? [];
            const last = history[history.length - 1] ?? null;
            const names: [string, string] = [game.player1_name, game.player2 ? game.player2_name : "waiting for a player"];
            const scores = game.state?.scores ?? [0, 0];
            return <Link key={game.id} to="/game/$gameId" params={{ gameId: game.id }} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-5 transition-colors hover:border-primary"><div className="min-w-0"><p className="text-sm font-semibold">{game.solo ? "Solo practice board" : `${names[0]} vs ${names[1]}`}</p><p className="mt-1 truncate text-xs text-muted-foreground">{scores[0]} – {scores[1]}{last ? ` · ${last.description} (+${last.score})` : ""}</p></div><ArrowRight className="size-5 shrink-0 text-primary" /></Link>;
          })}</div>
        </div></section>
      ) : null}

      <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Everything the game needs</p><h2 className="mt-3 text-4xl font-bold sm:text-5xl">All play. No clutter.</h2><p className="mt-4 text-lg leading-relaxed text-muted-foreground">Made for the small rituals that turn a word game into something you share.</p></div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">{FEATURES.map(({ icon: Icon, title, copy }) => <article key={title} className="min-h-52 bg-card p-6 transition-colors hover:bg-secondary"><Icon className="size-6 text-primary" strokeWidth={1.8} /><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p></article>)}</div>
      </section>

      <section id="themes" className="border-y border-border bg-card/35 py-24 sm:py-32"><div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Ten personal themes</p><h2 className="mt-3 text-4xl font-bold sm:text-5xl">Same game. Different mood.</h2></div><p className="max-w-sm text-muted-foreground">Your palette is yours alone. Switch the entire table without changing what your opponent sees.</p></div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">{THEMES.map((theme, index) => <article key={theme.id} className={cn("group", index === 1 && "lg:translate-y-8")}><div className="overflow-hidden rounded-md border border-border bg-background p-3 transition-transform duration-300 group-hover:-translate-y-1"><LandingBoard theme={theme.id} variant={theme.variant} compact /></div><div className="mt-4 flex items-center justify-between px-1"><h3 className="text-xl font-bold">{theme.name}</h3><span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{theme.mood}</span></div></article>)}</div>
      </div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32"><div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div className="lg:sticky lg:top-24"><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Start in seconds</p><h2 className="mt-3 text-4xl font-bold sm:text-5xl">A table for two, wherever you are.</h2></div>
        <ol className="border-t border-border">{["Sign in with Google or Apple", "Send your private game link", "Take turns live or come back later"].map((step, index) => <li key={step} className="grid grid-cols-[3rem_1fr] items-center gap-4 border-b border-border py-8 sm:grid-cols-[5rem_1fr_auto]"><span className="font-display text-3xl text-primary">0{index + 1}</span><h3 className="text-xl font-bold sm:text-2xl">{step}</h3><CheckCircle2 className="hidden size-6 text-accent sm:block" /></li>)}</ol>
      </div></section>

      <section className="border-t border-border px-5 py-20 sm:px-8 sm:py-28"><div className="mx-auto max-w-5xl text-center">
        <div className="mx-auto mb-7 flex w-fit gap-1.5">{["T", "I", "L", "E"].map((letter) => <span key={letter} className="tile-face tile-gloss relative flex size-11 items-center justify-center rounded-md text-lg font-bold">{letter}</span>)}</div>
        <h2 className="text-4xl font-bold sm:text-6xl">Your next great word is waiting.</h2><p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">No adverts. No noisy extras. Just a beautiful board and someone worth playing.</p>
        {!loading ? <Button asChild size="lg" className="mt-8 h-12 px-7 text-base"><Link to={destination}>{user ? "Return to your games" : "Play Tile Table"}<ArrowRight /></Link></Button> : null}
      </div></section>

      <footer className="border-t border-border px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p className="font-display font-bold text-foreground">Tile Table</p><p>Made for good words and better company.</p></div></footer>
    </main>
  );
}