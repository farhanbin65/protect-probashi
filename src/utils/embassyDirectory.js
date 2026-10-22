import missionsData from '../data/bd_missions.json' with { type: 'json' };
import details from '../data/mission_details.json' with { type: 'json' };
import embassies from '../data/embassies.json' with { type: 'json' };
import countries from './directoryCountries.js';
import { mergeMissions } from './missions.js';

const embassyDirectory = mergeMissions(embassies, missionsData, countries).map((mission) => {
  const extra = details.find((item) => item.id === mission.id);
  if (!extra) return mission;
  // Reviewed additions fill gaps; curated contact values always win.
  return { ...extra, ...Object.fromEntries(Object.entries(mission).filter(([, value]) => value != null && value !== "")), officers: extra.officers || mission.officers || [] };
});

export default embassyDirectory;
