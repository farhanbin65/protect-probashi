import { useEffect, useRef, useState } from 'react';
import { MapPin, Download, Search, Camera } from 'lucide-react';
import { useT } from '../hooks/useT';
import data from '../data/bangladesh-districts.json' with { type: 'json' };
import { STORAGE_KEY, sanitizeVisited, matchesDistrict } from '../utils/visitedDistricts';
import './places.css';

const PROFILE_KEY = 'pp-bangladesh-profile-v1';
const themes = [
  { id: 'forest', en: 'Forest', bn: 'বন', bg: '#f6f3eb', ink: '#173d31', accent: '#147d5b', muted: '#d6e4da' },
  { id: 'midnight', en: 'Midnight', bn: 'মধ্যরাত', bg: '#1c1b38', ink: '#f3f0ff', accent: '#8d9aff', muted: '#444363' },
  { id: 'sunset', en: 'Sunset', bn: 'সূর্যাস্ত', bg: '#fff5ed', ink: '#542b30', accent: '#d94b58', muted: '#efd8ce' },
  { id: 'ocean', en: 'Ocean', bn: 'সমুদ্র', bg: '#eef6ff', ink: '#183955', accent: '#1568c4', muted: '#cddfed' },
  { id: 'emerald', en: 'Emerald', bn: 'পান্না', bg: '#151b1a', ink: '#edf9f3', accent: '#32c58a', muted: '#354b43' },
];
function readProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
    return { theme: themes.some(t => t.id === p.theme) ? p.theme : 'forest', name: typeof p.name === 'string' ? p.name.slice(0, 60) : '', names: p.names === true,
      photo: typeof p.photo === 'string' && p.photo.length < 350000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.photo) ? p.photo : '' };
  } catch { return { theme: 'forest', name: '', names: false, photo: '' }; }
}

