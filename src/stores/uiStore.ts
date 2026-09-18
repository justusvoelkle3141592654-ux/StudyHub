import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";
export type FontSize = "small" | "normal" | "large";
export type Language = "de" | "en";

interface UiState {
  theme: ThemeMode;
  density: Density;
  fontSize: FontSize;
  language: Language;
  sidebarCollapsed: boolean;
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: Density) => void;
  setFontSize: (size: FontSize) => void;
  setLanguage: (language: Language) => void;
  toggleSidebar: () => void;
}

const FONT_SIZES: Record<FontSize, string> = { small: "14px", normal: "16px", large: "18px" };

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/** Apply theme, density and font size to the document root. */
export function applyUiPreferences(state: Pick<UiState, "theme" | "density" | "fontSize" | "language">) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = state.theme === "dark" || (state.theme === "system" && systemPrefersDark());
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.density = state.density;
  root.style.setProperty("--app-font-size", FONT_SIZES[state.fontSize]);
  root.lang = state.language;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      density: "comfortable",
      fontSize: "normal",
      language: "de",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "studyhub-ui" },
  ),
);

// Keep the DOM in sync with the store and with the OS theme.
if (typeof window !== "undefined") {
  applyUiPreferences(useUiStore.getState());
  useUiStore.subscribe((s) => applyUiPreferences(s));
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    applyUiPreferences(useUiStore.getState());
  });
}
