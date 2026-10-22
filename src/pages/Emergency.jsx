import {
  ShieldAlert,
  Siren,
  Ambulance,
  Flame,
  Landmark,
  MapPin,
  Info,
  ExternalLink
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import embassies from "../data/embassies.json" with { type: "json" };

import {
  formatDate,
  localized,
  safeUrl
} from "../utils/content";

import BigButton from "../components/BigButton";
import PhoneAction from "../components/PhoneAction";

export default function Emergency() {
  const t = useT();

  const {
    country,
    countryCode,
    cityId
  } = useCountry();

  if (!country) {
    return (
      <div className="page stack">
        <h1>{t("emergency")}</h1>

        <p>{t("selectFirst")}</p>

        <BigButton
          to="/location?returnTo=/emergency"
          icon={MapPin}
          label={t("chooseLocation")}
        />
      </div>
    );
  }

  const services = [
    {
      id: "police",
      icon: Siren,
      number: country.emergency.police
    },
    {
      id: "ambulance",
      icon: Ambulance,
      number: country.emergency.ambulance
    },
    {
      id: "fire",
      icon: Flame,
      number: country.emergency.fire
    }
  ];

  const missions = embassies
    .filter(
      (item) => item.countryCode === countryCode
    )
    .sort(
      (a, b) =>
        Number(b.city === cityId) -
        Number(a.city === cityId)
    );

  const emergencySource = safeUrl(
    country.emergencySourceUrl
  );

  return (
    <div className="page emergency-page">
      <div className="page-heading page-heading--emergency">
        <ShieldAlert
          size={31}
          aria-hidden="true"
        />

        <h1>{t("emergency")}</h1>
      </div>

      <p className="page-intro">
        {localized(country.name, t.lang)}
      </p>

      <BigButton to="/location?returnTo=/emergency" icon={MapPin} label={t("chooseLocation")} variant="outline" />

      <p className="disclaimer">
        <Info size={22} aria-hidden="true" />

        <span>
          {t("emergencyDisclaimer")}
        </span>
      </p>

      <section className="section-spacing">
        <div className="emergency-grid">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <article
                key={service.id}
                className="panel emergency-panel"
              >
                <div className="item-heading">
                  <Icon
                    size={28}
                    aria-hidden="true"
                  />

                  <h2>{t(service.id)}</h2>
                </div>

                <PhoneAction
                  number={service.number}
                  variant="emergency"
                />

                <p className="metadata">
                  {t(country.emergencyLastVerified ? "lastVerified" : "sourceRetrieved")}:{" "}
                  {formatDate(
                    country.emergencyLastVerified || country.emergencyFetchedAt?.slice(0, 10),
                    t.lang
                  ) || t("unverified")}
                </p>
              </article>
            );
          })}
        </div>

        {emergencySource && (
          <a
            href={emergencySource}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link official-source"
          >
            <ExternalLink
              size={20}
              aria-hidden="true"
            />

            <span>{t("officialSource")}</span>
          </a>
        )}
      </section>

      <section className="section-spacing">
        <div className="item-heading">
          <Landmark
            size={27}
            aria-hidden="true"
          />

          <h2>{t("embassyHotline")}</h2>
        </div>

        <p className="muted">
          {t("jurisdictionNote")}
        </p>

        <div className="embassy-grid">
          {missions.map((mission) => (
            <article
              key={mission.id}
              className="panel emergency-mission-card"
            >
              <h3>
                {localized(mission.name, t.lang)}
              </h3>

              {mission.hotline && (
                <div className="detail-block">
                  <strong>{t("hotline")}</strong>

                  <PhoneAction
                    number={mission.hotline}
                    variant="emergency"
                  />
                </div>
              )}

              <div className="detail-block">
                <strong>{t("phone")}</strong>

                <PhoneAction
                  number={mission.phone}
                />

                {mission.phoneNote && (
                  <p className="metadata">
                    {localized(
                      mission.phoneNote,
                      t.lang
                    )}
                  </p>
                )}
              </div>

              <p className="metadata">
                {t("lastVerified")}:{" "}
                {formatDate(
                  mission.lastVerified,
                  t.lang
                ) || t("unverified")}
              </p>
            </article>
          ))}
        </div>

        <div className="section-spacing">
          <BigButton
            icon={Landmark}
            to="/embassy"
            label={t("embassyDirectory")}
            variant="outline"
          />
        </div>
      </section>

      <p className="metadata section-spacing">
        {t("sourceCheckedNote")}
      </p>
    </div>
  );
}