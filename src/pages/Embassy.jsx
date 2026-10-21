import { useState } from "react";
import missionsData from "../data/bd_missions.json" with { type: "json" };
import {
  Landmark,
  MapPin,
  Mail,
  Globe,
  Copy,
  Check,
  UserRound,
  ChevronDown,
  ExternalLink
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import details from "../data/mission_details.json";
import embassies from "../data/embassies.json";
import countries from "../utils/directoryCountries";
import { mergeMissions } from "../utils/missions";

const embassyDirectory = mergeMissions(embassies, missionsData, countries).map((mission) => {
  const extra = details.find((item) => item.id === mission.id);
  if (!extra) return mission;
  // Reviewed additions fill gaps; curated contact values always win.
  return { ...extra, ...Object.fromEntries(Object.entries(mission).filter(([, value]) => value != null && value !== "")), officers: extra.officers || mission.officers || [] };
});

import {
  localized,
  formatDate,
  isValidPhone,
  safeUrl
} from "../utils/content";

import BigButton from "../components/BigButton";
import PhoneAction from "../components/PhoneAction";

function StaffPhoto({ person }) {
  const [failed, setFailed] = useState(false);
  const url = safeUrl(person.imageUrl);
  return url && !failed ? <img className="staff-photo" src={url} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span className="staff-photo staff-placeholder"><UserRound aria-hidden="true" /></span>;
}

function EmbassyRecord({ mission, country }) {
  const t = useT();

  const [copyStatus, setCopyStatus] = useState("");

  const city = country.cities.find(
    (item) => item.id === mission.city
  );

  const validPhone = isValidPhone(mission.phone);
  const emergency = mission.countryEmergency?.numbers || country.emergency || {};
  const emergencySource = mission.countryEmergency?.sourceUrl || country.emergencySourceUrl;

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
    <details className="panel embassy-record">
      <summary className="embassy-summary">
      <div className="item-heading">
        <Landmark
          size={27}
          aria-hidden="true"
        />

        <h2>
          {localized(mission.name, t.lang)}
        </h2>
      </div>

      <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <div className="embassy-details">
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

      {mission.jurisdiction && <p>{localized(mission.jurisdiction, t.lang)}</p>}
      {isValidPhone(mission.whatsapp) && <div className="detail-block"><strong>WhatsApp</strong><p><a href={`https://wa.me/${mission.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{mission.whatsapp}</a></p></div>}
      {mission.additionalEmails?.map((contact) => <div className="detail-block" key={contact.email}><strong>{localized(contact.label, t.lang)}</strong><p className="word-break"><a href={`mailto:${contact.email}`}>{contact.email}</a></p></div>)}
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

      {(Object.keys(emergency).length > 0 || (!validPhone && !isValidPhone(mission.hotline))) && (
        <section className="embassy-emergency">
          <h3>{t("localEmergency")}</h3>
          <p>{t("localEmergencyNote")}</p>
          {Object.entries(emergency).filter(([, number]) => isValidPhone(number)).map(([service, number]) => <div key={service}><strong>{t(service)}</strong><PhoneAction number={number} /></div>)}
          {!Object.values(emergency).some(isValidPhone) && <p>{t("emergencyUnavailable")}</p>}
          {safeUrl(emergencySource) && <a className="text-link" href={safeUrl(emergencySource)} target="_blank" rel="noopener noreferrer">{t("officialSource")}</a>}
        </section>
      )}
      {!!mission.officers?.length && <section className="embassy-staff"><h3>{t("embassyStaff")}</h3>{mission.officers.map((person, index) => <div className="staff-card" key={index}>
        <StaffPhoto person={person} /><div><strong>{localized(person.name, t.lang)}</strong><p>{localized(person.designation, t.lang)}</p>
        {isValidPhone(person.phone) && <PhoneAction number={person.phone} />}
        {person.email && <p className="word-break"><a href={`mailto:${person.email}`}>{person.email}</a></p>}
        {safeUrl(person.sourceUrl) && <a href={safeUrl(person.sourceUrl)} target="_blank" rel="noopener noreferrer">{t("officialSource")}</a>}
        </div></div>)}</section>}
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
      </div>
    </details>
  );
}

export default function Embassy() {
  const t = useT();

  const {
    countryCode,
    cityId
  } = useCountry();

  const [filterCountry, setFilterCountry] = useState("");
  const [query, setQuery] = useState("");
  const missions = embassyDirectory
    .filter((item) => !filterCountry || item.countryCode === filterCountry)
    .filter((item) => {
      const country = countries.find((entry) => entry.code === item.countryCode);
      return [item.name.en, item.name.bn, item.city, country?.name.en, country?.name.bn].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    })
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

      <div className="embassy-filters">
      <div><label htmlFor="embassy-search">{t("searchEmbassies")}</label><input id="embassy-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchEmbassiesHint")} /></div>
      <div><label htmlFor="embassy-country">{t("country")}</label>
      <select id="embassy-country" value={filterCountry} onChange={(event) => setFilterCountry(event.target.value)}>
        <option value="">{t("allCountries")}</option>
        {countries.map((item) => <option key={item.code} value={item.code}>{localized(item.name, t.lang)}</option>)}
      </select></div></div>

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