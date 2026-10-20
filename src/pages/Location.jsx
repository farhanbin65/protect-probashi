import {
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import {
  MapPin,
  Check,
  Search
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";

import { localized } from "../utils/content";

import BigButton from "../components/BigButton";
import { searchLocations } from "../utils/searchLocations";

export default function Location() {
  const t = useT();

  const {
    countries,
    countryCode,
    cityId,
    setLocation
  } = useCountry();

  const navigate = useNavigate();

  const [selectedCountry, setSelectedCountry] =
    useState(countryCode || "");

  const [selectedCity, setSelectedCity] =
    useState(cityId || "");

  const [query, setQuery] = useState("");
  const results = searchLocations(countries, query);
  const [error, setError] = useState("");

  const country = countries.find(
    (item) => item.code === selectedCountry
  );

  function handleManualSelection(event) {
    event.preventDefault();

    if (!selectedCountry) {
      setError(t("selectFirst"));
      return;
    }

    setLocation(selectedCountry, selectedCity || null);
    navigate("/");
  }

  return (
    <div className="page">
      <div className="page-heading">
        <MapPin size={30} aria-hidden="true" />

        <h1>{t("chooseLocation")}</h1>
      </div>

      <p>{t("locationIntro")}</p>

      <section className="panel stack location-search">
        <label htmlFor="location-search" className="item-heading">
          <Search size={22} aria-hidden="true" />
          {t("searchLocation")}
        </label>
        <input
          id="location-search"
          type="search"
          value={query}
          placeholder={t("searchLocationPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="metadata">{t("locationSearchNote")}</p>
        {query.trim() && (
          <div className="stack" aria-live="polite">
            {results.length === 0 && <p>{t("noneFound")}</p>}
            {results.map(({ country: item, city }) => (
              <BigButton
                key={`${item.code}-${city?.id || "country"}`}
                icon={MapPin}
                variant="outline"
                label={[city && localized(city.name, t.lang), localized(item.name, t.lang)].filter(Boolean).join(", ")}
                onClick={() => {
                  setSelectedCountry(item.code);
                  setSelectedCity(city?.id || "");
                  setError("");
                  setQuery("");
                }}
              />
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      <form
        className="panel location-form"
        onSubmit={handleManualSelection}
      >
        <label htmlFor="country">
          {t("selectCountry")}
        </label>

        <select
          id="country"
          value={selectedCountry}
          onChange={(event) => {
            setSelectedCountry(event.target.value);
            setSelectedCity("");
            setError("");
          }}
          required
        >
          <option value="">
            {t("selectCountry")}
          </option>

          {countries.map((item) => (
            <option
              key={item.code}
              value={item.code}
            >
              {localized(item.name, t.lang)}
            </option>
          ))}
        </select>

        {country && (
          <>
            <label htmlFor="city">
              {t("selectCity")}
            </label>

            <select
              id="city"
              value={selectedCity}
              onChange={(event) =>
                setSelectedCity(event.target.value)
              }
            >
              <option value="">
                {t("cityOptional")}
              </option>

              {country.cities.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {localized(item.name, t.lang)}
                </option>
              ))}
            </select>
          </>
        )}

        <BigButton
          icon={Check}
          label={t("confirmLocation")}
          type="submit"
          disabled={!selectedCountry}
        />
      </form>
    </div>
  );
}