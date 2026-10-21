import { useNews } from "../hooks/useNews";
import { useState } from "react";

import { Link } from "react-router-dom";

import {
  ShieldAlert,
  Landmark,
  Scale,
  MapPin,
  Download,
  ArrowRight,
  Search,
  ChevronRight,
  Globe2,
  Clock,
  HeartHandshake
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import {
  localized,
  getPublishedNews,
  matchesCountry,
  formatDate
} from "../utils/content";

import CurrencyRates from "../components/CurrencyRates";
import NewsImage from "../components/NewsImage";

export default function Home() {
  const t = useT();
  const { articles: feedArticles, loading: newsLoading, unavailable: newsUnavailable } = useNews();

  const {
    country,
    city,
    countryCode
  } = useCountry();

  const [offlineMessage, setOfflineMessage] =
    useState("");

  const [search, setSearch] = useState("");
  const services = [
    { to: "/world-clock", key: "worldClock", description: "worldClockIntro", icon: Clock, color: "amber" },
    { to: "/embassy", key: "embassy", description: "embassyIntro", icon: Landmark, color: "green" },
    { to: "/rights", key: "rights", description: "rightsIntro", icon: Scale, color: "blue" },
    { to: "/location", key: "chooseLocation", description: "locationIntro", icon: MapPin, color: "amber" },
    { to: "/about", key: "about", description: "supportIntro", icon: HeartHandshake, color: "purple" }
  ];
  const filteredServices = services.filter((item) =>
    (t(item.key) + " " + t(item.description)).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  const latestNews = feedArticles
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
    <div className="page home-page mobile-home">
      <section className="home-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">{t("homeEyebrow")}</span>
          <h1>{t("homeWelcome")}</h1>
          <p>{t("homeWelcomeNote")}</p>
          <Link to="/location" className="hero-location">
            <MapPin size={15} aria-hidden="true" />
            <span>{country ? localized(country.name, t.lang) : t("chooseLocation")}{city ? ", " + localized(city.name, t.lang) : ""}</span>
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true"><Globe2 size={100} strokeWidth={0.8} /><span><ShieldAlert size={27} /></span></div>
      </section>

      <div className="home-search">
        <Search size={22} aria-hidden="true" />
        <label htmlFor="service-search" className="sr-only">{t("searchServices")}</label>
        <input id="service-search" type="search" placeholder={t("searchServices")} value={search} onChange={(event) => setSearch(event.target.value)} aria-controls="home-services" />
      </div>

      <nav className="quick-actions" aria-label={t("quickHelp")}>
        {[{ to: "/emergency", label: "emergency", icon: ShieldAlert, color: "red" },
          { to: "/embassy", label: "embassy", icon: Landmark, color: "green" },
          { to: "/rights", label: "rights", icon: Scale, color: "blue" },
          { to: "#currency-heading", label: "currencyShort", icon: Globe2, color: "amber" }].map(({ to, label, icon: Icon, color }) =>
          to.startsWith("#") ? <a href={to} key={to}><span className={"action-icon " + color}><Icon size={26} aria-hidden="true" /></span><span>{t(label)}</span></a> :
          <Link to={to} key={to}><span className={"action-icon " + color}><Icon size={26} aria-hidden="true" /></span><span>{t(label)}</span></Link>
        )}
      </nav>

      <div className="mobile-home-grid">
        <section className="home-section services-section" aria-labelledby="services-heading">
          <div className="home-section-heading"><h2 id="services-heading">{t("servicesTitle")}</h2><span className="section-kicker">{t("hereToHelp")}</span></div>
          <div id="home-services" className="service-rows">
            {filteredServices.length === 0 && <p role="status">{t("noneFound")}</p>}
            {filteredServices.map(({ to, key, description, icon: Icon, color }) => <Link to={to} key={to} className="service-row">
              <span className={"action-icon " + color}><Icon size={25} aria-hidden="true" /></span>
              <span className="service-row-copy"><strong>{t(key)}</strong><small>{t(description)}</small></span>
              <ChevronRight size={20} aria-hidden="true" />
            </Link>)}
          </div>
        </section>

        <section className="home-section news-section" aria-labelledby="home-news-heading">
          <div className="home-section-heading"><h2 id="home-news-heading">{t("news")}</h2><Link to="/news">{t("seeAllNews")} <ArrowRight size={15} aria-hidden="true" /></Link></div>
          <div className="home-news-carousel">
            {latestNews.length === 0 && <p>{t("newsEmpty")}</p>}
            {latestNews.map((article) => <article className="home-news-card" key={article.id}>
              <NewsImage article={article} />
              <div className="home-news-card-body"><span className="news-publisher">{article.sourceName}</span>
                <h3><Link to={"/news/" + article.id}>{localized(article.title, t.lang)}</Link></h3>
                <span className="metadata">{formatDate(article.publishedAt, t.lang)}</span>
              </div>
            </article>)}
          </div>
        </section>
      </div>

      <CurrencyRates />
      <section className="home-offline">
        <span className="action-icon green"><Download size={24} aria-hidden="true" /></span>
        <div><h2>{t("saveOffline")}</h2><p>{t("offlineDescription")}</p></div>
        <button type="button" onClick={saveOffline} aria-label={t("saveOffline")}><Download size={22} aria-hidden="true" /></button>
        {offlineMessage && <p className="offline-status" role="status">{offlineMessage}</p>}
      </section>
    </div>
  );
}
