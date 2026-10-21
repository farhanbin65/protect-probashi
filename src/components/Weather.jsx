import { useEffect, useState } from 'react';
import { CloudSun, Search } from 'lucide-react';
import { useT } from '../hooks/useT';

const DHAKA = { name: 'Dhaka', country: 'Bangladesh', latitude: 23.7104, longitude: 90.4074 };
export default function Weather() {
  const t = useT();
  const bn = t.lang === 'bn';
  const [city, setCity] = useState(DHAKA);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const number = value => Number.isFinite(value) ? new Intl.NumberFormat(bn ? 'bn-BD' : 'en-GB', { maximumFractionDigits: 0 }).format(value) : '—';
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setData(null); setError(false);
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude: city.latitude, longitude: city.longitude, current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m', daily: 'temperature_2m_max,temperature_2m_min', forecast_days: '3', timezone: 'auto' });
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetch(url, { signal: controller.signal }).then(async res => {
      if (!res.ok) throw new Error();
      const value = await res.json();
      if (!Number.isFinite(value.current?.temperature_2m)) throw new Error();
      if (active) setData(value);
    }).catch(() => { if (active) setError(true); }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [city, retry]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResults([]); setSearchStatus('');
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setSearchStatus('loading');
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
        url.search = new URLSearchParams({ name: query.trim(), count: '5', language: t.lang });
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error();
        const value = await res.json();
        if (active) { setResults(value.results || []); setSearchStatus(value.results?.length ? '' : 'empty'); }
      } catch { if (active) setSearchStatus('error'); }
      finally { clearTimeout(timeout); }
    }, 400);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query, t.lang]);
  return <section className="panel weather-panel section-spacing" aria-labelledby="weather-heading">
    <h2 id="weather-heading"><CloudSun size={24} aria-hidden="true" /> {bn ? 'আবহাওয়া' : 'Weather'}</h2>
    <label htmlFor="weather-search">{bn ? 'শহর খুঁজুন' : 'Search a city'}</label>
    <div className="weather-search"><Search size={18} aria-hidden="true" /><input id="weather-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={bn ? 'যেমন ঢাকা বা London' : 'e.g. Dhaka or London'} /></div>
    {searchStatus && <p role="status">{searchStatus === 'loading' ? t('loading') : searchStatus === 'empty' ? t('noneFound') : (bn ? 'খোঁজা যায়নি। আবার চেষ্টা করুন।' : 'Search unavailable. Please try again.')}</p>}
    <div className="weather-results">{results.map(item => <button type="button" key={item.id} onClick={() => { setCity(item); setQuery(''); setResults([]); }}>{[item.name, item.admin1, item.country].filter(Boolean).join(', ')}</button>)}</div>
    <h3>{city === DHAKA && bn ? 'ঢাকা, বাংলাদেশ' : [city.name, city.country].filter(Boolean).join(', ')}</h3>
    {!data && !error && <p role="status">{t('loading')}</p>}
    {error && <div role="status"><p>{bn ? 'আবহাওয়া পাওয়া যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।' : 'Weather unavailable. Check your internet connection.'}</p><button className="filter-button" type="button" onClick={() => setRetry(x => x + 1)}>{bn ? 'আবার চেষ্টা করুন' : 'Retry'}</button></div>}
    {data && <>
      <div className="weather-temperature">{number(data.current.temperature_2m)}°C</div>
      <p>{bn ? 'অনুভূত তাপমাত্রা' : 'Feels like'} {number(data.current.apparent_temperature)}°C · {bn ? 'আর্দ্রতা' : 'Humidity'} {number(data.current.relative_humidity_2m)}%</p>
      <p>{bn ? 'বাতাস' : 'Wind'} {number(data.current.wind_speed_10m)} {bn ? 'কিমি/ঘণ্টা' : 'km/h'}</p>
      <div className="weather-forecast">{data.daily?.time?.map((day, i) => <div key={day}><strong>{new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB', { weekday: 'short', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'))}</strong><span>{bn ? 'সর্বোচ্চ' : 'High'} {number(data.daily.temperature_2m_max[i])}°</span><span>{bn ? 'সর্বনিম্ন' : 'Low'} {number(data.daily.temperature_2m_min[i])}°</span></div>)}</div>
      <p className="metadata">{bn ? 'স্থানীয় সময়' : 'Local time'}: {data.current.time.replace('T', ' ')} ({data.timezone})</p>
    </>}
    <a className="text-link metadata" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather: Open-Meteo · Locations: GeoNames</a>
  </section>;
}
