import Papa from "papaparse";
import type { GradeScale, TaskPriority } from "@/data/types";

/** Parsed rows ready to be inserted once the target subjects exist. */
export interface ImportedGrade {
  subject: string;
  title: string;
  value: number;
  weight: number;
  date: string; // YYYY-MM-DD
  scale?: GradeScale;
}

export interface ImportedTask {
  title: string;
  subject: string | null;
  due_at: string | null;
  priority: TaskPriority;
  description: string | null;
}

export interface ImportedCard {
  front: string;
  back: string;
  deck: string;
}

export interface ImportedNote {
  title: string;
  content_markdown: string;
  folder: string | null;
}

export interface ParseResult<T> {
  items: T[];
  errors: string[];
}

const HEADER_ALIASES: Record<string, string[]> = {
  subject: ["subject", "fach", "kurs", "course"],
  title: ["title", "titel", "name", "bezeichnung", "aufgabe", "task"],
  value: ["value", "note", "grade", "wert", "punkte", "points", "prozent", "percent"],
  weight: ["weight", "gewicht", "gewichtung"],
  date: ["date", "datum"],
  due: ["due", "due_at", "faellig", "fällig", "fälligkeit", "deadline", "due date"],
  priority: ["priority", "priorität", "prioritaet", "prio"],
  description: ["description", "beschreibung", "notes", "notiz"],
};

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key)) return canonical;
  }
  return key;
}

function parseCsv(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
    delimitersToGuess: [",", ";", "\t", "|"],
  });
  return { rows: res.data, errors: res.errors.map((e) => `Zeile ${(e.row ?? 0) + 2}: ${e.message}`) };
}

/** Accepts `1,5`, `1.5`, `13 P`, `85%`. */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const cleaned = raw.replace(/[^\d,.\-+]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Accepts ISO dates and German `TT.MM.JJJJ`; returns YYYY-MM-DD or null. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(s);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function parseGradesCsv(text: string, defaultScale: GradeScale): ParseResult<ImportedGrade> {
  const { rows, errors } = parseCsv(text);
  const items: ImportedGrade[] = [];
  rows.forEach((row, i) => {
    const value = parseNumber(row.value);
    const subject = row.subject?.trim();
    if (!subject || value === null) {
      errors.push(`Zeile ${i + 2}: Fach oder Wert fehlt`);
      return;
    }
    items.push({
      subject,
      title: row.title?.trim() || "Import",
      value,
      weight: parseNumber(row.weight) ?? 1,
      date: parseDate(row.date) ?? new Date().toISOString().slice(0, 10),
      scale: defaultScale,
    });
  });
  return { items, errors };
}

export function parseTasksCsv(text: string): ParseResult<ImportedTask> {
  const { rows, errors } = parseCsv(text);
  const items: ImportedTask[] = [];
  rows.forEach((row, i) => {
    const title = row.title?.trim();
    if (!title) {
      errors.push(`Zeile ${i + 2}: Titel fehlt`);
      return;
    }
    const prioRaw = parseNumber(row.priority);
    const priority = (prioRaw && prioRaw >= 1 && prioRaw <= 3 ? Math.round(prioRaw) : 2) as TaskPriority;
    const due = parseDate(row.due);
    items.push({
      title,
      subject: row.subject?.trim() || null,
      due_at: due ? `${due}T23:59:00.000Z` : null,
      priority,
      description: row.description?.trim() || null,
    });
  });
  return { items, errors };
}

/**
 * Anki plain-text export ("Notes in Plain Text"): one card per line,
 * front and back separated by a tab (or `;`), optional `#key:value` header
 * lines, optional deck column when "Include deck name" was ticked.
 * `.apkg` archives are not supported.
 */
export function parseAnkiText(text: string, defaultDeck: string): ParseResult<ImportedCard> {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  let separator = "\t";
  let deckColumn: number | null = null;
  let html = false;
  const items: ImportedCard[] = [];
  const errors: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("#")) {
      const m = /^#(\w+):(.*)$/.exec(line);
      if (m) {
        const [, key, value] = m;
        if (key === "separator") {
          separator = value.trim() === "tab" ? "\t" : value.trim() === "semicolon" ? ";" : value.trim() === "comma" ? "," : value.trim() || "\t";
        } else if (key === "deck" && value.trim() && !Number.isNaN(Number(value))) {
          deckColumn = Number(value) - 1;
        } else if (key === "html") {
          html = value.trim() === "true";
        }
      }
      continue;
    }
    const cols = line.split(separator);
    if (cols.length < 2) {
      errors.push(`Ungültige Zeile: ${line.slice(0, 40)}`);
      continue;
    }
    let deck = defaultDeck;
    if (deckColumn !== null && cols[deckColumn] !== undefined) {
      deck = cols[deckColumn].split("::").pop()?.trim() || defaultDeck;
      cols.splice(deckColumn, 1);
    }
    const clean = (s: string) => (html ? s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "") : s).trim();
    items.push({ front: clean(cols[0]), back: clean(cols[1]), deck });
  }
  return { items, errors };
}

/** A Markdown file becomes one note; the title comes from the first heading or the file name. */
export function parseMarkdownNote(fileName: string, text: string, folder: string | null): ImportedNote {
  const body = text.replace(/^﻿/, "");
  const heading = /^#\s+(.+)$/m.exec(body);
  const title = heading?.[1]?.trim() || fileName.replace(/\.(md|markdown|txt)$/i, "");
  return { title, content_markdown: body, folder };
}