export default function Places() {
  const t = useT();
  const bn = t.lang === 'bn';
  const say = (en, bangla) => bn ? bangla : en;
  const num = n => n.toLocaleString(bn ? 'bn-BD' : 'en-GB');
  const [visited, setVisited] = useState(() => {
    try { return sanitizeVisited(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return []; }
  });
  const [profile, setProfile] = useState(readProfile);
  const theme = themes.find(t => t.id === profile.theme);
  const [photoError, setPhotoError] = useState(false);
  const photoRequest = useRef(0);
  const [query, setQuery] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const mapRef = useRef(null);
  const selected = new Set(visited);
  const percent = Math.round(visited.length / 64 * 100);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visited)); localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); setStorageError(false); }
    catch {
      setStorageError(true);
      // A full photo store must not prevent small preferences from being saved.
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, photo: '' })); localStorage.setItem(STORAGE_KEY, JSON.stringify(visited)); } catch { /* Session state remains usable when storage is unavailable. */ }
    }
  }, [visited, profile]);
  const updateProfile = patch => setProfile(current => ({ ...current, ...patch }));
  async function uploadPhoto(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const request = ++photoRequest.current;
    setPhotoError(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { setPhotoError(true); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d'); const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width-side)/2, (img.height-side)/2, side, side, 0, 0, 256, 256);
      const photo = canvas.toDataURL('image/jpeg', .8);
      if (photo.length > 350000) throw new Error('Photo too large');
      if (request === photoRequest.current) updateProfile({ photo });
    } catch { if (request === photoRequest.current) setPhotoError(true); }
    finally { URL.revokeObjectURL(url); }
  }
  const toggle = id => setVisited(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  async function download() {
    setExporting(true); setExportError(false);
    let url;
    try {
      await document.fonts.ready;
      const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, 1000, 1400);
      ctx.fillStyle = theme.accent; ctx.font = 'bold 28px sans-serif'; ctx.fillText('Protect Probashi', 60, 70);
      ctx.fillStyle = theme.ink; ctx.font = 'bold 36px "Noto Sans Bengali Variable", sans-serif';
      ctx.fillText(say('My Bangladesh travel map', 'আমার বাংলাদেশ ভ্রমণ মানচিত্র'), 60, 135);
      ctx.font = '26px "Noto Sans Bengali Variable", sans-serif';
      ctx.fillText(`${num(visited.length)} / ${num(64)} · ${num(percent)}% ${say('explored', 'ভ্রমণ করা হয়েছে')}`, 60, 185);
      const svg = mapRef.current.cloneNode(true); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('width', '600'); svg.setAttribute('height', '700');
      svg.querySelectorAll('path').forEach(p => { p.removeAttribute('tabindex'); p.removeAttribute('role'); p.setAttribute('fill', selected.has(p.dataset.id) ? theme.accent : theme.muted); p.setAttribute('stroke', '#ffffff'); p.setAttribute('stroke-width', '0.8'); });
      url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image(); await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
      ctx.drawImage(img, 100, 215, 800, 935);
      ctx.fillStyle = theme.muted; ctx.fillRect(60, 1190, 880, 12); ctx.fillStyle = theme.accent; ctx.fillRect(60, 1190, 880 * percent / 100, 12);
      ctx.font = '21px "Noto Sans Bengali Variable", sans-serif'; ctx.fillText(profile.name || 'Protect Probashi', 60, 1265, 880);
      if (profile.photo) {
        const photo = new Image(); await new Promise((resolve, reject) => { photo.onload = resolve; photo.onerror = reject; photo.src = profile.photo; });
        ctx.save(); ctx.beginPath(); ctx.arc(890, 105, 48, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(photo, 842, 57, 96, 96); ctx.restore();
      }
      ctx.fillStyle = theme.ink; ctx.font = '16px sans-serif'; ctx.fillText('Boundaries: geoBoundaries / BBS / OCHA · CC BY 3.0 IGO', 60, 1310);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Image unavailable');
      const output = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = output; a.download = 'protect-probashi-bangladesh.png'; a.click(); setTimeout(() => URL.revokeObjectURL(output), 1000);
    } catch { setExportError(true); }
    finally { if (url) URL.revokeObjectURL(url); setExporting(false); }
  }
  return <div className="page places-page">
    <div className="places-reference"><a href="https://unseenbangladesh.com" target="_blank" rel="noreferrer">{say('Inspired by Unseen Bangladesh', 'Unseen Bangladesh থেকে অনুপ্রাণিত')}</a></div>
    <div className="page-heading"><MapPin size={30} aria-hidden="true" /><h1>{t('placesTitle')}</h1></div>
    <p className="places-intro">{t('placesIntro')}</p>
    <section className="panel places-toolbar" aria-label={say('Customize your map', 'মানচিত্র সাজান')}>
      <div className="places-themes" role="group" aria-label={say('Theme', 'থিম')}><strong>{say('Theme', 'থিম')}</strong>{themes.map(preset => <button key={preset.id} type="button" aria-label={bn ? preset.bn : preset.en} title={bn ? preset.bn : preset.en} aria-pressed={profile.theme === preset.id} onClick={() => updateProfile({ theme: preset.id })} style={{ background: `linear-gradient(135deg, ${preset.bg} 55%, ${preset.accent} 55%)` }} />)}</div>
      <div className="places-profile-controls"><label className="places-photo-input"><span className="places-photo-icon"><Camera size={22} aria-hidden="true" /></span><span>{profile.photo ? say('Change photo', 'ছবি পরিবর্তন করুন') : say('Add your photo', 'আপনার ছবি যোগ করুন')}</span><input aria-label={say('Choose a profile photo', 'প্রোফাইলের ছবি বাছাই করুন')} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} /></label>
      {profile.photo && <button type="button" onClick={() => { photoRequest.current++; updateProfile({ photo: '' }); }}>{say('Remove photo', 'ছবি মুছুন')}</button>}
      <label className="places-name"><span>{say('Your name (optional)', 'আপনার নাম (ঐচ্ছিক)')}</span><input type="text" maxLength={60} value={profile.name} onChange={e => updateProfile({ name: e.target.value })} autoComplete="name" /></label>
      <label className="places-names-toggle"><input type="checkbox" checked={profile.names} onChange={e => updateProfile({ names: e.target.checked })} />{say('District names', 'জেলার নাম')}</label></div>
      {photoError && <p role="alert">{say('Choose a JPG, PNG or WebP photo under 8 MB.', '৮ এমবির কম JPG, PNG বা WebP ছবি বাছাই করুন।')}</p>}
    </section>
    <div className="places-layout">
      <section className="panel places-picker" aria-labelledby="district-heading">
        <div className="places-heading"><h2 id="district-heading">{say("Districts I've visited", 'যেসব জেলায় গিয়েছি')}</h2><strong>{num(visited.length)}/{num(64)}</strong></div>
        <label className="places-search"><Search size={20} aria-hidden="true" /><span className="sr-only">{say('Search districts in English or Bangla', 'ইংরেজি বা বাংলায় জেলা খুঁজুন')}</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={say('Search in English or বাংলা…', 'বাংলা বা English-এ খুঁজুন…')} /></label>
        <div className="places-actions"><button type="button" onClick={() => setVisited(data.districts.map(d => d.id))}>{say('Select all 64', 'সব ৬৪টি বাছাই')}</button><button type="button" onClick={() => setVisited([])} disabled={!visited.length}>{say('Clear all', 'সব মুছুন')}</button></div>
        <div className="places-groups">
          {data.divisions.map(division => {
            const districts = data.districts.filter(d => d.division_id === division.id);
            const visible = districts.filter(d => matchesDistrict(d, query));
            if (!visible.length) return null;
            const all = districts.every(d => selected.has(d.id));
            return <section className="places-division" key={division.id} aria-labelledby={`division-${division.id}`}>
              <div className="places-heading"><h3 id={`division-${division.id}`}><span lang="en">{division.name}</span> · <span lang="bn">{division.bn_name}</span> <small>{num(districts.filter(d => selected.has(d.id)).length)}/{num(districts.length)}</small></h3>
                <button type="button" onClick={() => setVisited(current => all ? current.filter(id => !districts.some(d => d.id === id)) : [...new Set([...current, ...districts.map(d => d.id)])])} aria-label={`${all ? say('Clear division', 'বিভাগ মুছুন') : say('Select division', 'বিভাগ বাছাই')} ${bn ? division.bn_name : division.name}`}>{all ? say('Clear', 'মুছুন') : say('Select all', 'সব বাছাই')}</button></div>
              <div className="district-chips">{visible.map(d => <button className={selected.has(d.id) ? 'is-visited' : ''} type="button" key={d.id} aria-pressed={selected.has(d.id)} onClick={() => toggle(d.id)}><span lang="en">{selected.has(d.id) ? '✓ ' : ''}{d.name}</span><small lang="bn">{d.bn_name}</small></button>)}</div>
            </section>;
          })}
          {!data.districts.some(d => matchesDistrict(d, query)) && <p role="status">{say('No districts found. Try another spelling.', 'কোনো জেলা পাওয়া যায়নি। অন্য বানানে খুঁজুন।')}</p>}
        </div>
      </section>
      <section className="panel places-preview" aria-labelledby="map-heading">
        <div className="places-poster" style={{ '--map-bg': theme.bg, '--map-ink': theme.ink, '--map-accent': theme.accent, '--map-muted': theme.muted }}><span className="places-brand">Protect Probashi · প্রটেক্ট প্রবাসী</span><h2 id="map-heading">{say('My Bangladesh', 'আমার বাংলাদেশ')}</h2>
          <div className="places-person">{profile.photo && <img src={profile.photo} alt={say('Your profile photo', 'আপনার ছবি')} />}{profile.name && <p>{profile.name}</p>}</div>
          <p className="places-count" aria-live="polite">{num(visited.length)}<span> / {num(64)} {say('districts visited', 'জেলা ভ্রমণ')}</span></p>
          <svg ref={mapRef} className="district-map" viewBox="-5 -5 565 790" role="group" aria-label={say('Interactive Bangladesh district map', 'বাংলাদেশের জেলার মানচিত্র')}>
            {data.districts.map(d => <path key={d.id} data-id={d.id} d={d.path} fillRule="evenodd" role="button" tabIndex={0} aria-label={`${d.name} · ${d.bn_name}`} aria-pressed={selected.has(d.id)} className={selected.has(d.id) ? 'is-visited' : ''} onClick={() => toggle(d.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(d.id); } }}><title>{d.name} · {d.bn_name}</title></path>)}
            {profile.names && <g className="district-labels" aria-hidden="true">{data.districts.map(d => <DistrictLabel key={d.id} district={d} bn={bn} />)}</g>}
          </svg>
          <div className="places-progress" role="progressbar" aria-label={say('Bangladesh explored', 'বাংলাদেশ ভ্রমণ')} aria-valuemin={0} aria-valuemax={64} aria-valuenow={visited.length}><span style={{ width: `${percent}%` }} /></div>
          <p>{num(percent)}% {say('of Bangladesh explored', 'বাংলাদেশ ভ্রমণ করা হয়েছে')}</p>
        </div>
        <p className="places-help">{say('Tap a district on the map or choose a chip to mark your visit.', 'মানচিত্রে জেলা চাপুন বা তালিকা থেকে ভ্রমণ করা জেলা বাছাই করুন।')}</p>
        <button type="button" className="places-download" disabled={exporting} onClick={download}><Download size={19} aria-hidden="true" />{exporting ? say('Creating image…', 'ছবি তৈরি হচ্ছে…') : say('Download my map (PNG)', 'আমার মানচিত্র ডাউনলোড (PNG)')}</button>
        <p className="places-help" role="status">{storageError ? say('Storage is unavailable. Some changes could not be saved. They remain available for this session.', 'সংরক্ষণ করা যাচ্ছে না। কিছু পরিবর্তন শুধু এই সেশনেই থাকবে।') : say('Saved on this device. Your travel history stays in your browser.', 'এই ডিভাইসে সংরক্ষিত। ভ্রমণের তথ্য আপনার ব্রাউজারেই থাকে।')}</p>
        {exportError && <p role="alert">{say('Image could not be created. Please try again.', 'ছবি তৈরি করা যায়নি। আবার চেষ্টা করুন।')}</p>}
      </section>
    </div>
  </div>;
}

function DistrictLabel({ district, bn }) {
  const ref = useRef(null);
  const [point, setPoint] = useState(null);
  useEffect(() => {
    const path = ref.current?.ownerSVGElement?.querySelector(`path[data-id="${district.id}"]`);
    if (path) { const box = path.getBBox(); setPoint({ x: box.x + box.width / 2, y: box.y + box.height / 2 }); }
  }, [district.id]);
  return <text ref={ref} x={point?.x} y={point?.y} visibility={point ? 'visible' : 'hidden'} textAnchor="middle" dominantBaseline="middle" fill="#101828" stroke="#fff" strokeWidth="2" paintOrder="stroke" fontSize={bn ? '8' : '8.5'} fontFamily="Noto Sans Bengali Variable, sans-serif">{bn ? district.bn_name : district.name}</text>;
}
