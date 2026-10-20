import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const news = JSON.parse(readFileSync(new URL('../src/data/news.json', import.meta.url)));

test('curated reports have bilingual summaries, publisher references, and credited images', () => {
  assert.equal(news.length, 3);
  assert.equal(new Set(news.map((item) => item.id)).size, news.length);
  for (const item of news) {
    assert.equal(item.status, 'published');
    assert.ok(!item.id.startsWith('sample-'));
    assert.ok(item.title.bn && item.title.en && item.summary.bn && item.summary.en);
    assert.ok(['www.thedailystar.net', 'www.tbsnews.net'].includes(new URL(item.sourceUrl).hostname));
    assert.equal(new URL(item.imageUrl).protocol, 'https:');
    assert.ok(item.imageCredit && item.imageAlt.bn && item.imageAlt.en);
    assert.match(item.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.publishedAt <= item.curatedAt);
  }
  assert.ok(news.some((item) => item.countryCodes.includes('SA')));
  assert.ok(news.some((item) => item.countryCodes.length === 0));
});
