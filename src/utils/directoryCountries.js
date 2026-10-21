import supportedCountries from "../data/countries.json" with { type: "json" };
import missions from "../data/bd_missions.json" with { type: "json" };

import emergencyNumbers from "../data/emergency_numbers.json" with { type: "json" };

const codes = {
  Algeria: "DZ", Australia: "AU", Austria: "AT", Bahrain: "BH", Belgium: "BE",
  Bhutan: "BT", Brazil: "BR", Brunei: "BN", Canada: "CA", China: "CN",
  Denmark: "DK", Egypt: "EG", Ethiopia: "ET", France: "FR", Germany: "DE",
  Greece: "GR", India: "IN", Indonesia: "ID", Iran: "IR", Iraq: "IQ", Italy: "IT",
  Japan: "JP", Jordan: "JO", Kenya: "KE", Korea: "KR", Kuwait: "KW", Lebanon: "LB",
  Libya: "LY", Malaysia: "MY", Mauritius: "MU", Mexico: "MX", Morocco: "MA",
  Myanmar: "MM", Nepal: "NP", Nigeria: "NG", Oman: "OM", Pakistan: "PK",
  Poland: "PL", Portugal: "PT", Qatar: "QA", Turkey: "TR", Romania: "RO",
  Russia: "RU", "Saudi Arabia": "SA", Singapore: "SG", "South Africa": "ZA",
  Spain: "ES", "Sri Lanka": "LK", Sweden: "SE", Switzerland: "CH", Thailand: "TH",
  Maldives: "MV", Netherlands: "NL", Philippines: "PH", UAE: "AE",
  "United Kingdom": "GB", USA: "US", Uzbekistan: "UZ", Vietnam: "VN", "New Zealand": "NZ"
};
export const citySlug = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const regions = new Intl.DisplayNames(["bn"], { type: "region" });
const countries = supportedCountries.map((country) => ({ ...country, cities: [...country.cities] }));
for (const mission of missions) {
  const code = codes[mission.country];
  if (!code) continue;
  let country = countries.find((item) => item.code === code);
  if (!country) {
    country = { code, name: { en: mission.country, bn: regions.of(code) }, emergency: {}, cities: [] };
    countries.push(country);
  }
  const id = citySlug(mission.city);
  if (!country.cities.some((city) => city.id === id)) {
    country.cities.push({ id, name: { en: mission.city, bn: mission.city } });
  }
}
// Emergency coverage can include countries with no embassy record yet.
for (const [code, emergency] of Object.entries(emergencyNumbers)) {
  if (!countries.some((country) => country.code === code) && emergency.name) {
    countries.push({ code, name: emergency.name, emergency: {}, cities: [] });
  }
}
for (const country of countries) {
  const emergency = emergencyNumbers[country.code];
  if (emergency) {
    country.emergency = emergency.numbers;
    country.emergencySourceUrl = emergency.sourceUrl;
    country.emergencyLastVerified = emergency.lastVerified;
    country.emergencyFetchedAt = emergency.fetchedAt;
  }
}
export default countries;
export function countryCodeForName(name) {
  return codes[name] || name?.trim().toUpperCase();
}
