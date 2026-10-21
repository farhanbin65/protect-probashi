import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/exchange-rates.js';

test('fallback endpoint handles absent credentials without exposing secrets', async () => {
  const old = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  delete process.env.OPEN_EXCHANGE_RATES_APP_ID;
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; }, setHeader() {} };
  try {
    await handler({ method: 'GET' }, res);
    assert.equal(res.code, 503);
    assert.deepEqual(res.body, { error: 'Fallback provider is not configured' });
  } finally {
    if (old === undefined) delete process.env.OPEN_EXCHANGE_RATES_APP_ID;
    else process.env.OPEN_EXCHANGE_RATES_APP_ID = old;
  }
});
