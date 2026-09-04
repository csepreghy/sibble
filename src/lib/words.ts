let cache: Set<string> | null = null;
let pending: Promise<Set<string>> | null = null;

/** Loads the tournament English word list (cached for the session). */
export function loadWordList(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = fetch("/words.txt")
    .then((response) => {
      if (!response.ok) throw new Error("Could not load the word list.");
      return response.text();
    })
    .then((text) => {
      cache = new Set(
        text
          .split("\n")
          .map((line) => line.trim().toUpperCase())
          .filter(Boolean),
      );
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
