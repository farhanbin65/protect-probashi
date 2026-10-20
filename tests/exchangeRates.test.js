import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRates, toBDT, loadExchangeRates } from '../src/utils/exchangeRates.js';
const payload = { result: 'success', base_code: 'BDT', time_last_update_unix: 1, time_next_update_unix: 2, rates: { BDT: 1, USD: 0.008, SAR: 0.03 } };
test('BDT-base rates are inverted and invalid inputs rejected', () => {
  assert.equal(toBDT(10, 0.008), 1250);
  assert.equal(toBDT(-1, 0.008), null);
  assert.equal(toBDT(1, 0), null);
  assert.equal(toBDT(NaN, 1), null);
  assert.throws(() => normalizeRates({ ...payload, base_code: 'USD' }));
  assert.throws(() => normalizeRates({ result: 'error' }));
  assert.equal(normalizeRates({ ...payload, rates: { ...payload.rates, BAD: -1 } }).rates.BAD, undefined);
});
test('offline cached rates are clearly marked stale; fresh cache avoids network', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let cached = payload;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify(cached), setItem() {} } });
  globalThis.fetch = async () => { throw new Error('Offline'); };
  try {
    assert.equal((await loadExchangeRates()).stale, true);
    cached = { ...payload, time_last_update_unix: Date.now()/1000 - 60, time_next_update_unix: Date.now()/1000 + 3600 };
    assert.equal((await loadExchangeRates()).stale, false);
    cached = null;
    await assert.rejects(loadExchangeRates(), /Offline/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  }
});
