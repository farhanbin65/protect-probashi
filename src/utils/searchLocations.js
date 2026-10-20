export function searchLocations(countries, query) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [];
  const matches = (name) => [name.en, name.bn].some((value) => value?.toLocaleLowerCase().includes(term));
  const results = [];
  for (const country of countries) {
    if (matches(country.name) || country.code.toLowerCase() === term) {
      results.push({ country, city: null });
    }
    for (const city of country.cities) {
      if (matches(city.name)) results.push({ country, city });
    }
  }
  return results.slice(0, 20);
}
