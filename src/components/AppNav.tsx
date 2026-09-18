import { Link } from "@tanstack/react-router";
import { ThemeSelector } from "@/components/ThemeSelector";

const TABS = [
  { to: "/lobby", label: "Games" },
  { to: "/stats", label: "Statistics" },
] as const;

export function AppNav() {
  return (
    <div className="flex items-center gap-2">
    <nav className="flex gap-1 rounded-full border border-border bg-secondary/60 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground" }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
      <ThemeSelector />
    </div>
  );
}
