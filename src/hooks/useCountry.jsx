import {
  createContext,
  useContext,
  useMemo,
  useState
} from "react";

import countries from "../utils/directoryCountries";

const CountryContext = createContext(null);

function initialCountry() {
  try {
    const code = localStorage.getItem("pp-country");

    if (countries.some((item) => item.code === code)) {
      return code;
    }
  } catch {
    // Storage may be unavailable.
  }

  return null;
}

export function CountryProvider({ children }) {
  const [countryCode, setCountryCode] =
    useState(initialCountry);

  const [cityId, setCityId] = useState(null);

  function setLocation(code, city = null) {
    const exists = countries.some(
      (item) => item.code === code
    );

    if (!exists) return;

    setCountryCode(code);
    setCityId(city);

    try {
      localStorage.setItem("pp-country", code);
    } catch {
      // Continue without persistent storage.
    }
  }

  const country = countries.find(
    (item) => item.code === countryCode
  );

  const city = country?.cities.find(
    (item) => item.id === cityId
  );

  const value = useMemo(
    () => ({
      countries,
      countryCode,
      cityId,
      country,
      city,
      setLocation
    }),
    [countryCode, cityId, country, city]
  );

  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);

  if (!context) {
    throw new Error("CountryProvider is missing");
  }

  return context;
}