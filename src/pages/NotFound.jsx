import { Link } from "react-router-dom";

import { Home } from "lucide-react";

import { useT } from "../hooks/useT";

export default function NotFound() {
  const t = useT();

  return (
    <div className="page stack">
      <h1>{t("notFound")}</h1>

      <p>{t("notFoundText")}</p>

      <Link
        to="/"
        className="big-button big-button--primary"
      >
        <Home size={24} aria-hidden="true" />

        <span>{t("goHome")}</span>
      </Link>
    </div>
  );
}