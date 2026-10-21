import news from "../data/news.json";

export function localized(value, lang = "bn") {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return value[lang] || value.en || "";
}

export function formatDate(value, lang = "bn") {
  if (!value) return "";

  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    lang === "bn" ? "bn-BD" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(value.includes("T") ? { hour: "2-digit", minute: "2-digit" } : {}),
      timeZone: "UTC"
    }
  ).format(date);
}

export function isValidPhone(phone) {
  if (typeof phone !== "string") {
    return false;
  }

  const value = phone.trim();

  if (value.includes("VERIFY")) {
    return false;
  }

  // International format.
  const international = /^\+[1-9]\d{6,14}$/;

  // Domestic format.
  const domestic = /^0\d{7,13}$/;

  // Emergency short code.
  const shortCode = /^\d{2,6}$/;

  return (
    international.test(value) ||
    domestic.test(value) ||
    shortCode.test(value)
  );
}

export function safeUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function getPublishedNews() {
  const now = Date.now();

  return news
    .filter((item) => {
      if (item.status !== "published") {
        return false;
      }

      if (!item.publishedAt) {
        return false;
      }

      const published = new Date(
        `${item.publishedAt}T00:00:00Z`
      ).getTime();

      if (!Number.isFinite(published) || published > now) {
        return false;
      }

      if (item.expiresAt) {
        const expires = new Date(
          `${item.expiresAt}T23:59:59Z`
        ).getTime();

        if (!Number.isFinite(expires) || expires < now) {
          return false;
        }
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt) -
        new Date(a.publishedAt)
    );
}

export function matchesCountry(item, countryCode) {
  return (
    item.countryCodes.length === 0 ||
    Boolean(
      countryCode &&
      item.countryCodes.includes(countryCode)
    )
  );
}