// Small sentence-building helpers for the screens. How a Contact reads lives in @/lib/contact-card.
import type { ContactCard } from "@/lib/contact-card";

/** "Last talked on 27 March" → "last talked on 27 March", for use after a comma. */
export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** "Family, last talked on 27 March". */
export const categoryAndLastTalked = (label: string, p: Pick<ContactCard, "lastTalked">) =>
  `${label}, ${lowerFirst(p.lastTalked)}`;

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** 3 → "Three", 12 → "12": words read better at the start of a sentence. */
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
