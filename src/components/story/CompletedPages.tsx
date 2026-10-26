import { useState } from "react";
import { ArrowLeft, Check, Coins, Droplet } from "lucide-react";
import { PAGES, TWIST_INFO } from "@/lib/story/boards";
import type { CompletedPage, StoryState } from "@/lib/story/types";
import { Button } from "@/components/ui/button";
import { StoryBoard } from "./StoryBoard";

/** Shared by the bottom-right Bag menu and Run Info. Review never touches live play. */
export function CompletedPages({ state }: { state: StoryState }) {
  const [selected, setSelected] = useState<CompletedPage | null>(null);
  const config = selected ? PAGES[selected.pageIndex] : null;
  if (selected && config) {
    return (
      <section className="space-y-3" aria-label="Completed page review">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /> Completed pages</Button>
        <h3 className="text-lg font-bold">Chapter {config.chapter} · Page {config.page}</h3>
        {config.plotTwist && <p className="text-sm text-accent">{TWIST_INFO[config.plotTwist].name}</p>}
        <StoryBoard key={selected.pageIndex} size={config.size} board={selected.board} tiles={selected.tiles} premiums={config.premiums} usedPremiums={selected.usedPremiums} pending={[]} letterUpgrades={selected.letterUpgrades} disabled onCellClick={() => {}} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-muted-foreground">Ink scored</dt><dd className="flex items-center gap-1 text-xl font-bold text-base-ink">{selected.ink.toLocaleString()}<Droplet className="h-4 w-4" /></dd></div>
          <div><dt className="text-muted-foreground">Words played</dt><dd className="text-xl font-bold">{selected.words}</dd></div>
          <div><dt className="text-muted-foreground">Maximum word Ink</dt><dd className="text-xl font-bold text-mult-ink">{selected.bestWordInk.toLocaleString()}</dd></div>
          <div><dt className="text-muted-foreground">Coins earned</dt><dd className="flex items-center gap-1 text-xl font-bold text-gold"><Coins className="h-4 w-4" />+{selected.coins}</dd></div>
        </dl>
        <h4 className="font-bold">Played words</h4>
        {selected.playedWords.length ? <ol className="divide-y divide-border">
          {selected.playedWords.map((word, index) => <li key={index} className="flex items-center justify-between gap-3 py-2 text-sm"><span><span className="mr-2 text-muted-foreground">{word.move}.</span><strong>{word.word}</strong></span><span className="flex items-center gap-1 font-bold text-base-ink">{word.ink.toLocaleString()}<Droplet className="h-3 w-3" /></span></li>)}
        </ol> : <p className="text-sm text-muted-foreground">Word details weren’t saved for this earlier page.</p>}
      </section>
    );
  }
  return (
    <section className="space-y-3" aria-label="Completed pages">
      <h3 className="font-bold">Completed pages</h3>
      {state.pagesCompleted === 0 && <p className="text-sm text-muted-foreground">No completed pages yet.</p>}
      {[1, 2, 3].map(chapter => {
        const pages = PAGES.map((page, pageIndex) => ({ ...page, pageIndex })).filter(page => page.chapter === chapter && page.pageIndex < state.pagesCompleted);
        if (!pages.length) return null;
        return <div key={chapter} className="space-y-1.5"><h4 className="text-xs font-bold text-muted-foreground">Chapter {chapter}</h4>
          {pages.map(page => {
            const snapshot = state.completedPages?.find(item => item.pageIndex === page.pageIndex);
            return <Button key={page.pageIndex} variant="outline" className="h-auto w-full justify-between gap-2 py-2 text-left" disabled={!snapshot} onClick={() => snapshot && setSelected(snapshot)}>
              <span>Page {page.page}{page.plotTwist ? ` · ${TWIST_INFO[page.plotTwist].name}` : ""}</span>
              {snapshot ? <Check className="h-4 w-4 shrink-0 text-story-valid" /> : <span className="text-xs text-muted-foreground">Not saved</span>}
            </Button>;
          })}
        </div>;
      })}
    </section>
  );
}