import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";
import { useT } from "../hooks/useT";
import { loadExchangeRates, toBDT } from "../utils/exchangeRates";

export default function CurrencyRates() {
  const t = useT();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [currency, setCurrency] = useState("SAR");
  const [amount, setAmount] = useState("1");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    loadExchangeRates().then((value) => { if (active) setResult(value); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const locale = t.lang === "bn" ? "bn-BD" : "en-GB";
  const names = new Intl.DisplayNames([locale], { type: "currency" });
  const format = (value) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const rates = result?.data.rates;
  const converted = amount.trim() === "" ? null : toBDT(Number(amount), rates?.[currency]);
  return (
    <section className="panel currency-panel section-spacing" aria-labelledby="currency-heading">
      <div className="dashboard-section-heading">
        <Banknote size={24} aria-hidden="true" />
        <h2 id="currency-heading">{t("currencyHeading")}</h2>
      </div>
      {loading && <p role="status">{t("loading")}</p>}
      {error && <p role="status">{t("currencyError")}</p>}
      {(error || result?.stale) && <button type="button" className="filter-button" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>{t("currencyRetry")}</button>}
      {rates && <>
        {result.stale && <p className="notice" role="status">{t("currencyStale")}</p>}
        <div className="currency-controls">
          <label>{t("currencyAmount")}<input type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>{t("currencyChoose")}<select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {Object.keys(rates).sort().map((code) => <option key={code} value={code}>{code} — {names.of(code)}</option>)}
          </select></label>
          <output aria-live="polite">{converted === null || !Number.isFinite(converted) ? "—" : `৳ ${format(converted)}`} <small>BDT</small></output>
        </div>
        <p className="metadata">{t("currencyUpdated")}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(result.data.time_last_update_unix * 1000))} ({t("currencyDhaka")})</p>
      </>}
      <p className="metadata">{t("currencyNote")}</p>
      <a className="text-link metadata" href={result?.data.provider === "openexchangerates" ? "https://openexchangerates.org" : "https://www.exchangerate-api.com"} target="_blank" rel="noopener noreferrer">{result?.data.provider === "openexchangerates" ? "Rates by Open Exchange Rates" : "Rates by ExchangeRate-API"}</a>
    </section>
  );
}
