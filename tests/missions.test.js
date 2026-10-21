import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeMissions } from "../src/utils/missions.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url)));
const verified = load("embassies");
const imported = load("bd_missions");
const countries = load("countries");

test("real directory keeps all verified records intact and adds only the distinct supported office", () => {
  const result = mergeMissions(verified, imported, countries);
  assert.equal(result.length, 6);
  assert.deepEqual(result.slice(0, 5), verified);
  assert.deepEqual(Object.fromEntries(["SA", "AE", "QA"].map((code) => [code, result.filter((item) => item.countryCode === code).length])), { SA: 3, AE: 2, QA: 1 });
  const oic = result[5];
  assert.equal(oic.type, "permanentMission");
  assert.equal(oic.city, "jeddah");
  assert.match(oic.name.en, /OIC/);
  assert.match(oic.name.bn, /ওআইসি/);
  assert.equal(oic.sourceUrl, imported.at(-1).source);
  assert.equal(oic.lastVerified, null);
  assert.equal(oic.phone, null);
  assert.equal(oic.address, "");
});

test("repeated imports do not duplicate offices or overwrite verified contacts", () => {
  assert.deepEqual(mergeMissions(verified, [...imported, ...imported], countries), mergeMissions(verified, imported, countries));
});

test("normalizes city names, country codes, bilingual labels and missing fields", () => {
  const record = { name: "Consulate General of Bangladesh, Abu Dhabi", country: " ae ", city: " Abu Dhabi ", source: "https://example.com/", verified: false, lastVerified: "2026-10-20" };
  const result = mergeMissions([], [record], countries);
  assert.equal(result[0].countryCode, "AE");
  assert.equal(result[0].city, "abu-dhabi");
  assert.match(result[0].name.bn, /আবুধাবি/);
  assert.equal(result[0].lastVerified, null);
  assert.equal(mergeMissions([], [{ ...record, country: "Australia" }], countries).length, 0);
});

test("selected-city ordering puts the selected office first without changing the directory", () => {
  const result = mergeMissions(verified, imported, countries);
  const selected = result.filter((item) => item.countryCode === "SA").sort((a, b) => Number(b.city === "jeddah") - Number(a.city === "jeddah"));
  assert.deepEqual(selected.map((item) => item.city), ["jeddah", "jeddah", "riyadh"]);
  assert.equal(result[0].city, "riyadh");
});

test("full directory includes every imported office with unique IDs and verified precedence", async () => {
  const { default: allCountries } = await import("../src/utils/directoryCountries.js");
  const result = mergeMissions(verified, imported, allCountries);
  assert.equal(result.length, 82);
  assert.equal(allCountries.length, 67);
  assert.equal(new Set(result.map((item) => item.id)).size, result.length);
  assert.deepEqual(result.slice(0, 5), verified);
  assert.ok(result.some((item) => item.countryCode === "GB" && item.type === "highCommission"));
  assert.equal(result.filter((item) => item.countryCode === "AE").length, 2);
  assert.ok(result.every((item) => item.name.en && item.name.bn));
});
