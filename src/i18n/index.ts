// i18n configuration
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";

export const supportedLanguages = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]["code"];

const resources = {
    en: { translation: en },
    es: { translation: es },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        debug: process.env.NODE_ENV === "development",
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
        },
    });

export default i18n;
