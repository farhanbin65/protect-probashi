export const DHAKA = 'Asia/Dhaka';
export function wallTime(date, zone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(part => [part.type, part.value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
}
export function compareWithDhaka(date, zone) {
  const local = wallTime(date, zone);
  const dhaka = wallTime(date, DHAKA);
  return { hours: (local - dhaka) / 3600000,
    days: Math.floor(local / 86400000) - Math.floor(dhaka / 86400000) };
}
export function validZone(zone) {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); return typeof zone === 'string'; }
  catch { return false; }
}
export function cleanZones(value) {
  return Array.isArray(value) ? [...new Set(value.filter(zone => zone !== DHAKA && validZone(zone)))].slice(0, 12) : [];
}
