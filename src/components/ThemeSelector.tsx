import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Palette } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_THEME, fetchTheme, saveTheme, THEMES, themeName } from "@/lib/theme";

/** Each person picks their own palette; it only changes their own screen. */
export function ThemeSelector() {
  const queryClient = useQueryClient();

  const active = useQuery({
    queryKey: ["app-theme"],
    queryFn: fetchTheme,
    staleTime: Infinity,
  }).data ?? DEFAULT_THEME;

  const change = useMutation({
    mutationFn: (id: string) => saveTheme(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(["app-theme"], id);
      toast.success(`Theme set to ${themeName(id)}`);
    },
    onError: () => toast.error("Couldn't change the theme. Please try again."),
  });


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <Palette className="size-4" />
          Theme
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Colour scheme (just you)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onSelect={() => change.mutate(theme.id)}
            disabled={change.isPending}
            className="gap-3"
          >
            <span className="flex shrink-0 gap-1">
              {theme.swatch.map((color) => (
                <span
                  key={color}
                  className="size-3.5 rounded-full border border-border"
                  style={{ background: color }}
                />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{theme.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{theme.blurb}</span>
            </span>
            {active === theme.id ? <Check className="size-4 shrink-0" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
