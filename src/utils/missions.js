import { countryCodeForName } from "./directoryCountries.js";

const slug = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Match offices by country, city and role: the OIC mission and Jeddah
// consulate are separate offices even though they share a city.
const identity = (mission) => `${mission.countryCode}:${mission.city}:${mission.type}`;

export function mergeMissions(verified, imported, countries) {
  const supported = countries;
  const supportedCodes = new Set(countries.map((country) => country.code));
  const merged = verified.filter((mission) => supportedCodes.has(mission.countryCode));
  const seen = new Set(merged.map(identity));
  const ids = new Set(merged.map((mission) => mission.id));

  for (const record of imported) {
    const countryName = record.country?.trim().toLowerCase();
    const country = supported.find((item) =>
      item.code === countryCodeForName(record.country) ||
      [item.code, item.name.en, item.name.bn].some((name) => name.toLowerCase() === countryName)
    );
    if (!country || typeof record.name !== "string" || !record.name.trim() || !record.city?.trim()) continue;

    const city = country.cities.find((item) =>
      [item.id, item.name.en, item.name.bn].some((name) => slug(name) === slug(record.city))
    );
    const cityId = city?.id || slug(record.city);
    const type = /permanent mission/i.test(record.name)
      ? "permanentMission"
      : /consulate/i.test(record.name) ? "consulate"
      : /high commission/i.test(record.name) ? "highCommission" : "embassy";
    const labels = {
      embassy: "বাংলাদেশ দূতাবাস",
      highCommission: "বাংলাদেশ হাইকমিশন",
      consulate: "বাংলাদেশ কনস্যুলেট জেনারেল",
      permanentMission: /\bOIC\b/i.test(record.name)
        ? "ইসলামি সহযোগিতা সংস্থায় (ওআইসি) বাংলাদেশের স্থায়ী মিশন"
        : "বাংলাদেশের স্থায়ী মিশন"
    };
    const mission = {
      id: `bd-${country.code.toLowerCase()}-${cityId}-${type}`,
      countryCode: country.code,
      type,
      name: { en: record.name.trim(), bn: `${labels[type]}, ${city?.name.bn || record.city.trim()}` },
      city: cityId,
      phone: record.phone || null,
      phoneNote: null,
      hotline: record.hotline || null,
      email: record.email || null,
      address: record.address || "",
      website: record.website || null,
      sourceUrl: record.sourceUrl || record.source || null,
      // A directory listing alone does not verify its contact details.
      lastVerified: record.verified === true ? record.lastVerified || null : null
    };
    if (seen.has(identity(mission)) || ids.has(mission.id)) continue;
    seen.add(identity(mission));
    ids.add(mission.id);
    merged.push(mission);
  }

  return merged;
}
