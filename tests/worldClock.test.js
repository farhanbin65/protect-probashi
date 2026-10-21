import test from 'node:test';
import assert from 'node:assert/strict';
import { compareWithDhaka, cleanZones } from '../src/utils/worldClock.js';

test('London comparison follows daylight saving', () => {
  assert.equal(compareWithDhaka(new Date('2026-01-15T12:00:00Z'), 'Europe/London').hours, -6);
  assert.equal(compareWithDhaka(new Date('2026-07-15T12:00:00Z'), 'Europe/London').hours, -5);
});
test('fractional offsets and date boundaries are accurate', () => {
  assert.equal(compareWithDhaka(new Date('2026-01-15T12:00:00Z'), 'Asia/Kathmandu').hours, -0.25);
  assert.equal(compareWithDhaka(new Date('2026-01-15T12:00:00Z'), 'Asia/Kolkata').hours, -0.5);
  assert.equal(compareWithDhaka(new Date('2026-01-15T20:00:00Z'), 'America/New_York').days, -1);
  assert.equal(compareWithDhaka(new Date('2026-01-15T15:00:00Z'), 'Pacific/Auckland').days, 1);
});
test('saved clocks reject invalid zones, duplicates and pinned Dhaka', () => {
  assert.deepEqual(cleanZones(['Asia/Dhaka', 'Europe/London', 'Europe/London', null, 'Not/AZone']), ['Europe/London']);
  assert.deepEqual(cleanZones({}), []);
});
