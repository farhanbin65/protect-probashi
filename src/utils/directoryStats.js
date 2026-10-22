import directory from './embassyDirectory.js';

// Count the same combined records that readers see in the embassy directory.
export const directoryStats = {
  offices: directory.length,
  countries: new Set(directory.map(office => office.countryCode)).size,
  phones: directory.filter(office => Boolean(office.phone?.trim())).length,
  emails: directory.filter(office => Boolean(office.email?.trim())).length,
  addresses: directory.filter(office => Boolean(office.address?.trim())).length,
  officers: directory.reduce((total, office) => total + (office.officers?.length || 0), 0),
  officesWithOfficers: directory.filter(office => office.officers?.length).length,
};
