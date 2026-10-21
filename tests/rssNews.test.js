import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArticle } from '../api/news.js';
const feed = { name: 'Publisher', host: 'example.com' };
const now = Date.parse('2026-10-21T12:00:00Z');
const item = { title: 'Original headline', link: 'https://example.com/news/1', isoDate: '2026-10-21T10:00:00Z', contentSnippet: 'Feed excerpt', 'media:content': { $: { url: 'https://example.com/image.jpg' } } };
test('RSS preserves title, feed text, image, source and time with stable IDs', () => {
 const article = normalizeArticle(item, feed, now);
 assert.equal(article.title, item.title);
 assert.equal(article.summary, item.contentSnippet);
 assert.equal(article.sourceUrl, item.link);
 assert.equal(article.publishedAt, '2026-10-21T10:00:00.000Z');
 assert.equal(article.imageUrl, 'https://example.com/image.jpg');
 assert.equal(article.id, normalizeArticle(item, feed, now).id);
});
test('RSS rejects old, future, external and unsafe links', () => {
 for (const change of [{isoDate:'2022-01-01'}, {isoDate:'2030-01-01'}, {link:'javascript:alert(1)'}, {link:'https://other.com/'}]) assert.equal(normalizeArticle({...item,...change},feed,now),null);
});
