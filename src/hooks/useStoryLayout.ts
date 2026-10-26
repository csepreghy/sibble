import { useEffect, useState } from "react";
import { storyLayout } from "@/lib/story/layout";

export function useStoryLayout() {
  const [layout, setLayout] = useState<ReturnType<typeof storyLayout>>("desktop");
  useEffect(() => {
    const update = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const phone = /iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent);
      setLayout(storyLayout(window.innerWidth, window.innerHeight, phone));
      document.documentElement.style.setProperty("--story-visible-height", `${height}px`);
      document.documentElement.style.setProperty("--story-visible-width", `${width}px`);
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--story-visible-height");
      document.documentElement.style.removeProperty("--story-visible-width");
    };
  }, []);
  return layout;
}