export async function locateCountry(countries, geolocation, fetchAddress = fetch) {
  if (!geolocation) throw new Error("locationUnsupported");
  const position = await new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, (failure) => {
      reject(new Error(failure.code === 1 ? "locationDenied" : failure.code === 3 ? "locationTimeout" : "locationError"));
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  });
  const params = new URLSearchParams({
    format: "jsonv2", lat: String(position.coords.latitude), lon: String(position.coords.longitude),
    zoom: "10", "accept-language": "en", addressdetails: "1"
  });
  let result;
  try {
    const response = await fetchAddress(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal: AbortSignal.timeout(10000), headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("Geocoding failed");
    result = await response.json();
  } catch {
    throw new Error("locationError");
  }
  const country = countries.find((item) => item.code === String(result.address?.country_code || "").toUpperCase());
  if (!country) throw new Error("locationCountryUnavailable");
  const names = [result.address?.city, result.address?.town, result.address?.municipality, result.address?.suburb]
    .filter(Boolean).map((name) => name.toLowerCase());
  const city = country.cities.find((item) => names.includes(item.name.en.toLowerCase()));
  return { countryCode: country.code, cityId: city?.id || null };
}
