import { Languages } from "lucide-react";
import { useT } from "../hooks/useT";

export default function LanguageSwitcher() {
  const t = useT();
  const nextLanguage = t.lang === "bn" ? "en" : "bn";
  const label = nextLanguage === "en" ? "English" : "বাংলা";

  return (
    <button
      type="button"
      className="language-switcher"
      onClick={() => t.setLang(nextLanguage)}
      aria-label={nextLanguage === "en" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
      lang={nextLanguage}
    >
      <Languages size={20} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
