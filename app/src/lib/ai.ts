/**
 * AI utilities for processing interaction notes and generating relationship summaries.
 * Uses Google Gemini to extract insights and maintain smart contact summaries.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Category, ContactContext } from "./contact";

export type ProcessedNote = {
  keyTopics: string[];
  followUps: string[];
  summary: string;
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenerativeAI(apiKey);
}

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
 * Process a new interaction note and generate updated summary, topics, and questions to ask.
 */
export async function processInteractionNote(
  newNote: string,
  context: ContactContext,
): Promise<ProcessedNote> {
  const categoryInstructions = getCategoryInstructions(context.category);

  const existingContext = context.existingSummary
    ? `Current summary: ${context.existingSummary}\nExisting topics: ${context.existingTopics.join(", ")}\nPending questions: ${context.existingFollowUps.join(", ")}`
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

2. QUESTIONS: What questions should the user ask next time they talk? (2-3 natural conversation questions based on recent topics). Format as JSON array of strings.

3. SUMMARY: Write a concise summary (2-3 sentences) of what's important to know about this person right now. Merge new info with existing, remove outdated info. Write in third person about the contact.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "keyTopics": ["topic1", "topic2", "topic3"],
  "followUps": ["question 1?", "question 2?"],
  "summary": "The summary text here."
}`;

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      throw new Error("No response from AI");
    }

    const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanedContent) as ProcessedNote;

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
