import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { applyTheme, DEFAULT_THEME, fetchTheme } from "@/lib/theme";

/** Reads the theme this person picked in this browser and applies it. */
export function useAppTheme() {
  const theme = useQuery({
    queryKey: ["app-theme"],
    queryFn: fetchTheme,
    staleTime: Infinity,
  });

  const value = theme.data ?? DEFAULT_THEME;

  useEffect(() => {
    applyTheme(value);
  }, [value]);

  return value;
}
