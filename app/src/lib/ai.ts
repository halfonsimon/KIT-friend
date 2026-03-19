/**
 * AI utilities for processing interaction notes and generating relationship summaries.
 * Uses OpenAI to extract insights and maintain smart contact summaries.
 */
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type Category = "FAMILY" | "FRIEND" | "WORK" | "OTHER";

export type ProcessedNote = {
  keyTopics: string[];
  followUps: string[];
  summary: string;
};

export type ContactContext = {
  name: string;
  category: Category;
  existingSummary: string | null;
  existingTopics: string[];
  existingFollowUps: string[];
  recentInteractions: { note: string; date: Date }[];
};

/**
 * Get category-specific instructions for the AI summary style.
 */
function getCategoryInstructions(category: Category): string {
  switch (category) {
    case "FAMILY":
      return `This is a FAMILY member. Focus on:
- Personal life and wellbeing
- Health updates
- Family events and milestones
- Emotional connection and support
- Upcoming visits or gatherings
Keep the tone warm and personal.`;

    case "FRIEND":
      return `This is a FRIEND. Focus on:
- Life updates (job, relationships, moves)
- Shared interests and hobbies
- Plans to meet up or do activities together
- Important life events
Keep the tone casual and friendly.`;

    case "WORK":
      return `This is a WORK contact. Focus on:
- Professional role and company
- Projects they're working on
- Career developments and opportunities
- Potential collaborations or networking
- Industry insights they've shared
Keep the tone professional but personable.`;

    case "OTHER":
    default:
      return `Focus on the most relevant and recent information about this person.`;
  }
}

/**
 * Process a new interaction note and generate updated summary, topics, and follow-ups.
 */
export async function processInteractionNote(
  newNote: string,
  context: ContactContext
): Promise<ProcessedNote> {
  const categoryInstructions = getCategoryInstructions(context.category);

  const existingContext = context.existingSummary
    ? `Current summary: ${context.existingSummary}\nExisting topics: ${context.existingTopics.join(", ")}\nPending follow-ups: ${context.existingFollowUps.join(", ")}`
    : "No existing summary yet.";

  const recentHistory = context.recentInteractions
    .slice(0, 5)
    .map((i) => `- ${i.date.toLocaleDateString()}: ${i.note}`)
    .join("\n");

  const prompt = `You are a personal relationship assistant helping someone maintain meaningful connections.

Contact: ${context.name}
Category: ${context.category}

${categoryInstructions}

${existingContext}

Recent interaction history:
${recentHistory || "No previous interactions."}

NEW UPDATE from user: "${newNote}"

Based on this new information, provide:

1. KEY_TOPICS: Extract 3-5 important topics/themes about this person (combine with existing, remove outdated). Format as JSON array of strings.

2. FOLLOW_UPS: What should the user ask about or follow up on next time? (1-3 items, prioritize most recent/important). Format as JSON array of strings.

3. SUMMARY: Write a concise summary (2-4 sentences) of what's important to know about this person right now. Merge new info with existing, remove outdated info. Write in third person about the contact.

Respond in this exact JSON format:
{
  "keyTopics": ["topic1", "topic2", "topic3"],
  "followUps": ["follow up item 1", "follow up item 2"],
  "summary": "The summary text here."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content) as ProcessedNote;

    return {
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch (error) {
    console.error("AI processing error:", error);
    return {
      keyTopics: context.existingTopics,
      followUps: context.existingFollowUps,
      summary: context.existingSummary || "",
    };
  }
}

/**
 * Generate a quick briefing for a contact before reaching out.
 */
export async function generateBriefing(
  context: ContactContext,
  daysSinceContact: number
): Promise<string> {
  const categoryInstructions = getCategoryInstructions(context.category);

  const recentHistory = context.recentInteractions
    .slice(0, 5)
    .map((i) => `- ${i.date.toLocaleDateString()}: ${i.note}`)
    .join("\n");

  const prompt = `You are a personal assistant preparing a quick briefing before someone reaches out to a contact.

Contact: ${context.name}
Category: ${context.category}
Days since last contact: ${daysSinceContact}

${categoryInstructions}

Current summary: ${context.existingSummary || "No summary available."}
Key topics: ${context.existingTopics.join(", ") || "None recorded."}
Things to follow up on: ${context.existingFollowUps.join(", ") || "None."}

Recent interactions:
${recentHistory || "No recorded interactions."}

Generate a brief, helpful briefing (3-5 lines) that includes:
1. A quick reminder of who this person is and what matters to them
2. What to follow up on or ask about
3. A suggested opening line

Keep it conversational and helpful, like a personal assistant reminding you before a call.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || "No briefing available.";
  } catch (error) {
    console.error("AI briefing error:", error);
    return "Unable to generate briefing at this time.";
  }
}
