import { useEffect, useRef, useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { useT } from '../hooks/useT';
import zones from '../data/timezones.json';
import { DHAKA, cleanZones, compareWithDhaka, validZone } from '../utils/worldClock';

const KEY = 'pp-world-clocks';
const catalog = zones.filter(item => validZone(item.zone));
function initialZones() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null) return cleanZones(JSON.parse(saved));
  } catch { /* Local storage is optional. */ }
  return cleanZones([Intl.DateTimeFormat().resolvedOptions().timeZone]);
}
export default function WorldClock() {
  const t = useT();
  const [selected, setSelected] = useState(initialZones);
  const [now, setNow] = useState(() => new Date());
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef(null);
  const addButton = useRef(null);
  const bn = t.lang === 'bn';
  const locale = bn ? 'bn-BD' : 'en-GB';
  const regions = new Intl.DisplayNames([locale], { type: 'region' });
  const enRegions = new Intl.DisplayNames(['en'], { type: 'region' });
  const number = value => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  useEffect(() => {
    const update = () => setNow(new Date());
    const interval = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', update); };
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(selected)); } catch { /* Optional. */ } }, [selected]);
  useEffect(() => { if (adding) input.current?.focus(); }, [adding]);
  const close = () => { setAdding(false); setQuery(''); addButton.current?.focus(); };
  const results = catalog.filter(item => item.zone !== DHAKA && !selected.includes(item.zone) &&
    [item.city, item.zone, regions.of(item.country), enRegions.of(item.country), item.country]
      .join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className="world-clock section-spacing" aria-labelledby="world-clock-title">
    <div className="world-clock-heading"><div><p>{bn ? 'বাড়ির সময়ের সাথে মিলিয়ে নিন' : 'Stay in time with home'}</p><h2 id="world-clock-title">{bn ? 'বিশ্ব ঘড়ি' : 'World Clock'}</h2></div>
      <button ref={addButton} type="button" aria-label={bn ? 'শহর যোগ করুন' : 'Add a city'} aria-expanded={adding} aria-controls="clock-picker" disabled={selected.length >= 12} onClick={() => adding ? close() : setAdding(true)}><Plus aria-hidden="true" /></button>
    </div>
    {adding && <div id="clock-picker" className="clock-picker" onKeyDown={event => { if (event.key === 'Escape') close(); }}>
      <label htmlFor="clock-search"><Search size={18} aria-hidden="true" />{bn ? 'শহর বা দেশ খুঁজুন' : 'Search city or country'}</label>
      <input ref={input} id="clock-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={bn ? 'যেমন London, সৌদি আরব' : 'e.g. London, Saudi Arabia'} />
      <p className="clock-picker-note">{bn ? 'একাধিক সময় অঞ্চল থাকলে আপনার শহর বেছে নিন।' : 'Choose your city when a country has multiple time zones.'}</p>
      <div className="clock-results">{results.slice(0, 60).map(item => <button type="button" key={item.zone} onClick={() => { setSelected(previous => cleanZones([...previous, item.zone])); close(); }}><span>{item.city}</span><small>{regions.of(item.country)}</small></button>)}
        {results.length === 0 && <p role="status">{bn ? 'কোনো ফলাফল নেই' : 'No matching cities'}</p>}</div>
      <button className="clock-cancel" type="button" onClick={close}>{bn ? 'বন্ধ করুন' : 'Close'}</button>
    </div>}
    {[DHAKA, ...selected].map(zone => {
      const item = catalog.find(entry => entry.zone === zone);
      const city = zone === DHAKA ? (bn ? 'ঢাকা' : 'Dhaka') : item?.city || zone.split('/').at(-1).replaceAll('_', ' ');
      const { hours, days } = compareWithDhaka(now, zone);
      const difference = hours === 0 ? (bn ? 'ঢাকার সমান সময়' : 'Same time as Dhaka') : bn ? `ঢাকা থেকে ${number(Math.abs(hours))} ঘণ্টা ${hours > 0 ? 'এগিয়ে' : 'পিছিয়ে'}` : `${number(Math.abs(hours))}h ${hours > 0 ? 'ahead of' : 'behind'} Dhaka`;
      const day = days > 0 ? (bn ? 'আগামীকাল' : 'Tomorrow') : days < 0 ? (bn ? 'গতকাল' : 'Yesterday') : (bn ? 'আজ' : 'Today');
      return <div className="clock-row" key={zone}>
        <div className="clock-city"><p>{zone === DHAKA ? (bn ? 'বাংলাদেশ · বাড়ির সময়' : 'Bangladesh · Home') : `${day} · ${difference}`}</p><h3>{city}</h3><small>{new Intl.DateTimeFormat(locale, { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short' }).format(now)}</small></div>
        <time dateTime={now.toISOString()} aria-label={`${city}: ${new Intl.DateTimeFormat(locale, { timeZone: zone, timeStyle: 'short' }).format(now)}`}>{new Intl.DateTimeFormat(locale, { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)}</time>
        {zone !== DHAKA && <button type="button" className="clock-remove" aria-label={bn ? `${city} সরান` : `Remove ${city}`} onClick={() => setSelected(previous => previous.filter(value => value !== zone))}><X size={17} aria-hidden="true" /></button>}
      </div>;
    })}
    <p className="clock-footnote">{bn ? '২৪ ঘণ্টার সময় · সময়ের পার্থক্য ঢাকার তুলনায়' : '24-hour time · Differences relative to Dhaka'}</p>
  </section>;
}
