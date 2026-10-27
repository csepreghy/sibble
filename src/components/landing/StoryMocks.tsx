import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const VAL: Record<string, number> = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };

export function Tile({ letter, className, style }: { letter: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span style={style} className={cn("tile-face tile-gloss relative flex aspect-square items-center justify-center rounded-md font-bold leading-none", className)}>
      {letter}
      <span className="absolute bottom-[8%] right-[10%] text-[0.4em] opacity-75">{VAL[letter] ?? 1}</span>
    </span>
  );
}

/** Counts from 0 to `to` each time the element scrolls into view. */
function useCountUp(to: number, ms = 1400, delay = 0) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(to); return; }
    let raf = 0; let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      timer = window.setTimeout(() => {
        const start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / ms);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      }, delay);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [to, ms, delay]);
  return { ref, n };
}

function Counter({ to, ms, delay, className }: { to: number; ms?: number; delay?: number; className?: string }) {
  const { ref, n } = useCountUp(to, ms, delay);
  return <span ref={ref} className={cn("tabular-nums", className)}>{n.toLocaleString()}</span>;
}

/** Scoring HUD: letters fire Base chips, then Base × Mult resolves. */
export function ScoringMock({ className }: { className?: string }) {
  const word = ["Q", "U", "I", "Z"];
  return (
    <div className={cn("rounded-2xl border border-border bg-card/90 p-5 shadow-panel backdrop-blur", className)}>
      <div className="flex justify-center gap-2">
        {word.map((l, i) => (
          <div key={l} className="relative w-14 sm:w-16">
            <Tile letter={l} className="text-2xl sm:text-3xl" />
            <span className="landing-chip absolute -top-7 left-1/2 -translate-x-1/2 text-lg font-bold text-base-ink" style={{ animationDelay: `${i * 0.35}s` }}>+{VAL[l]}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-xl border-2 border-base-ink/60 bg-background/60 p-3 text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Base</p>
          <Counter to={42} ms={1400} className="text-3xl font-bold text-base-ink" />
        </div>
        <span className="text-2xl font-bold text-muted-foreground">×</span>
        <div className="rounded-xl border-2 border-mult-ink/60 bg-background/60 p-3 text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Mult</p>
          <Counter to={12} ms={1400} delay={300} className="text-3xl font-bold text-mult-ink" />
        </div>
      </div>
      <div className="landing-slam mt-3 rounded-xl border-2 border-gold/70 bg-background/60 p-3 text-center">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Page score</p>
        <Counter to={504} ms={1600} delay={1500} className="text-4xl font-bold text-gold" />
        <p className="text-xs text-muted-foreground">Required ink 450</p>
      </div>
    </div>
  );
}

const CHAPTERS = [
  { name: "Chapter I", pages: ["7×7", "7×7", "9×9"], done: 3 },
  { name: "Chapter II", pages: ["9×9", "11×11", "Plot twist"], done: 1 },
  { name: "Chapter III", pages: ["13×13", "13×13", "15×15"], done: 0 },
];

/** Progression map: chapters, pages and growing boards. */
export function ProgressionMock({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-2xl border border-border bg-card/90 p-5 shadow-panel", className)}>
      {CHAPTERS.map((ch, ci) => (
        <div key={ch.name} className="landing-rise" style={{ animationDelay: `${ci * 0.15}s` }}>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{ch.name}</p>
          <div className="grid grid-cols-3 gap-2">
            {ch.pages.map((p, pi) => {
              const done = pi < ch.done;
              const current = ci === 1 && pi === 1;
              return (
                <div key={pi} className={cn("rounded-lg border px-3 py-2 text-sm",
                  done && "border-accent/50 bg-accent/10",
                  current && "landing-pulse border-mode-story bg-mode-story/15",
                  !done && !current && "border-border opacity-60",
                  p === "Plot twist" && "border-naughty/60 text-naughty")}>
                  <p className="font-bold">Page {pi + 1}</p>
                  <p className="text-xs text-muted-foreground">{p}{done ? " · ✓" : current ? " · now" : ""}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const ITEMS = [
  { name: "Echo Chamber", kind: "Pen", copy: "Repeated letters add +3 Mult", price: 6, tone: "text-mult-ink" },
  { name: "Heavy Ink", kind: "Pen", copy: "+20 Base on 5+ letter words", price: 5, tone: "text-base-ink" },
  { name: "Golden Z", kind: "Enhance", copy: "Every Z tile scores ×2", price: 4, tone: "text-gold" },
  { name: "Long Words", kind: "Upgrade", copy: "7-letter words start at higher Mult", price: 7, tone: "text-mult-ink" },
];

/** Bookstore: shop items pop in one by one. */
export function BookstoreMock({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card/90 p-5 shadow-panel", className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-xl font-bold">Bookstore</p>
        <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold">● <Counter to={14} ms={900} /></span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map((it, i) => (
          <div key={it.name} className="landing-pop flex aspect-square flex-col justify-between rounded-xl border-2 border-border bg-background/60 p-3 transition-shadow hover:shadow-[0_0_24px_-4px_var(--mode-story)]" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{it.kind}</span>
            <div>
              <p className={cn("font-bold leading-tight", it.tone)}>{it.name}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{it.copy}</p>
            </div>
            <span className="self-end rounded-full bg-gold/15 px-2 text-xs font-bold text-gold">● {it.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PREM: Record<number, string> = { 0: "bg-tw", 6: "bg-tw", 42: "bg-tw", 48: "bg-tw", 8: "bg-dw", 12: "bg-dw", 36: "bg-dw", 40: "bg-dw", 3: "bg-dl", 21: "bg-dl", 27: "bg-dl", 45: "bg-dl", 16: "bg-tl", 32: "bg-tl" };
const PLACED: Record<number, string> = { 22: "S", 23: "T", 24: "O", 25: "R", 26: "Y" };

/** 7×7 Story page: a word sitting in a valid green outline, with rack below. */
export function GameplayMock({ className }: { className?: string }) {
  return (
    <div data-theme="midnight" className={cn("rounded-2xl border border-border bg-card/90 p-4 shadow-panel", className)}>
      <div className="relative grid grid-cols-7 gap-1 rounded-lg bg-board p-1.5">
        {Array.from({ length: 49 }, (_, i) => PLACED[i]
          ? <Tile key={i} letter={PLACED[i]} className="landing-drop text-base sm:text-lg" style={{ animationDelay: `${(i - 22) * 0.12}s` }} />
          : <span key={i} className={cn("aspect-square rounded-[4px] bg-board-cell", PREM[i])} />)}
        <span className="landing-outline pointer-events-none absolute rounded-md border-[3px] border-accent" style={{ left: "calc(1.5% + 14.1%)", top: "calc(42.6%)", width: "71%", height: "14.4%" }} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="grid flex-1 grid-cols-5 gap-1.5 rounded-lg bg-background/60 p-1.5">
          {["E", "A", "K", "I", "N"].map((l) => <Tile key={l} letter={l} className="text-sm" />)}
        </div>
        <span className="tile-gloss relative rounded-lg bg-mode-story px-3 py-2 text-sm font-bold text-mode-foreground">Play word</span>
        <span className="landing-pop rounded-lg bg-accent/20 px-2 py-2 text-sm font-bold text-accent" style={{ animationDelay: "0.8s" }}>+64</span>
      </div>
    </div>
  );
}
