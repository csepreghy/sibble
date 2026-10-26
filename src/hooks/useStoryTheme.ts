import { useEffect } from "react";
import { applyTheme, fetchTheme } from "@/lib/theme";

/** Story mode always uses Midnight Neon; the personal theme returns on leaving. */
export function useStoryTheme() {
  useEffect(() => {
    applyTheme("midnight");
    return () => { void fetchTheme().then(applyTheme); };
  }, []);
}
