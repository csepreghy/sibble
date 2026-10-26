// The ten Pens — passive scoring items shown in the right sidebar.

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
    price: 6,
    description: "Every letter in a 3-letter word adds +5 Base Ink.",
  },
  {
    id: "vowel-power",
    name: "Vowel Power",
    icon: "PenLine",
    price: 8,
    description: "Double the Base Ink contributed by vowels in scored words.",
  },
  {
    id: "crossword",
    name: "Crossword",
    icon: "Grid2x2",
    price: 8,
    description: "+2 Mult for each additional word formed by the same placement.",
  },
  {
    id: "growing-vocabulary",
    name: "Growing Vocabulary",
    icon: "BookOpen",
    price: 10,
    description: "Permanently gains +1 Mult whenever you score a 5-letter word.",
    scaling: true,
  },
  {
    id: "catnip",
    name: "Catnip",
    icon: "Cat",
    price: 6,
    description: "+10 Mult for words of exactly three letters.",
  },
  {
    id: "echo-chamber",
    name: "Echo Chamber",
    icon: "AudioLines",
    price: 12,
    description:
      "Previously placed letters trigger their Base Ink and enhancement one additional time when reused in a new word.",
  },
  {
    id: "architect",
    name: "The Architect",
    icon: "Compass",
    price: 10,
    description: "×3 Mult for every word scored by a placement that forms at least two extra perpendicular words.",
  },
  {
    id: "vowel-collector",
    name: "Vowel Collector",
    icon: "Library",
    price: 8,
    description: "Permanently gains +1 Mult for every vowel tile you newly place on the board.",
    scaling: true,
  },
  {
    id: "short-circuit",
    name: "Short Circuit",
    icon: "Zap",
    price: 9,
    description: "Words of four letters or fewer receive ×2 Mult.",
  },
  {
    id: "linguist",
    name: "The Linguist",
    icon: "GraduationCap",
    price: 12,
    description:
      "When a word sets a new record for the longest word on this Page, your other Pens trigger one additional time for it.",
  },
];

export function penDef(id: string): PenDef {
  const def = PENS.find((pen) => pen.id === id);
  if (!def) throw new Error(`Unknown pen: ${id}`);
  return def;
}
