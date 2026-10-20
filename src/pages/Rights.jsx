import { Scale } from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import rights from "../data/rights.json";

import { localized } from "../utils/content";

import Card from "../components/Card";

export default function Rights() {
  const t = useT();

  const { countryCode } = useCountry();

  const topics = rights.filter(
    (item) =>
      item.countryCode === "global" ||
      item.countryCode === countryCode
  );

  return (
    <div className="page">
      <div className="page-heading">
        <Scale size={30} aria-hidden="true" />

        <h1>{t("rights")}</h1>
      </div>

      <p>{t("rightsIntro")}</p>

      <p className="notice">
        {t("sampleWarning")}
      </p>

      <p className="disclaimer">
        {t("rightsDisclaimer")}
      </p>

      <div className="feature-list">
        {topics.map((topic) => (
          <Card
            key={topic.id}
            to={`/rights/${topic.id}`}
            icon={Scale}
            title={localized(topic.title, t.lang)}
          />
        ))}
      </div>
    </div>
  );
}