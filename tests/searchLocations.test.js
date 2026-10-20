import test from "node:test";
import assert from "node:assert/strict";
import countries from "../src/utils/directoryCountries.js";
import { searchLocations } from "../src/utils/searchLocations.js";

test("search matches English and Bangla cities and country codes", () => {
  for (const query of ["riyadh", "রিয়াদ", " RIYADH "]) {
    assert.ok(searchLocations(countries, query).some((item) => item.country.code === "SA" && item.city?.id === "riyadh"));
  }
  assert.ok(searchLocations(countries, "GB").some((item) => item.country.code === "GB" && item.city === null));
  assert.ok(searchLocations(countries, "যুক্তরাজ্য").some((item) => item.country.code === "GB"));
  assert.deepEqual(searchLocations(countries, "  "), []);
  assert.deepEqual(searchLocations(countries, "zzzzzz"), []);
});
