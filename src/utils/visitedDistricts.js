import data from '../data/bangladesh-districts.json' with { type: 'json' };
export const STORAGE_KEY = 'pp-visited-bangladesh-v1';
const validIds = new Set(data.districts.map(d => d.id));
export function sanitizeVisited(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && validIds.has(id)))] : [];
}
const aliases = { Chattogram: 'Chittagong', Cumilla: 'Comilla', Jashore: 'Jessore', Bogura: 'Bogra', Barishal: 'Barisal', 'Chapai Nawabganj': 'Chapainawabganj', Netrokona: 'Netrakona', Moulvibazar: 'Maulvibazar', Sirajganj: 'Sirajgonj', Khagrachhari: 'Khagrachari' };
export function matchesDistrict(district, query) {
  const normalize = value => value.normalize('NFC').toLocaleLowerCase().replace(/[\s’'’-]/g, '');
  return normalize(`${district.name} ${district.bn_name} ${aliases[district.name] || ''}`).includes(normalize(query.trim()));
}
