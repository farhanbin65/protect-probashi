import NewsImage from "../components/NewsImage";
import { useState } from "react";

import { Link } from "react-router-dom";

import {
  Newspaper,
  ListFilter,
  MapPin,
  Globe,
  ArrowRight,
  ExternalLink
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import {
  getPublishedNews,
  localized,
  formatDate,
  safeUrl
} from "../utils/content";

const filters = [
  { id: "all", icon: ListFilter },
  { id: "myCountry", icon: MapPin },
  { id: "worldwide", icon: Globe }
];

export default function News() {
  const t = useT();

  const { countryCode } = useCountry();

  const [filter, setFilter] = useState("all");

  const articles = getPublishedNews().filter((item) => {
    if (filter === "worldwide") {
      return item.countryCodes.length === 0;
    }

    if (filter === "myCountry") {
      return (
        countryCode &&
        item.countryCodes.includes(countryCode)
      );
    }

    return true;
  });

  return (
    <div className="page">
      <div className="page-heading">
        <Newspaper size={30} aria-hidden="true" />

        <h1>{t("news")}</h1>
      </div>

      <p>{t("newsIntro")}</p>

      <p className="metadata">{t("newsSummaryNote")}</p>

      <div
        className="news-filters"
        role="group"
        aria-label={t("news")}
      >
        {filters.map(({ id, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={
              filter === id
                ? "filter-button active"
                : "filter-button"
            }
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{t(id)}</span>
          </button>
        ))}
      </div>

      <div className="stack">
        {articles.length === 0 && (
          <p>{t("newsEmpty")}</p>
        )}

        {articles.map((article) => {
          const sourceUrl = safeUrl(article.sourceUrl);

          return (
            <article
              className="panel news-card"
              key={article.id}
            >
              <NewsImage article={article} />
              {article.urgent && (
                <span className="urgent-label">
                  <span
                    className="urgent-dot"
                    aria-hidden="true"
                  />

                  {t("urgent")}
                </span>
              )}

              <h2>
                <Link to={`/news/${article.id}`}>
                  {localized(article.title, t.lang)}
                </Link>
              </h2>

              <p className="line-clamp-2">
                {localized(article.summary, t.lang)}
              </p>

              <p className="metadata">
                {t("published")}:{" "}
                {formatDate(
                  article.publishedAt,
                  t.lang
                )}
              </p>

              <div className="news-source">
                <span>{t("source")}:</span>

                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink
                      size={18}
                      aria-hidden="true"
                    />

                    <span>{article.sourceName}</span>
                  </a>
                ) : (
                  <span>{t("sourceMissing")}</span>
                )}
              </div>

              <Link
                to={`/news/${article.id}`}
                className="text-link"
              >
                <span>{t("readMore")}</span>

                <ArrowRight
                  className="direction-icon"
                  size={20}
                  aria-hidden="true"
                />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}