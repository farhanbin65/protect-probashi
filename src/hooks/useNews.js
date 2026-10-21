import { useEffect, useState } from 'react';
import { getPublishedNews } from '../utils/content';
const KEY = 'pp-rss-news';
let pending;
function saved() {
  try { const value = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(value?.articles) ? value : null; } catch { return null; }
}
function merge(articles = []) {
  return [...new Map([...articles, ...getPublishedNews()].filter(item => item?.id && item.sourceUrl && Number.isFinite(Date.parse(item.publishedAt)) && Date.parse(item.publishedAt) <= Date.now()).map(item => [item.sourceUrl, item])).values()].sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
}
export function useNews() {
  const [articles, setArticles] = useState(() => merge(saved()?.articles));
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    const cache = saved();
    if (!pending) pending = (cache && Date.now() - Date.parse(cache.fetchedAt) < 900000 ? Promise.resolve(cache) : fetch('/api/news', { signal: AbortSignal.timeout(15000) }).then(async response => {
      if (!response.ok) throw new Error('News unavailable');
      const data = await response.json();
      if (!Array.isArray(data.articles)) throw new Error('Invalid news');
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* Optional cache. */ }
      return data;
    })).finally(() => { pending = null; });
    pending.then(data => { if (active) setArticles(merge(data.articles)); }).catch(() => { if (active) setUnavailable(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { articles, loading, unavailable };
}
