import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./locales/de.json";
import en from "./locales/en.json";
import { useUiStore } from "@/stores/uiStore";

export const resources = { de: { translation: de }, en: { translation: en } } as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: useUiStore.getState().language,
  fallbackLng: "de",
  interpolation: { escapeValue: false },
  returnNull: false,
});

useUiStore.subscribe((s) => {
  if (i18n.language !== s.language) void i18n.changeLanguage(s.language);
});

export default i18n;
