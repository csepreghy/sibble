// The twenty Pens — passive scoring items shown in the right sidebar.
import type { PenInstance } from "./types";

/** Reorder owned instances without dropping or changing their live bonuses. */
export function reorderPens(pens: PenInstance[], activeId: string, overId: string): PenInstance[] {
  const from = pens.findIndex((pen) => pen.penId === activeId);
  const to = pens.findIndex((pen) => pen.penId === overId);
  if (from < 0 || to < 0 || from === to) return pens;
  const reordered = [...pens];
  const [moved] = reordered.splice(from, 1);
  if (!moved) return pens;
  reordered.splice(to, 0, moved);
  return reordered;
}

export interface PenDef {
  id: string;
  name: string;
  /** lucide icon name resolved by the UI */
  icon: string;
  price: number;
  description: string;
  /** true for pens whose effect grows during the Story */
  scaling?: boolean;
}

export const PENS: PenDef[] = [
  {
    id: "minimalist",
    name: "The Minimalist",
    icon: "Feather",
    price: 9,
    description: "Each letter in a 3-letter word gives +5 Base Ink",
  },
  {
    id: "vowel-power",
    name: "Vowel Power",
    icon: "PenLine",
    price: 9,
    description: "Vowels give ×2 Base Ink",
  },
  {
    id: "crossword",
    name: "Crossword",
    icon: "Grid2x2",
    price: 7,
    description: "+2 Mult per additional word formed",
  },
  {
    id: "growing-vocabulary",
    name: "Growing Vocabulary",
    icon: "BookOpen",
    price: 8,
    description: "Gains +1 Mult for each 5-letter word scored",
    scaling: true,
  },
  {
    id: "catnip",
    name: "Catnip",
    icon: "Cat",
    price: 10,
    description: "+10 Mult for 3-letter words",
  },
  {
    id: "echo-chamber",
    name: "Echo Chamber",
    icon: "AudioLines",
    price: 16,
    description:
      "Reused letters trigger their Base Ink and enhancements again",
  },
  {
    id: "architect",
    name: "The Architect",
    icon: "Compass",
    price: 12,
    description: "×3 Mult when a placement forms 2 or more additional words",
  },
  {
    id: "vowel-collector",
    name: "Vowel Collector",
    icon: "Library",
    price: 11,
    description: "Gains +1 Mult for each new vowel placed",
    scaling: true,
  },
  {
    id: "short-circuit",
    name: "Short Circuit",
    icon: "Zap",
    price: 12,
    description: "×2 Mult for words with 2–4 letters",
  },
  {
    id: "linguist",
    name: "The Linguist",
    icon: "GraduationCap",
    price: 16,
    description:
      "New longest word of 4+ letters this Page retriggers all other Pens",
  },
  { id: "columnist", name: "The Columnist", icon: "Newspaper", price: 12, description: "×3 Mult for 4-letter words" },
  { id: "novelist", name: "The Novelist", icon: "BookText", price: 13, description: "×4 Mult for 5-letter words" },
  { id: "fresh-ink", name: "Fresh Ink", icon: "Droplets", price: 10, description: "+4 Base Ink per new letter in words of 4+ letters" },
  { id: "lexicographer", name: "The Lexicographer", icon: "BookA", price: 10, description: "×2 Mult for 4+ letter words with no repeated letters" },
  { id: "rewriter", name: "The Rewriter", icon: "Repeat", price: 9, description: "×2 Mult for 4+ letter words reusing 2+ letters" },
  { id: "typesetter", name: "The Typesetter", icon: "Type", price: 12, description: "+5 Mult per new letter in words of 4+ letters" },
  { id: "longform", name: "Longform", icon: "ScrollText", price: 10, description: "Gains +3 Mult for each 5+ letter word scored", scaling: true },
  { id: "rare-talent", name: "Rare Talent", icon: "Gem", price: 7, description: "J, Q, X and Z give ×3 Base Ink" },
  { id: "first-edition", name: "First Edition", icon: "Award", price: 10, description: "×3 Mult if the Page's first word has 5+ letters" },
  { id: "double-trouble", name: "Double Trouble", icon: "Copy", price: 10, description: "×2 Mult for 4+ letter words with a repeated letter" },
];

export function penDef(id: string): PenDef {
  const def = PENS.find((pen) => pen.id === id);
  if (!def) throw new Error(`Unknown pen: ${id}`);
  return def;
}
