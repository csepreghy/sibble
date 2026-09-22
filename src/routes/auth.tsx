import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AuthSearch {
  next?: string | undefined;
}


export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next: typeof search['next'] === "string" ? search['next'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Tile Table" },
      { name: "description", content: "Sign in with Google or Apple to play Scrabble ad-free." },
      { property: "og:title", content: "Sign in — Tile Table" },
      { property: "og:description", content: "Sign in with Google or Apple to start a game." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/lobby";
  return value;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [busy, setBusy] = useState<string | null>(null);
  const destination = safePath(search.next);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: destination, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: destination, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, destination]);

  async function signIn(provider: "google" | "apple") {
    setBusy(provider);
    try {
      if (destination !== "/lobby") {
        window.sessionStorage.setItem("tile-table:next", destination);
      }
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/auth/callback",
      });
      if (result.error) {
        toast.error("Sign in didn't work. Please try again.");
        setBusy(null);
        return;
      }
      if (result.redirected) return;
      navigate({ to: destination, replace: true });
    } catch {
      toast.error("Sign in didn't work. Please try again.");
      setBusy(null);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <Link
        to="/"
        className="absolute left-5 top-5 flex items-center gap-2.5 sm:left-8 sm:top-8"
        aria-label="Tile Table home"
      >
        <span className="tile-face flex size-8 items-center justify-center rounded-md font-display text-lg font-bold">T</span>
        <span className="font-display text-lg font-bold">Tile Table</span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-panel">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to start a game or open one you were invited to.
        </p>
        <div className="mt-6 grid gap-3">
          <Button size="lg" disabled={busy !== null} onClick={() => signIn("google")}>
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => signIn("apple")}
          >
            {busy === "apple" ? "Opening Apple…" : "Continue with Apple"}
          </Button>
        </div>
      </div>
    </main>
  );
}
