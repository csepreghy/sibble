import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Sibble" },
      { name: "description", content: "Finishing sign in." },
      { property: "og:title", content: "Signing you in — Sibble" },
      { property: "og:description", content: "Finishing sign in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = window.sessionStorage.getItem("tile-table:next");
    const next = stored && stored.startsWith("/") && !stored.startsWith("//") ? stored : "/lobby";
    window.sessionStorage.removeItem("tile-table:next");

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      navigate({ to: next, replace: true });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });
    const timer = window.setTimeout(() => {
      if (!done) navigate({ to: "/auth", replace: true });
    }, 6000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </main>
  );
}
