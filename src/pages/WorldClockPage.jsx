import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Weather from '../components/Weather';
import WorldClock from '../components/WorldClock';
import { useT } from '../hooks/useT';

export default function WorldClockPage() {
  const t = useT();
  return <div className="page world-clock-page">
    <Link className="text-link" to="/"><ArrowLeft size={18} aria-hidden="true" />{t('home')}</Link>
    <h1>{t('worldClock')}</h1>
    <WorldClock />
    <Weather />
  </div>;
}
