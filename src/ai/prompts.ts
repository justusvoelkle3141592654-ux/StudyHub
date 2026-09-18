/**
 * Prompts for the four AI features. The language follows the UI language so
 * results match the user's notes.
 */
export type PromptLang = "de" | "en";

const LANG_LINE: Record<PromptLang, string> = {
  de: "Antworte auf Deutsch.",
  en: "Answer in English.",
};

export const SYSTEM_BASE = "You are a study assistant inside the StudyHub app. Work only with the material provided by the user; do not invent facts that are not in it. Use Markdown formatting where helpful.";

export function summarizeSystem(lang: PromptLang): string {
  return `${SYSTEM_BASE} Summarise the note concisely: a short paragraph followed by the key points as a bullet list. Keep terminology from the note. ${LANG_LINE[lang]}`;
}

export function flashcardsSystem(lang: PromptLang, count: number): string {
  return `${SYSTEM_BASE} Create up to ${count} flashcards from the material. Each card has a clear question or term on the front and a precise, self-contained answer on the back. Cover the most important facts first; avoid duplicates. ${LANG_LINE[lang]}`;
}

export function questionsSystem(lang: PromptLang, count: number): string {
  return `${SYSTEM_BASE} Write ${count} practice questions on the topic with model answers. Mix recall questions with questions that require understanding or application. ${LANG_LINE[lang]}`;
}

export function outlineSystem(lang: PromptLang, mode: "outline" | "draft"): string {
  const task =
    mode === "outline"
      ? "Propose a structured outline (headings and sub-headings with one line describing each section)."
      : "Write a first draft with headings, paragraphs and, where useful, bullet lists. Keep it factual and mark places where the author must add specific data with [...].";
  return `${SYSTEM_BASE} ${task} Output Markdown only, without a preface. ${LANG_LINE[lang]}`;
}

export function notePrompt(title: string, content: string): string {
  return `Title: ${title}\n\n${content}`;
}

export function topicPrompt(topic: string, context?: string): string {
  return context?.trim() ? `Topic: ${topic}\n\nExisting material:\n${context}` : `Topic: ${topic}`;
}
