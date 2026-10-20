const CACHE_KEY = "pp-exchange-rates";
export const RATES_URL = "https://open.er-api.com/v6/latest/BDT";

export function normalizeRates(data) {
  if (data?.result !== "success" || data.base_code !== "BDT" ||
      !Number.isFinite(data.time_last_update_unix) || !Number.isFinite(data.time_next_update_unix) ||
      data.rates?.BDT !== 1) throw new Error("Invalid exchange-rate response");
  const rates = Object.fromEntries(Object.entries(data.rates).filter(([code, rate]) =>
    /^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0
  ));
  if (!rates.USD) throw new Error("Missing exchange rates");
  return { ...data, rates };
}

export function toBDT(amount, rate) {
  return Number.isFinite(amount) && amount >= 0 && Number.isFinite(rate) && rate > 0
    ? amount / rate : null;
}

let pending;
export function loadExchangeRates() {
  if (pending) return pending;
  pending = (async () => {
    let cached;
    try {
      cached = normalizeRates(JSON.parse(localStorage.getItem(CACHE_KEY)));
    } catch { /* Missing storage or invalid cache. */ }
    const now = Date.now() / 1000;
    if (cached && cached.time_last_update_unix <= now && cached.time_next_update_unix > now) {
      return { data: cached, stale: false };
    }
    try {
      const response = await fetch(RATES_URL, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Exchange rates unavailable");
      const data = normalizeRates(await response.json());
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* Storage is optional. */ }
      return { data, stale: data.time_next_update_unix <= now };
    } catch (error) {
      if (cached) return { data: cached, stale: true };
      throw error;
    }
  })().finally(() => { pending = null; });
  return pending;
}
