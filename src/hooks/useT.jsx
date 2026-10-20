import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import bn from "../i18n/bn.json";
import en from "../i18n/en.json";

const dictionaries = {
  bn,
  en
};

const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem("pp-language");

    if (stored === "bn" || stored === "en") {
      return stored;
    }
  } catch {
    // Storage may be unavailable.
  }

  return "bn";
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;

    // Both supported languages use LTR page layout.
    document.documentElement.dir = "ltr";

    try {
      localStorage.setItem("pp-language", lang);
    } catch {
      // Continue without persistent storage.
    }
  }, [lang]);

  const translate = useCallback(
    (key) => {
      return (
        dictionaries[lang]?.[key] ??
        dictionaries.en[key] ??
        key
      );
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      translate
    }),
    [lang, translate]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("LanguageProvider is missing");
  }

  const t = context.translate;

  return Object.assign(
    (key) => t(key),
    {
      lang: context.lang,
      setLang: context.setLang
    }
  );
}