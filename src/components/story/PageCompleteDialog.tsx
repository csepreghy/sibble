import { Coins, Crown, Droplet, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface PageStats {
  ink: number;
  words: number;
  bestWordInk: number;
  coins: number;
}

/** Shown once when a Page's Ink target is reached, before the Bookstore. */
export function PageCompleteDialog({ stats, onClose }: { stats: PageStats; onClose: () => void }) {
  const rows = [
    { icon: Droplet, label: "Ink scored", value: stats.ink.toLocaleString(), color: "text-base-ink" },
    { icon: PenLine, label: "Words played", value: String(stats.words), color: "text-shop-pen" },
    { icon: Crown, label: "Best word", value: `${stats.bestWordInk.toLocaleString()} Ink`, color: "text-mult-ink" },
    { icon: Coins, label: "Coins earned", value: `+${stats.coins}`, color: "text-gold" },
  ];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs text-center" showCloseButton={false}>
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
        <Button size="lg" className="w-full" onClick={onClose}>
          Visit the Bookstore
        </Button>
      </DialogContent>
    </Dialog>
  );
}
