import { validateStoryMove } from "./placement";
import { scorePlacement } from "./scoring";

type PreviewArgs = Omit<Parameters<typeof scorePlacement>[0], "words">;

/** Inspect formed words without changing validation or committed scoring. */
export function inspectPlacement(args: PreviewArgs, isWord: (word: string) => boolean) {
  const formed = validateStoryMove(args.board, args.size, args.pending, () => true);
  if ("error" in formed) return {
    error: formed.error, validIndices: [] as number[], invalidIndices: args.pending.map(p => p.index), ink: null,
  };
  const invalidWords = formed.words.filter(w => !isWord(w.word));
  const invalidIndices = [...new Set(invalidWords.flatMap(w => w.indices))];
  const invalidSet = new Set(invalidIndices);
  const validIndices = [...new Set(formed.words.filter(w => isWord(w.word)).flatMap(w => w.indices))].filter(i => !invalidSet.has(i));
  if (invalidWords.length) return {
    error: `${invalidWords.map(w => w.word).join(", ")} is not in the word list.`, validIndices, invalidIndices, ink: null,
  };
  // Use the same scoring pipeline, omitting Pens only for the live preview.
  const score = scorePlacement({ ...args, words: formed.words, pens: [] });
  return { error: null, validIndices, invalidIndices, ink: score.totalInk };
}