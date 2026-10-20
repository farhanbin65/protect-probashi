import test from "node:test";
import assert from "node:assert/strict";
import countries from "../src/utils/directoryCountries.js";
import { locateCountry } from "../src/utils/location.js";

const gps = { getCurrentPosition(resolve) { resolve({ coords: { latitude: 51.5, longitude: -0.1 } }); } };
const address = (value) => async (url, options) => {
  assert.match(url, /accept-language=en/);
  assert.ok(options.signal);
  return { ok: true, json: async () => ({ address: value }) };
};
test("permission granted in UK resolves country and city", async () => {
  assert.deepEqual(await locateCountry(countries, gps, address({ country_code: "gb", city: "London" })), { countryCode: "GB", cityId: "london" });
});
test("unknown city still selects the detected country", async () => {
  assert.deepEqual(await locateCountry(countries, gps, address({ country_code: "sa", city: "Unknown" })), { countryCode: "SA", cityId: null });
});
test("reports denied permission, GPS timeout, and missing geolocation", async () => {
  for (const [code, message] of [[1, "locationDenied"], [3, "locationTimeout"], [2, "locationError"]]) {
    await assert.rejects(locateCountry(countries, { getCurrentPosition(ok, fail) { fail({ code }); } }), { message });
  }
  await assert.rejects(locateCountry(countries, null), { message: "locationUnsupported" });
});
test("reports unavailable country and reverse lookup failures", async () => {
  await assert.rejects(locateCountry(countries, gps, address({ country_code: "xx" })), { message: "locationCountryUnavailable" });
  await assert.rejects(locateCountry(countries, gps, async () => ({ ok: false })), { message: "locationError" });
  await assert.rejects(locateCountry(countries, gps, async () => { throw new Error("Network"); }), { message: "locationError" });
});
