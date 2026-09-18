import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme, DEFAULT_THEME, fetchTheme } from "@/lib/theme";

/**
 * Reads the single app-wide theme the admin picked and keeps every open
 * client in sync through realtime, so a change mid-game lands instantly.
 */
export function useAppTheme() {
  const queryClient = useQueryClient();

  const theme = useQuery({
    queryKey: ["app-theme"],
    queryFn: fetchTheme,
    staleTime: 60_000,
  });

  const value = theme.data ?? DEFAULT_THEME;

  useEffect(() => {
    applyTheme(value);
  }, [value]);

  useEffect(() => {
    const channel = supabase
      .channel("app-settings-theme")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          const row = payload.new as { key?: string; value?: string } | null;
          if (row?.key === "theme" && row.value) {
            queryClient.setQueryData(["app-theme"], row.value);
          } else {
            queryClient.invalidateQueries({ queryKey: ["app-theme"] });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return value;
}
