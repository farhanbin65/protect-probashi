import { Link, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Scale,
  Landmark,
  ShieldAlert,
  Volume2
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import rights from "../data/rights.json";

import {
  localized,
  formatDate
} from "../utils/content";

import BigButton from "../components/BigButton";

export default function RightsDetail() {
  const { id } = useParams();

  const t = useT();
  const { countryCode } = useCountry();

  const topic = rights.find(
    (item) =>
      item.id === id &&
      (
        item.countryCode === "global" ||
        item.countryCode === countryCode
      )
  );

  if (!topic) {
    return (
      <div className="page">
        <h1>{t("notFound")}</h1>
        <BigButton
          to="/rights"
          icon={ArrowLeft}
          label={t("back")}
        />
      </div>
    );
  }

  const steps =
    topic.steps[t.lang] ||
    topic.steps.en ||
    [];

  const helpRoutes = {
    embassy: {
      to: "/embassy",
      icon: Landmark,
      label: t("embassyDirectory")
    },

    emergency: {
      to: "/emergency",
      icon: ShieldAlert,
      label: t("emergency")
    }
  };

  return (
    <article className="page">
      <Link to="/rights" className="text-link">
        <ArrowLeft
          className="back-icon"
          size={20}
          aria-hidden="true"
        />

        <span>{t("back")}</span>
      </Link>

      <div className="page-heading">
        <Scale size={30} aria-hidden="true" />

        <h1>
          {localized(topic.title, t.lang)}
        </h1>
      </div>

      <p className="notice">
        {t("sampleWarning")}
      </p>

      <p className="disclaimer">
        {t("rightsDisclaimer")}
      </p>

      <section className="panel">
        <h2>{t("steps")}</h2>

        <ol className="rights-steps">
          {steps.slice(0, 6).map((step, index) => (
            <li key={index}>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {topic.audioUrl && (
        <section className="panel section-spacing">
          <div className="item-heading">
            <Volume2
              size={25}
              aria-hidden="true"
            />

            <h2>{t("listen")}</h2>
          </div>

          <audio
            controls
            preload="none"
            src={topic.audioUrl}
          />
        </section>
      )}

      <section className="panel section-spacing">
        <h2>{t("whereHelp")}</h2>

        <div className="stack">
          {topic.helpContacts.map((contact) => {
            const item = helpRoutes[contact];

            if (!item) return null;

            return (
              <BigButton
                key={contact}
                to={item.to}
                icon={item.icon}
                label={item.label}
                variant="outline"
              />
            );
          })}
        </div>
      </section>

      <p className="metadata section-spacing">
        {t("lastReviewed")}:{" "}
        {formatDate(topic.lastReviewed, t.lang) ||
          t("unverified")}
      </p>
    </article>
  );
}