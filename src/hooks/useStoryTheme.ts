import { useEffect } from "react";
import { applyTheme, fetchTheme } from "@/lib/theme";

/**
 * Story Mode always plays on the Midnight Neon board palette (applied through
 * the `story-board-midnight` class so it survives whatever personal theme the
 * player uses elsewhere); the personal theme returns on leaving.
 */
export function useStoryTheme() {
  useEffect(() => {
    applyTheme("midnight");
    document.documentElement.classList.add("story-board-midnight");
    return () => {
      document.documentElement.classList.remove("story-board-midnight");
      void fetchTheme().then(applyTheme);
    };
  }, []);
}
