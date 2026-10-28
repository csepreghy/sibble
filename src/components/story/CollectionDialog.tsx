import { useState } from "react";
import { ChevronLeft, ChevronRight, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PENS } from "@/lib/story/pens";
import { UPGRADES } from "@/lib/story/upgrades";
import { penIcon } from "./PenSidebar";
import { UpgradeVisual } from "./Bookstore";
import { PenDescription } from "./PenDescription";
import { ShopDetailTile } from "./ShopDetailTile";

type Category = "pens" | "upgrades";
type Item = { id: string; name: string; description: string };

function CollectionVisual({ item, category, large = false }: { item: Item; category: Category; large?: boolean }) {
  if (category === "upgrades") return <UpgradeVisual large={large} />;
  const Icon = penIcon(item.id);
  return <span className={large ? "flex h-16 w-16 items-center justify-center rounded-full border border-shop-pen/50 bg-shop-pen/15" : "flex h-11 w-11 items-center justify-center rounded-full border border-shop-pen/50 bg-shop-pen/15"}>
    <Icon className={large ? "h-8 w-8 text-shop-pen" : "h-6 w-6 text-shop-pen"} />
  </span>;
}

export function CollectionDialog() {
  const [category, setCategory] = useState<Category>("pens");
  const [selected, setSelected] = useState<Item | null>(null);
  const items = category === "pens" ? PENS : UPGRADES;
  const glow = category === "pens" ? "var(--color-shop-pen)" : "var(--color-shop-upgrade)";
  const categoryColor = category === "pens" ? "text-shop-pen" : "text-shop-upgrade";
  const label = category === "pens" ? "Pen" : "Permanent";
  function changeCategory(value: string) {
    if (value !== "pens" && value !== "upgrades") return;
    setSelected(null);
    setCategory(value);
  }

  return <Dialog onOpenChange={() => setSelected(null)}>
    <DialogTrigger asChild>
      <Button variant="secondary" size="sm" className="h-10 px-2 text-sm sm:px-4"><Library className="hidden sm:block" /> Collection</Button>
    </DialogTrigger>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-4 overflow-hidden">
      <DialogTitle>Collection</DialogTitle>
      <DialogDescription className="sr-only">All Story Pens and permanent upgrades.</DialogDescription>
      <Tabs value={category} onValueChange={changeCategory}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pens">Pens · {PENS.length}</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrades · {UPGRADES.length}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div aria-label={category === "pens" ? "All Pens" : "All upgrades"} className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(item => <Button key={item.id} variant="ghost" onClick={() => setSelected(item)}
          style={{ ["--glow" as string]: glow }}
          className="shop-card flex aspect-square h-auto flex-col items-center justify-between gap-2 whitespace-normal rounded-lg border-2 p-2 text-center hover:bg-transparent hover:text-foreground">
          <span className={`self-start text-[0.55rem] font-bold uppercase tracking-widest ${categoryColor}`}>{label}</span>
          <CollectionVisual item={item} category={category} />
          <span className="text-sm font-bold leading-tight">{item.name}</span>
        </Button>)}
      </div>
      <div className="flex shrink-0 items-center justify-center gap-4">
        <Button variant="outline" size="icon" aria-label="Previous category" disabled={category === "pens"} onClick={() => changeCategory("pens")}><ChevronLeft /></Button>
        <span className="text-sm tabular-nums text-muted-foreground">{category === "pens" ? "1" : "2"} / 2</span>
        <Button variant="outline" size="icon" aria-label="Next category" disabled={category === "upgrades"} onClick={() => changeCategory("upgrades")}><ChevronRight /></Button>
      </div>
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-xs overflow-y-auto border-0 bg-transparent p-0 shadow-none">
          {selected && <ShopDetailTile glow={glow}>
            <span className={`self-start text-xs font-bold uppercase tracking-widest ${categoryColor}`}>{label}</span>
            <CollectionVisual item={selected} category={category} large />
            <DialogTitle className="text-xl font-bold leading-tight">{selected.name}</DialogTitle>
            <DialogDescription className="text-sm leading-snug">{category === "pens" ? <PenDescription penId={selected.id} /> : selected.description}</DialogDescription>
          </ShopDetailTile>}
        </DialogContent>
      </Dialog>
    </DialogContent>
  </Dialog>;
}