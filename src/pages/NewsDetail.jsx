import { useNews } from "../hooks/useNews";
import NewsImage from "../components/NewsImage";
import { Link, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Newspaper,
  ExternalLink
} from "lucide-react";

import { useT } from "../hooks/useT";

import {
  getPublishedNews,
  localized,
  formatDate,
  safeUrl
} from "../utils/content";

export default function NewsDetail() {
  const { id } = useParams();

  const t = useT();
  const { articles: feedArticles, loading: newsLoading, unavailable: newsUnavailable } = useNews();

  const article = feedArticles.find(
    (item) => item.id === id
  );

  if (!article && newsLoading) return <div className="page" role="status">{t("loading")}</div>;

  if (!article) {
    return (
      <div className="page">
        <h1>{t("notFound")}</h1>

        <Link to="/news" className="text-link">
          <ArrowLeft size={20} aria-hidden="true" />
          <span>{t("back")}</span>
        </Link>
      </div>
    );
  }

  const sourceUrl = safeUrl(article.sourceUrl);

  return (
    <article className="page">
      <Link to="/news" className="text-link">
        <ArrowLeft
          className="back-icon"
          size={20}
          aria-hidden="true"
        />

        <span>{t("back")}</span>
      </Link>

      <div className="page-heading">
        <Newspaper size={30} aria-hidden="true" />

        <h1>
          {localized(article.title, t.lang)}
        </h1>
      </div>

      <p className="metadata">{t("newsSummaryNote")}</p>

      {article.urgent && (
        <p className="urgent-label">
          <span
            className="urgent-dot"
            aria-hidden="true"
          />

          {t("urgent")}
        </p>
      )}

      <p className="metadata">
        {t("published")}:{" "}
        {formatDate(article.publishedAt, t.lang)}
      </p>

      <NewsImage article={article} />

      <section className="panel">
        <p>
          {localized(article.summary, t.lang)}
        </p>
      </section>

      <section className="section-spacing">
        <h2>{t("source")}</h2>

        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            <ExternalLink
              size={20}
              aria-hidden="true"
            />

            <span>{article.sourceName}</span>
          </a>
        ) : (
          <p>{t("sourceMissing")}</p>
        )}
      </section>
    </article>
  );
}