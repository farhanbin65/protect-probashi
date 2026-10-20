import { useState } from "react";
import { useT } from "../hooks/useT";
import { localized, safeUrl } from "../utils/content";

export default function NewsImage({ article }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const imageUrl = safeUrl(article.imageUrl);
  if (!imageUrl || failed) return null;
  return (
    <figure className="news-image">
      <img
        src={imageUrl}
        alt={localized(article.imageAlt, t.lang)}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      <figcaption className="metadata">
        <a href={safeUrl(article.sourceUrl)} target="_blank" rel="noopener noreferrer">{article.imageCredit}</a>
      </figcaption>
    </figure>
  );
}
