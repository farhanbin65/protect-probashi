import { Link } from 'react-router-dom';
import { ArrowUpRight, Landmark } from 'lucide-react';
import { useT } from '../hooks/useT';
import { directoryStats as stats } from '../utils/directoryStats';
import './directory-stats.css';

export default function DirectoryStats() {
  const t = useT();
  const bn = t.lang === 'bn';
  const say = (en, bangla) => bn ? bangla : en;
  const number = value => value.toLocaleString(bn ? 'bn-BD' : 'en-GB');
  const items = [
    ['offices', say('Bangladesh offices listed', 'বাংলাদেশের মিশন তালিকাভুক্ত')],
    ['countries', say('Countries represented', 'দেশের তথ্য সংগ্রহ করা হয়েছে')],
    ['phones', say('Offices with phone numbers', 'মিশনের ফোন নম্বর রয়েছে')],
    ['emails', say('Offices with email addresses', 'মিশনের ইমেইল রয়েছে')],
  ];
  return <section className="directory-stats" aria-labelledby="directory-stats-heading">
    <div className="directory-stats-heading"><div><span className="directory-stats-eyebrow"><Landmark size={15} aria-hidden="true" />{say('Our growing directory', 'আমাদের তথ্যভান্ডার')}</span><h2 id="directory-stats-heading">{say('Information gathered to help you', 'আপনার সহায়তায় সংগৃহীত তথ্য')}</h2></div><Link to="/embassy">{say('Explore directory', 'তালিকা দেখুন')}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    <dl className="directory-stats-grid">{items.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{number(stats[key])}</dd></div>)}</dl>
    <div className="directory-stats-extra"><span><strong>{number(stats.addresses)}</strong> {say('offices with addresses', 'মিশনের ঠিকানা রয়েছে')}</span><span><strong>{number(stats.officers)}</strong> {say('staff profiles listed', 'কর্মকর্তার পরিচিতি রয়েছে')}</span></div>
    <p className="directory-stats-note">{say('These totals describe our directory coverage. Some contacts are still awaiting verification, including labelled individual-contact fallbacks.', 'এই সংখ্যা আমাদের তালিকার তথ্যের পরিমাণ বোঝায়। চিহ্নিত ব্যক্তিগত যোগাযোগসহ কিছু তথ্য এখনও যাচাইয়ের অপেক্ষায় রয়েছে।')}</p>
  </section>;
}
