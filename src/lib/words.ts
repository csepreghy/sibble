let cache: Set<string> | null = null;
let pending: Promise<Set<string>> | null = null;

let naughtyCache: Set<string> | null = null;

async function fetchList(path: string): Promise<Set<string>> {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load the word list.");
  const text = await response.text();
  return new Set(
    text
      .split("\n")
      .map((line) => line.trim().toUpperCase())
      .filter(Boolean),
  );
}

/** Loads the tournament English word list (cached for the session). */
export function loadWordList(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = Promise.all([fetchList("/words.txt"), fetchList("/naughty-words.txt")])
    .then(([dictionary, naughty]) => {
      naughtyCache = naughty;
      // A handful of rude words are missing from the tournament list; they stay playable.
      for (const word of naughty) dictionary.add(word);
      cache = dictionary;
      return cache;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

export function getCachedWords(): Set<string> | null {
  return cache;
}

/** Words that score double and get a pink outline. */
export function getNaughtyWords(): Set<string> | null {
  return naughtyCache;
}

export function isNaughtyWord(word: string): boolean {
  return naughtyCache?.has(word.toUpperCase()) ?? false;
}
