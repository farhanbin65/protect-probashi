import test from 'node:test';
import assert from 'node:assert/strict';
import countries from '../src/utils/directoryCountries.js';

test('UK and US emergency services exist independently of embassy contacts', () => {
  for (const [code, number] of [['GB', '999'], ['US', '911']]) {
    const country = countries.find(item => item.code === code);
    assert.deepEqual(country.emergency, { police: number, ambulance: number, fire: number });
    assert.match(country.emergencySourceUrl, /^https:\/\//);
    assert.ok(country.cities.length);
  }
});


test('added emergency-only countries can be selected without embassy or city data', () => {
  for (const code of ['AR', 'CO', 'FI', 'IE', 'IL', 'NO', 'VE']) {
    const country = countries.find(item => item.code === code);
    assert.ok(country);
    assert.equal(Object.keys(country.emergency).length, 3);
    assert.deepEqual(country.cities, []);
    assert.equal(country.emergencyLastVerified, undefined);
  }
});
