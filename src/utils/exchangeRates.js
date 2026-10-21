const CACHE_KEY = "pp-exchange-rates";
export const RATES_URL = "https://api.exchangerate-api.com/v4/latest/USD";

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

export function normalizeProviderRates(data, provider) {
  const updated = provider === "openexchangerates" ? data?.timestamp : data?.time_last_updated;
  if (data?.base !== "USD" || data?.rates?.USD !== 1 ||
      !Number.isFinite(data?.rates?.BDT) || data.rates.BDT <= 0 ||
      !Number.isFinite(updated) || updated <= 0 || updated > Date.now() / 1000 + 300) {
    throw new Error("Invalid exchange-rate response");
  }
  const rates = Object.fromEntries(Object.entries(data.rates)
    .filter(([code, rate]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0)
    .map(([code, rate]) => [code, rate / data.rates.BDT]));
  return normalizeRates({ result: "success", base_code: "BDT", rates, provider,
    time_last_update_unix: updated,
    time_next_update_unix: updated + 86400 });
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
    let lastError;
    let staleData = cached;
    for (const [url, provider] of [[RATES_URL, "exchangerate-api"], ["/api/exchange-rates", "openexchangerates"]]) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error("Exchange rates unavailable");
        const data = normalizeProviderRates(await response.json(), provider);
        if (data.time_next_update_unix <= Date.now() / 1000) {
          if (!staleData || data.time_last_update_unix > staleData.time_last_update_unix) staleData = data;
          continue;
        }
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* Storage is optional. */ }
        return { data, stale: false };
      } catch (error) { lastError = error; }
    }
    if (staleData) return { data: staleData, stale: true };
    throw lastError || new Error("Exchange rates unavailable");
  })().finally(() => { pending = null; });
  return pending;
}
