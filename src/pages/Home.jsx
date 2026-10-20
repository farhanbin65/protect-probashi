import { useState } from "react";

import { Link } from "react-router-dom";

import {
  ShieldAlert,
  Landmark,
  Scale,
  Newspaper,
  MapPin,
  Pencil,
  Download,
  Info,
  ArrowRight,
  Clock
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import {
  localized,
  getPublishedNews,
  matchesCountry,
  formatDate
} from "../utils/content";

import BigButton from "../components/BigButton";
import Card from "../components/Card";

export default function Home() {
  const t = useT();

  const {
    country,
    city,
    countryCode
  } = useCountry();

  const [offlineMessage, setOfflineMessage] =
    useState("");

  const latestNews = getPublishedNews()
    .filter((item) =>
      matchesCountry(item, countryCode)
    )
    .slice(0, 3);

  async function saveOffline() {
    if (!("serviceWorker" in navigator)) {
      setOfflineMessage(t("offlineUnavailable"));
      return;
    }

    try {
      const registration =
        await navigator.serviceWorker.getRegistration();

      if (!registration?.active) {
        setOfflineMessage(t("offlineProduction"));
        return;
      }

      const cacheNames = await caches.keys();

      const hasPrecache = cacheNames.some(
        (name) => name.includes("workbox-precache")
      );

      setOfflineMessage(
        hasPrecache
          ? t("offlineSaved")
          : t("offlineUnavailable")
      );
    } catch {
      setOfflineMessage(t("offlineUnavailable"));
    }
  }

  return (
    <div className="page home-page">
      {/* Welcome */}
      <section className="welcome dashboard-welcome">
        <h1>{t("brand")}</h1>

        <p>{t("tagline")}</p>
      </section>

      <div className="home-dashboard">

        {/* LOCATION */}
        <section className="dashboard-location panel">
          <div className="dashboard-section-heading">
            <MapPin
              size={24}
              aria-hidden="true"
            />

            <h2>{t("yourLocation")}</h2>
          </div>

          <div className="dashboard-location__value">
            <span className="muted">
              {t("yourCountry")}
            </span>

            <strong>
              {country
                ? localized(country.name, t.lang)
                : t("notSelected")}
            </strong>

            {city && (
              <span>
                {localized(city.name, t.lang)}
              </span>
            )}
          </div>

          <BigButton
            to="/location"
            icon={Pencil}
            label={t("change")}
            variant="outline"
          />
        </section>

        {/* EMERGENCY */}
        <section className="dashboard-emergency panel">
          <div className="dashboard-emergency__content">
            <div className="dashboard-section-heading">
              <ShieldAlert
                size={30}
                aria-hidden="true"
              />

              <h2>{t("emergency")}</h2>
            </div>

            <p>
              {t("emergencyIntro")}
            </p>
          </div>

          <BigButton
            to="/emergency"
            icon={ShieldAlert}
            label={t("emergency")}
            variant="emergency"
            className="home-emergency"
          />
        </section>

        {/* SERVICES */}
        <section className="dashboard-services">
          <div className="dashboard-section-heading">
            <h2>{t("servicesTitle")}</h2>
          </div>

          <div className="feature-list home-services">
            <Card
              to="/embassy"
              icon={Landmark}
              title={t("embassy")}
              description={t("embassyIntro")}
            />

            <Card
              to="/rights"
              icon={Scale}
              title={t("rights")}
              description={t("rightsIntro")}
            />

            <Card
              to="/news"
              icon={Newspaper}
              title={t("news")}
              description={t("newsIntro")}
            />
          </div>
        </section>

        {/* LATEST NEWS */}
        <aside className="dashboard-updates panel">
          <div className="dashboard-section-heading">
            <Newspaper
              size={24}
              aria-hidden="true"
            />

            <h2>{t("latestUpdates")}</h2>
          </div>

          <div className="dashboard-news-list">
            {latestNews.length === 0 ? (
              <p className="muted">
                {t("newsEmpty")}
              </p>
            ) : (
              latestNews.map((article) => (
                <Link
                  key={article.id}
                  to={`/news/${article.id}`}
                  className="dashboard-news-item"
                >
                  <strong>
                    {localized(article.title, t.lang)}
                  </strong>

                  <span className="dashboard-news-date">
                    <Clock
                      size={16}
                      aria-hidden="true"
                    />

                    {formatDate(
                      article.publishedAt,
                      t.lang
                    )}
                  </span>
                </Link>
              ))
            )}
          </div>

          <Link
            to="/news"
            className="dashboard-view-all"
          >
            <span>{t("seeAllNews")}</span>

            <ArrowRight
              size={20}
              aria-hidden="true"
            />
          </Link>
        </aside>

        {/* OFFLINE */}
        <section className="dashboard-offline panel">
          <div>
            <div className="dashboard-section-heading">
              <Download
                size={24}
                aria-hidden="true"
              />

              <h2>{t("saveOffline")}</h2>
            </div>

            <p>{t("offlineDescription")}</p>
          </div>

          <BigButton
            icon={Download}
            label={t("saveOffline")}
            variant="outline"
            onClick={saveOffline}
          />

          {offlineMessage && (
            <p role="status" className="status-text">
              {offlineMessage}
            </p>
          )}
        </section>
      </div>

      <Link
        to="/about"
        className="text-link dashboard-about"
      >
        <Info size={20} aria-hidden="true" />

        <span>{t("about")}</span>
      </Link>
    </div>
  );
}