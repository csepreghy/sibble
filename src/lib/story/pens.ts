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
    description: "Each letter in a 3-letter word gives +5 Base Ink",
  },
  {
    id: "vowel-power",
    name: "Vowel Power",
    icon: "PenLine",
    price: 8,
    description: "Vowels give ×2 Base Ink",
  },
  {
    id: "crossword",
    name: "Crossword",
    icon: "Grid2x2",
    price: 8,
    description: "+2 Mult per additional word formed",
  },
  {
    id: "growing-vocabulary",
    name: "Growing Vocabulary",
    icon: "BookOpen",
    price: 10,
    description: "Gains +1 Mult for each 5-letter word scored",
    scaling: true,
  },
  {
    id: "catnip",
    name: "Catnip",
    icon: "Cat",
    price: 6,
    description: "+10 Mult for 3-letter words",
  },
  {
    id: "echo-chamber",
    name: "Echo Chamber",
    icon: "AudioLines",
    price: 12,
    description:
      "Reused letters trigger their Base Ink and enhancements again",
  },
  {
    id: "architect",
    name: "The Architect",
    icon: "Compass",
    price: 10,
    description: "×3 Mult when a placement forms 2 or more additional words",
  },
  {
    id: "vowel-collector",
    name: "Vowel Collector",
    icon: "Library",
    price: 8,
    description: "Gains +1 Mult for each new vowel placed",
    scaling: true,
  },
  {
    id: "short-circuit",
    name: "Short Circuit",
    icon: "Zap",
    price: 9,
    description: "×2 Mult for words with 2–4 letters",
  },
  {
    id: "linguist",
    name: "The Linguist",
    icon: "GraduationCap",
    price: 12,
    description:
      "New longest word this Page retriggers all other Pens",
  },
];

export function penDef(id: string): PenDef {
  const def = PENS.find((pen) => pen.id === id);
  if (!def) throw new Error(`Unknown pen: ${id}`);
  return def;
}
