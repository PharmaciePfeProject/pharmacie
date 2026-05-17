import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { messages } from "./messages";
const STORAGE_KEY = "platform-language";
const LanguageContext = createContext(undefined);
export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === "fr" ? "fr" : "en";
    });
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.lang = language;
    }, [language]);
    const value = useMemo(() => ({
        language,
        setLanguage: setLanguageState,
        t: (key, fallback) => messages[language][key] ?? fallback ?? key,
    }), [language]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }
    return context;
}
