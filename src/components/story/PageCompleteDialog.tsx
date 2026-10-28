import { Coins, Crown, Droplet, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ROYALTY_MAX } from "@/lib/story/engine";
import { pageExcessPercent } from "@/lib/story/reward-presentation";

export interface PageStats {
  ink: number;
  inkTarget: number;
  words: number;
  bestWordInk: number;
  /** Total Coins credited — always Page Reward + Page Bonus + Coin Upgrades. */
  coins: number;
  base?: number;
  royalties?: number;
  goldenPayday?: number;
}

/** Shown once when a Page's Ink target is reached, before the Bookstore. */
export function PageCompleteDialog({ stats, onClose }: { stats: PageStats; onClose: () => void }) {
  const rows = [
    { icon: Droplet, label: "Ink scored", value: stats.ink.toLocaleString(), color: "text-base-ink" },
    { icon: PenLine, label: "Words played", value: String(stats.words), color: "text-shop-pen" },
    { icon: Crown, label: "Best word", value: `${stats.bestWordInk.toLocaleString()} Ink`, color: "text-mult-ink" },
    { icon: Coins, label: "Coins earned", value: `+${stats.coins}`, color: "text-gold" },
  ];
  const breakdown = [
    { label: "Page Reward", value: stats.base ?? stats.coins },
    { label: `Page Bonus (+${pageExcessPercent(stats.ink, stats.inkTarget).toLocaleString(undefined, { maximumFractionDigits: 2 })}%)`, value: stats.royalties ?? 0, max: (stats.royalties ?? 0) >= ROYALTY_MAX },
    ...(stats.goldenPayday ? [{ label: "Coin Upgrades", value: stats.goldenPayday }] : []),
  ];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="story-sheet-up max-w-xs text-center" showCloseButton={false}>
        <DialogTitle className="text-center text-2xl font-bold">Page Complete!</DialogTitle>
        <div className="grid grid-cols-2 gap-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg bg-secondary/70 p-3">
              <row.icon className={`mx-auto h-5 w-5 ${row.color}`} />
              <p className="mt-1 text-lg font-bold leading-tight">{row.value}</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">{row.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/70 p-3 text-sm">
          {breakdown.map((row) => (
            <div key={row.label} className="flex justify-between text-muted-foreground">
              <span>{row.label}</span><span className="font-bold tabular-nums text-gold">+{row.value}{"max" in row && row.max ? " (max)" : ""}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold">
            <span>Total</span><span className="tabular-nums text-gold">{stats.coins} Coins</span>
          </div>
        </div>
        <Button size="lg" className="w-full" onClick={onClose}>
          Visit the Bookstore
        </Button>
      </DialogContent>
    </Dialog>
  );
}
