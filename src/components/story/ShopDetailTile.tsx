import type { ReactNode } from "react";

export function ShopDetailTile({ glow, children }: { glow: string; children: ReactNode }) {
  return <div style={{ ["--glow" as string]: glow }} className="shop-card shop-card-live flex aspect-square w-full flex-col items-center justify-between gap-2 rounded-2xl border-[3px] p-4 text-center">{children}</div>;
}