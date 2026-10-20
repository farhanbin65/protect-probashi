import { useState } from "react";
import missionsData from "../data/bd_missions.json" with { type: "json" };
import {
  Landmark,
  MapPin,
  Mail,
  Globe,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import embassies from "../data/embassies.json";
import countries from "../utils/directoryCountries";
import { mergeMissions } from "../utils/missions";

const embassyDirectory = mergeMissions(embassies, missionsData, countries);

import {
  localized,
  formatDate,
  isValidPhone,
  safeUrl
} from "../utils/content";

import BigButton from "../components/BigButton";
import PhoneAction from "../components/PhoneAction";

function EmbassyRecord({ mission, country }) {
  const t = useT();

  const [copyStatus, setCopyStatus] = useState("");

  const city = country.cities.find(
    (item) => item.id === mission.city
  );

  const validPhone = isValidPhone(mission.phone);

  const website = safeUrl(mission.website);
  const sourceUrl = safeUrl(mission.sourceUrl);

  const mapsUrl = mission.address
    ? `https://www.google.com/maps/search/?api=1&query=${
        encodeURIComponent(mission.address)
      }`
    : null;

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(
        mission.phone
      );

      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <article className="panel embassy-record">
      <div className="item-heading">
        <Landmark
          size={27}
          aria-hidden="true"
        />

        <h2>
          {localized(mission.name, t.lang)}
        </h2>
      </div>

      <p className="muted">
        {t(
          mission.type === "permanentMission"
            ? "permanentMission"
            : mission.type === "highCommission" ? "highCommission"
            : mission.type === "consulate" ? "consulate" : "embassy"
        )}
      </p>

      {city && (
        <p className="detail-row">
          <MapPin
            size={20}
            aria-hidden="true"
          />

          <span>
            {localized(city.name, t.lang)}
          </span>
        </p>
      )}

      <div className="detail-block">
        <strong>{t("phone")}</strong>

        <PhoneAction number={mission.phone} />

        {mission.phoneNote && (
          <p className="metadata">
            {localized(
              mission.phoneNote,
              t.lang
            )}
          </p>
        )}

        {validPhone && (
          <BigButton
            icon={
              copyStatus === "copied"
                ? Check
                : Copy
            }
            label={
              copyStatus === "copied"
                ? t("copied")
                : t("copy")
            }
            variant="outline"
            onClick={copyNumber}
          />
        )}

        {copyStatus === "failed" && (
          <p role="status">
            {t("copyFailed")}
          </p>
        )}
      </div>

      {mission.hotline && (
        <div className="detail-block">
          <strong>{t("hotline")}</strong>

          <PhoneAction number={mission.hotline} />
        </div>
      )}

      <div className="detail-block">
        <strong>{t("email")}</strong>

        <p className="word-break">
          {mission.email || t("unverified")}
        </p>

        {mission.email && (
          <BigButton
            icon={Mail}
            label={t("openEmail")}
            href={`mailto:${mission.email}`}
            variant="outline"
          />
        )}
      </div>

      <div className="detail-block">
        <strong>{t("address")}</strong>

        <p className="word-break">
          {mission.address || t("unverified")}
        </p>

        {mapsUrl && (
          <BigButton
            icon={MapPin}
            label={t("openMaps")}
            href={mapsUrl}
            variant="outline"
            target="_blank"
            rel="noopener noreferrer"
          />
        )}
      </div>

      <div className="detail-block">
        <strong>{t("website")}</strong>

        {website ? (
          <BigButton
            icon={Globe}
            label={t("openWebsite")}
            href={website}
            variant="outline"
            target="_blank"
            rel="noopener noreferrer"
          />
        ) : (
          <p>{t("unverified")}</p>
        )}
      </div>

      <div className="embassy-record__footer">
        <p className="metadata">
          {t("lastVerified")}:{" "}
          {formatDate(
            mission.lastVerified,
            t.lang
          ) || t("unverified")}
        </p>

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            <ExternalLink
              size={19}
              aria-hidden="true"
            />

            <span>{t("officialSource")}</span>
          </a>
        )}
      </div>
    </article>
  );
}

export default function Embassy() {
  const t = useT();

  const {
    countryCode,
    cityId
  } = useCountry();

  const [filterCountry, setFilterCountry] = useState("");
  const missions = embassyDirectory
    .filter((item) => !filterCountry || item.countryCode === filterCountry)
    .sort((a, b) =>
      Number(b.countryCode === countryCode) - Number(a.countryCode === countryCode) ||
      Number(b.city === cityId) - Number(a.city === cityId)
    );

  return (
    <div className="page embassy-page">
      <div className="page-heading">
        <Landmark
          size={30}
          aria-hidden="true"
        />

        <h1>{t("embassyDirectory")}</h1>
      </div>

      <p className="page-intro">
        {t("embassyIntro")}
      </p>

      <p className="muted">
        {t("jurisdictionNote")}
      </p>

      <label htmlFor="embassy-country">{t("country")}</label>
      <select id="embassy-country" value={filterCountry} onChange={(event) => setFilterCountry(event.target.value)}>
        <option value="">{t("allCountries")}</option>
        {countries.map((item) => <option key={item.code} value={item.code}>{localized(item.name, t.lang)}</option>)}
      </select>

      <div className="embassy-grid">
        {missions.length === 0 ? (
          <p>{t("noneFound")}</p>
        ) : (
          missions.map((mission) => (
            <EmbassyRecord
              key={mission.id}
              mission={mission}
              country={countries.find((item) => item.code === mission.countryCode)}
            />
          ))
        )}
      </div>

      <p className="metadata section-spacing">
        {t("directorySourceNote")}
      </p>
    </div>
  );
}