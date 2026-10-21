import { normalizeProviderRates } from '../src/utils/exchangeRates.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const key = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!key) return res.status(503).json({ error: 'Fallback provider is not configured' });
  try {
    const url = new URL('https://openexchangerates.org/api/latest.json');
    url.searchParams.set('app_id', key);
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Provider unavailable');
    const raw = await response.json();
    normalizeProviderRates(raw, 'openexchangerates');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
    // Return only public exchange data, never upstream errors or credentials.
    return res.status(200).json({ base: raw.base, timestamp: raw.timestamp, rates: raw.rates });
  } catch {
    return res.status(502).json({ error: 'Fallback exchange rates unavailable' });
  }
}
