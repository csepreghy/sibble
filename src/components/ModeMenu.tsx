import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/AppNav";
import { Button } from "@/components/ui/button";

export function ModeMenu({ mode, children }: { mode?: "Story Mode" | "Multiplayer"; children: ReactNode }) {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center px-4 py-24">
      {mode ? (
        <Button asChild variant="ghost" size="icon" className="absolute left-4 top-4" title="Main menu">
          <Link to="/lobby" aria-label="Main menu"><ArrowLeft /></Link>
        </Button>
      ) : null}
      <SignOutButton />
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 sm:gap-10">
        <h1 className="w-full text-center">
          <BrandLogo to="/lobby" className="h-auto w-[min(480px,80vw)]" />
          <span className="sr-only">Sibble{mode ? ` — ${mode}` : ""}</span>
        </h1>
        {mode ? <p className="text-sm font-semibold text-muted-foreground">{mode}</p> : null}
        {children}
      </div>
    </section>
  );
}