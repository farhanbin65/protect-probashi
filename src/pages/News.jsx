import { useNews } from "../hooks/useNews";
import NewsImage from "../components/NewsImage";
import { useEffect, useRef, useState } from "react";

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
  const { articles: feedArticles, loading: newsLoading, unavailable: newsUnavailable } = useNews();

  const { countryCode } = useCountry();

  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const listStart = useRef(null);
  useEffect(() => { setPage(1); }, [countryCode]);

  const articles = feedArticles.filter((item) => {
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

  const pageCount = Math.max(1, Math.ceil(articles.length / 6));
  const currentPage = Math.min(page, pageCount);
  const visibleArticles = articles.slice((currentPage - 1) * 6, currentPage * 6);
  const number = value => new Intl.NumberFormat(t.lang === "bn" ? "bn-BD" : "en-GB").format(value);
  function changePage(next) {
    setPage(next);
    listStart.current?.focus({ preventScroll: true });
    listStart.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="page">
      <div className="page-heading">
        <Newspaper size={30} aria-hidden="true" />

        <h1>{t("news")}</h1>
      </div>

      <p>{t("newsIntro")}</p>
      {newsLoading && <p role="status">{t("loading")}</p>}
      {newsUnavailable && <p role="status">{t("newsFeedUnavailable")}</p>}

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
            onClick={() => { setFilter(id); setPage(1); }}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{t(id)}</span>
          </button>
        ))}
      </div>

      <p ref={listStart} tabIndex={-1} className="metadata news-page-status" role="status">
        {articles.length > 0 && (t.lang === "bn"
          ? `${number(articles.length)}টি খবরের মধ্যে ${number((currentPage - 1) * 6 + 1)}–${number(Math.min(currentPage * 6, articles.length))}`
          : `Showing ${(currentPage - 1) * 6 + 1}–${Math.min(currentPage * 6, articles.length)} of ${articles.length} articles`)}
      </p>
      <div className="stack">
        {articles.length === 0 && (
          <p>{t("newsEmpty")}</p>
        )}

        {visibleArticles.map((article) => {
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
      {pageCount > 1 && <nav className="news-pagination" aria-label={t.lang === "bn" ? "খবরের পৃষ্ঠা" : "News pagination"}>
        <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>{t.lang === "bn" ? "আগের" : "Previous"}</button>
        <span>{t.lang === "bn" ? `${number(pageCount)} এর ${number(currentPage)}` : `Page ${currentPage} of ${pageCount}`}</span>
        <button type="button" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}>{t.lang === "bn" ? "পরের" : "Next"}</button>
      </nav>}
    </div>
  );
}