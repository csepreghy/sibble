import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/lobby", label: "Games" },
  { to: "/stats", label: "Statistics" },
] as const;

export function AppNav() {
  return (
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
  );
}
