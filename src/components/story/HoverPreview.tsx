import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Presentation-only floating preview beside an anchor rect (desktop hover). */
export function HoverPreview({ anchor, side, children }: { anchor: DOMRect; side: "left" | "right"; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.top);
  const width = 288;
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? width;
    const centered = anchor.top + anchor.height / 2 - h / 2;
    setTop(Math.max(8, Math.min(window.innerHeight - h - 8, centered)));
  }, [anchor]);
  const left = side === "right" ? anchor.right + 12 : anchor.left - 12 - width;
  return createPortal(<>
    {/* Dims everything except the hovered item; never blocks the pointer. */}
    <div aria-hidden className="story-hover-spotlight pointer-events-none fixed z-40" style={{ left: anchor.left, top: anchor.top, width: anchor.width, height: anchor.height }} />
    <div ref={ref} role="tooltip" className="story-hover-preview pointer-events-none fixed z-50" data-side={side} style={{ left, top, width }}>
      {children}
    </div>
  </>,
    document.body,
  );
}

/** True when the device has a real hover pointer. */
export function canHover() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
