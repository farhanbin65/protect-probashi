import { Languages } from "lucide-react";

import { useT } from "../hooks/useT";

export default function LanguageSwitcher() {
  const t = useT();

  return (
    <label className="language-switcher">
      <Languages
        size={20}
        aria-hidden="true"
      />

      <span className="sr-only">
        {t("language")}
      </span>

      <select
        value={t.lang}
        onChange={(event) =>
          t.setLang(event.target.value)
        }
        aria-label={t("language")}
      >
        <option value="bn">বাংলা</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}