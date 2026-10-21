import Parser from 'rss-parser';
import { createHash } from 'node:crypto';
const feeds = [
  { name: 'Prothom Alo', url: 'https://www.prothomalo.com/feed', host: 'www.prothomalo.com' },
  { name: 'Prothom Alo English', url: 'https://en.prothomalo.com/feed', host: 'en.prothomalo.com' }
];
const parser = new Parser({ customFields: { item: ['media:content', 'media:thumbnail'] } });
const https = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : null; } catch { return null; } };
const plain = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim() : '';
export function normalizeArticle(item, feed, now = Date.now()) {
  const sourceUrl = https(item.link);
  const published = Date.parse(item.isoDate || item.pubDate);
  const title = plain(item.title) || plain(item.title?.a?.[0]?._);
  if (!title || !sourceUrl || new URL(sourceUrl).hostname !== feed.host || !Number.isFinite(published) || published > now || published < now - 7 * 86400000) return null;
  const media = item['media:content'] || item['media:thumbnail'];
  const image = media?.$?.url || media?.[0]?.$?.url || (item.enclosure?.type?.startsWith('image/') ? item.enclosure.url : null);
  const summary = plain(item.contentSnippet || item.content || '').slice(0, 1200);
  return { id: 'rss-' + createHash('sha256').update(sourceUrl).digest('hex').slice(0, 20), title, summary,
    imageUrl: https(image), imageAlt: title, imageCredit: feed.name, sourceName: feed.name, sourceUrl,
    publishedAt: new Date(published).toISOString(), countryCodes: [], status: 'published', rss: true };
}
let cached;
export async function getNews() {
  if (cached && Date.now() - cached.fetched < 900000) return cached.data;
  const results = await Promise.allSettled(feeds.map(async feed => {
    const response = await fetch(feed.url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Feed unavailable');
    const xml = await response.text();
    if (xml.length > 4000000) throw new Error('Feed too large');
    const parsed = await parser.parseString(xml);
    return parsed.items.map(item => normalizeArticle(item, feed)).filter(Boolean);
  }));
  const articles = [...new Map(results.flatMap(result => result.status === 'fulfilled' ? result.value : []).map(item => [item.sourceUrl, item])).values()]
    .sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,60);
  if (!articles.length) throw new Error('No current news available');
  const data = { articles, fetchedAt: new Date().toISOString() };
  cached = { fetched: Date.now(), data };
  return data;
}
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const data = await getNews();
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json(data);
  } catch { return res.status(503).json({ error: 'News feeds temporarily unavailable' }); }
}
