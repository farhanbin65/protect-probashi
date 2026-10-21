import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { Link } from "react-router-dom";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import {
  getPublishedNews,
  localized,
  matchesCountry
} from "../utils/content";

import { useNews } from "../hooks/useNews";

export default function Ticker() {
  const t = useT();
  const { articles } = useNews();
  const { countryCode } = useCountry();

  const groupRef = useRef(null);

  const [holding, setHolding] =
    useState(false);

  const [hidden, setHidden] =
    useState(document.hidden);

  const [duration, setDuration] =
    useState(30);

  const items = useMemo(() => {
    return articles.filter(
      (item) => matchesCountry(item, countryCode)
    );
  }, [countryCode, articles]);

  useEffect(() => {
    function onVisibilityChange() {
      setHidden(document.hidden);
    }

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
    };
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;

    const updateDuration = () => {
      const width = groupRef.current?.getBoundingClientRect().width || 0;

      if (width > 0) {
        setDuration(Math.max(6, width / 60));
      }
    };

    const observer = new ResizeObserver(updateDuration);

    observer.observe(groupRef.current);
    updateDuration();

    return () => observer.disconnect();
  }, [items, t.lang]);

  if (items.length === 0) {
    return null;
  }

  const paused = holding || hidden;

  function renderHeadlines(accessible = false) {
    return items.map((item) => (
      <Link
        key={item.id}
        to={`/news/${item.id}`}
        className="ticker-item"
        tabIndex={accessible ? 0 : -1}
      >
        {item.urgent && (
          <span
            className="urgent-dot"
            aria-hidden="true"
          />
        )}

        <span>
          {localized(item.title, t.lang)}
        </span>
      </Link>
    ));
  }

  return (
    <section
      className={`ticker ${paused ? "is-paused" : ""}`}
      role="region"
      aria-label={t("tickerLabel")}
      dir="ltr"
    >
      <div className="ticker-label">
        {t("latest")}
      </div>

      <div
        className="ticker-viewport"
        onPointerDown={(event) => {
          if (event.pointerType === "touch") {
            setHolding(true);
          }
        }}
        onPointerUp={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
      >
        <div
          className="ticker-track ticker-track--ltr"
          style={{
            "--ticker-duration": `${duration}s`
          }}
          aria-hidden="true"
        >
          <div
            ref={groupRef}
            className="ticker-group"
          >
            {renderHeadlines()}
          </div>

          <div className="ticker-group">
            {renderHeadlines()}
          </div>
        </div>
      </div>

      <ul className="ticker-accessible sr-only">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/news/${item.id}`}>
              {item.urgent
                ? `${t("urgent")}: `
                : ""}
              {localized(item.title, t.lang)}
            </Link>
          </li>
        ))}
      </ul>


    </section>
  );
}