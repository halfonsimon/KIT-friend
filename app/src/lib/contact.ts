import type { ContactLike } from "./due";

export const CATEGORY_VALUES = ["FAMILY", "FRIEND", "WORK", "OTHER"] as const;

export type Category = (typeof CATEGORY_VALUES)[number];

export const DEFAULT_CATEGORY: Category = "FRIEND";

export type ContactContext = {
  name: string;
  category: Category;
  existingSummary: string | null;
  existingTopics: string[];
  existingFollowUps: string[];
  recentInteractions: { note: string; date: Date }[];
};

type DueContactSource = {
  id: string;
  name: string;
  phone: string | null;
  intervalDays: number;
  createdAt: Date;
  lastContactedAt: Date | null;
};

type AiMemorySource = {
  name: string;
  category: string;
  aiSummary: string | null;
  keyTopics: string | null;
  followUps: string | null;
  interactions: { note: string | null; notedAt: Date }[];
};

type StoredAiMemorySource = {
  aiSummary: string | null;
  keyTopics: string | null;
  followUps: string | null;
};

export function asCategory(value: string | null | undefined): Category {
  return CATEGORY_VALUES.includes(value as Category)
    ? (value as Category)
    : DEFAULT_CATEGORY;
}

export function parseStoredStringArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function stringifyStoredStringArray(values: string[]): string {
  return JSON.stringify(values);
}

export function readStoredAiMemory(contact: StoredAiMemorySource) {
  return {
    aiSummary: contact.aiSummary,
    keyTopics: parseStoredStringArray(contact.keyTopics),
    followUps: parseStoredStringArray(contact.followUps),
  };
}

export function buildContactContext(contact: AiMemorySource): ContactContext {
  const aiMemory = readStoredAiMemory(contact);

  return {
    name: contact.name,
    category: asCategory(contact.category),
    existingSummary: aiMemory.aiSummary,
    existingTopics: aiMemory.keyTopics,
    existingFollowUps: aiMemory.followUps,
    recentInteractions: contact.interactions
      .filter((interaction): interaction is { note: string; notedAt: Date } => {
        return typeof interaction.note === "string" && interaction.note.trim().length > 0;
      })
      .map((interaction) => ({
        note: interaction.note.trim(),
        date: interaction.notedAt,
      })),
  };
}

export function toContactLike(contact: DueContactSource): ContactLike {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    intervalDays: contact.intervalDays,
    createdAt: contact.createdAt,
    lastContactedAt: contact.lastContactedAt ?? undefined,
  };
}
