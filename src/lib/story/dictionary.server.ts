// Server-side dictionary for authoritative multiplayer Story validation.
let cache: Set<string> | null = null;

export async function serverDictionary(): Promise<Set<string>> {
  if (cache) return cache;
  const [words, naughty, acronyms] = await Promise.all([
    import("../../../public/words.txt?raw"),
    import("../../../public/naughty-words.txt?raw"),
    import("../../../public/acronyms.txt?raw"),
  ]);
  const set = new Set<string>();
  for (const text of [words.default, naughty.default, acronyms.default]) {
    for (const line of text.split("\n")) {
      const w = line.trim().toUpperCase();
      if (w) set.add(w);
    }
  }
  cache = set;
  return set;
}
