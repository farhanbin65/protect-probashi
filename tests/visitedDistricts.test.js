import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/bangladesh-districts.json' with { type: 'json' };
import { sanitizeVisited, matchesDistrict } from '../src/utils/visitedDistricts.js';

test('all 64 districts have unique IDs, bilingual names, division membership and map geometry', () => {
  assert.equal(data.districts.length, 64);
  assert.equal(new Set(data.districts.map(d => d.id)).size, 64);
  assert.equal(data.divisions.length, 8);
  assert.deepEqual(data.divisions.map(v => data.districts.filter(d => d.division_id === v.id).length), [6, 11, 13, 10, 8, 8, 4, 4]);
  for (const d of data.districts) {
    assert.ok(d.name && /[\u0980-\u09ff]/.test(d.bn_name));
    assert.match(d.path, /^M/);
    assert.ok(d.center.every(Number.isFinite));
  }
});
test('saved visits discard unknown IDs, duplicates and corrupt shapes', () => {
  assert.deepEqual(sanitizeVisited(['1', '1', null, '999', 2, '64']), ['1', '64']);
  assert.deepEqual(sanitizeVisited({ id: '1' }), []);
});
test('search finds English, Bangla, legacy names and punctuation variants', () => {
  const find = query => data.districts.filter(d => matchesDistrict(d, query)).map(d => d.name);
  assert.deepEqual(find(' ঢাকা '), ['Dhaka']);
  assert.deepEqual(find('chittagong'), ['Chattogram']);
  assert.deepEqual(find('cox’s bazar'), ["Cox's Bazar"]);
  assert.deepEqual(find('চাঁপাইনবাবগঞ্জ'), ['Chapai Nawabganj']);
  assert.deepEqual(find('Jessore'), ['Jashore']);
  assert.deepEqual(find('unknown'), []);
});
