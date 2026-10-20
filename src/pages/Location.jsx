import {
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import {
  MapPin,
  LocateFixed,
  Check,
  List,
  Globe
} from "lucide-react";

import { useT } from "../hooks/useT";
import { useCountry } from "../hooks/useCountry";
import { useOnline } from "../hooks/useOnline";

import { localized } from "../utils/content";

import BigButton from "../components/BigButton";
import { locateCountry } from "../utils/location";

export default function Location() {
  const t = useT();

  const {
    countries,
    countryCode,
    cityId,
    setLocation
  } = useCountry();

  const online = useOnline();
  const navigate = useNavigate();

  const countrySelectRef = useRef(null);
  const detectionRequest = useRef(0);

  const [selectedCountry, setSelectedCountry] =
    useState(countryCode || "");

  const [selectedCity, setSelectedCity] =
    useState(cityId || "");

  const [detecting, setDetecting] = useState(false);
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

    detectionRequest.current += 1;
    setLocation(selectedCountry, selectedCity || null);
    navigate("/");
  }

  async function detectLocation() {
    setError("");
    if (!online) {
      setError(t("locationOffline"));
      return;
    }
    const request = ++detectionRequest.current;
    setDetecting(true);
    try {
      const location = await locateCountry(countries, navigator.geolocation);
      if (request !== detectionRequest.current) return;
      setLocation(location.countryCode, location.cityId);
      navigate("/");
    } catch (failure) {
      if (request === detectionRequest.current) setError(t(failure.message));
    } finally {
      if (request === detectionRequest.current) setDetecting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <MapPin size={30} aria-hidden="true" />

        <h1>{t("chooseLocation")}</h1>
      </div>

      <p>{t("locationIntro")}</p>

      <div className="panel stack">
        <p>{t("locationPermission")}</p>

        <BigButton
          icon={LocateFixed}
          label={
            detecting
              ? t("detecting")
              : t("useLocation")
          }
          onClick={detectLocation}
          disabled={detecting}
        />

        <BigButton
          icon={List}
          label={t("manualLocation")}
          variant="outline"
          onClick={() => {
            countrySelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            countrySelectRef.current?.focus();
            try {
              countrySelectRef.current?.showPicker?.();
            } catch {
              // Some browsers only allow focus on native selects.
            }
          }}
        />

        <p className="muted">
          {t("locationPrivacy")}
        </p>

        <a
          className="text-link"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Globe size={20} aria-hidden="true" />
          <span>{t("osmAttribution")}</span>
        </a>
      </div>

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
          ref={countrySelectRef}
          id="country"
          value={selectedCountry}
          onChange={(event) => {
            detectionRequest.current += 1;
            setDetecting(false);
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