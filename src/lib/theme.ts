import { supabase } from "@/integrations/supabase/client";

export interface ThemeOption {
  id: string;
  name: string;
  blurb: string;
  swatch: [string, string, string];
}

/** The palettes defined in src/styles.css under [data-theme="…"]. */
export const THEMES: ThemeOption[] = [
  {
    id: "midnight",
    name: "Midnight Neon",
    blurb: "Deep indigo with hot pink and cyan",
    swatch: ["oklch(0.17 0.05 275)", "oklch(0.72 0.24 350)", "oklch(0.76 0.15 200)"],
  },
  {
    id: "synthwave",
    name: "Sunset Synth",
    blurb: "Purple dusk with orange and magenta",
    swatch: ["oklch(0.19 0.08 315)", "oklch(0.8 0.18 60)", "oklch(0.72 0.2 330)"],
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    blurb: "Near-black violet with electric lime",
    swatch: ["oklch(0.15 0.06 300)", "oklch(0.68 0.24 300)", "oklch(0.86 0.19 130)"],
  },
  {
    id: "ember",
    name: "Ember",
    blurb: "Charcoal with molten orange and rose",
    swatch: ["oklch(0.18 0.03 40)", "oklch(0.76 0.2 48)", "oklch(0.7 0.18 10)"],
  },
  {
    id: "aurora",
    name: "Aurora",
    blurb: "Midnight blue with mint and pink",
    swatch: ["oklch(0.17 0.05 235)", "oklch(0.82 0.17 165)", "oklch(0.73 0.21 340)"],
  },
  {
    id: "reef",
    name: "Neon Reef",
    blurb: "Deep navy with teal glow and orange sparks",
    swatch: ["oklch(0.16 0.05 255)", "oklch(0.84 0.15 185)", "oklch(0.78 0.18 55)"],
  },
  {
    id: "grape",
    name: "Grape Soda",
    blurb: "Royal purple with hot pink and orange",
    swatch: ["oklch(0.17 0.06 305)", "oklch(0.72 0.23 345)", "oklch(0.79 0.17 55)"],
  },
  {
    id: "current",
    name: "Deep Current",
    blurb: "Midnight blue with teal, violet and pink",
    swatch: ["oklch(0.15 0.05 250)", "oklch(0.82 0.15 185)", "oklch(0.65 0.22 300)"],
  },
  {
    id: "circuit",
    name: "Night Circuit",
    blurb: "Black-violet haze with an orange arc",
    swatch: ["oklch(0.14 0.035 285)", "oklch(0.73 0.19 52)", "oklch(0.6 0.22 275)"],
  },
  {
    id: "classic",
    name: "Parlour Green",
    blurb: "The original felt table and maple tiles",
    swatch: ["oklch(0.28 0.045 160)", "oklch(0.78 0.14 72)", "oklch(0.6 0.1 200)"],
  },
];

export const DEFAULT_THEME = "midnight";

export function themeName(id: string) {
  return THEMES.find((theme) => theme.id === id)?.name ?? id;
}

export function applyTheme(id: string) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset['theme'] = id;
}

export async function fetchTheme(): Promise<string> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "theme")
    .maybeSingle();
  if (error || !data) return DEFAULT_THEME;
  return data.value || DEFAULT_THEME;
}

export async function saveTheme(id: string, userId: string) {
  const { error } = await supabase
    .from("app_settings")
    .update({ value: id, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("key", "theme");
  if (error) throw error;
}
