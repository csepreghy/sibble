import { penDef } from "@/lib/story/pens";
import type { PenInstance } from "@/lib/story/types";

/** Shared inline scoring highlights, preserving the definition's exact wording. */
export function PenDescription({ penId }: { penId: string }) {
  const parts = penDef(penId).description.split(/([+×]\d+ Base Ink|Base Ink|[+×]\d+ Mult|retriggers|trigger|again)/g);
  return (
    <span className="text-foreground">
      {parts.map((part, index) => {
        const color = part.includes("Base Ink") ? "text-base-ink"
          : part.includes("Mult") ? "text-mult-ink"
          : /^(retriggers|trigger|again)$/.test(part) ? "text-shop-pen"
          : undefined;
        return color ? <span key={index} className={color}>{part}</span> : part;
      })}
    </span>
  );
}

export function PenCurrentBonus({ pen }: { pen: PenInstance }) {
  if (!penDef(pen.penId).scaling) return null;
  return (
    <p className="mt-1 text-sm leading-snug text-foreground">
      Currently <span className="font-bold text-mult-ink">+{pen.bonus} Mult</span>
    </p>
  );
}