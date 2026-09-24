// In-memory Relationship memory adapter for tests: records what it was asked
// to remember and answers with a fixed result, or fails when told to.
import type { ContactContext } from "@/lib/contact";
import type { ProcessedNote, RelationshipMemory } from "@/lib/ai";

export function fakeRelationshipMemory(options: { result?: ProcessedNote; fail?: boolean } = {}) {
  const calls: { note: string; context: ContactContext }[] = [];
  const memory: RelationshipMemory = {
    async remember(note, context) {
      calls.push({ note, context });
      if (options.fail) throw new Error("Fake relationship memory failed");
      return options.result ?? { summary: `Summary of: ${note}`, keyTopics: ["topic"], followUps: ["question?"] };
    },
  };
  return { ...memory, calls };
}
