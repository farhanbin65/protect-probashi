# Protect Probashi

Protect Probashi is a Bangla and English information app for Bangladeshi workers living abroad. It brings together emergency contacts, Bangladesh mission listings, worker guidance, expatriate news and currency conversion to Bangladeshi taka.

The project is a React single-page application built with Vite. It can be deployed as a static site on Vercel and includes a production service worker for offline access to cached app content.

## Features

- One-click language switching
- Country and city search in Bangla or English, plus manual selectors. 
- Emergency service numbers for countries with verified data and published embassy contacts.
- Country filtering and prioritisation of offices matching the selected country and city.
- Worker-rights pages with links to relevant help sections.
- News summaries in both languages, publisher-hosted images, photo credits, publication dates and original source links.
- A compact currency converter covering the currencies returned by the provider, with a daily rate timestamp, local caching and explicit stale-rate handling.
- Offline access to previously cached app assets and bundled data.

## Current content limits

The directory's coverage is broader than its verified contact coverage. Five records in `src/data/embassies.json` contain verified contact details. Most imported mission records have no phone number, address or email. Missing details are displayed as unverified.

Verified emergency data currently covers Saudi Arabia, the United Arab Emirates and Qatar. Selecting another country does not create emergency numbers for it.

The rights content is still sample material requiring country-specific source checking and review before it is used as practical guidance. Incorrect-information reporting has no configured contact method yet.

News is maintained manually. There is no scheduled news importer or automatic translation pipeline. Images remain on publisher servers and may become unavailable.

Currency values are daily reference rates. Bank and remittance-service payouts can differ, and fees or incentives are not included. The app shows the provider's update timestamp rather than assuming every response is current.



## Workflow

The diagram below covers user navigation, content maintenance, currency fetching, offline behavior and deployment. The standalone Mermaid source is [docs/workflow.mmd](docs/workflow.mmd).

```mermaid
flowchart TD
    Start["User opens Protect Probashi"] --> Lang["Select Language<br/>Bangla or English"]
    Lang --> Location["Set Country & City"]
    Location --> Home["Home Page"]
    
    Home --> Emergency["Emergency Help<br/>Embassy Contacts"]
    Home --> Rights["Rights & Guidance"]
    Home --> News["News Feed"]
    Home --> Currency["Currency Converter<br/>to BDT"]
    
    Emergency --> EmDetail["View Embassy Details<br/>for Selected Country"]
    Rights --> RightsDetail["Country-Specific<br/>Rights Info"]
    News --> NewsDetail["Read News Story<br/>& Source Link"]
    Currency --> Convert["Enter Amount &<br/>Get BDT Result"]
    
    subgraph Data["Content"]
        JSON["embassies.json<br/>rights.json<br/>news.json<br/>countries.json"]
    end
    
    JSON --> Home
    
    subgraph Tech["Tech Stack"]
        React["React + Vite"]
        Offline["Service Worker<br/>Offline Support"]
    end
    
    React --> Home
    Offline --> Home
```

## Updating content

### Countries and mission contacts

`src/utils/directoryCountries.js` combines the curated country data with countries and cities represented in the imported mission list. It does not infer emergency numbers for additional countries.

`src/utils/missions.js` normalizes imported missions into the existing schema and merges them with the verified embassy records. Verified records take precedence. Offices are matched by country, city and role, so the Jeddah consulate and the OIC permanent mission remain separate.

Update `src/data/embassies.json` for verified contacts. Preserve a stable ID, bilingual name, country code, city ID, mission type, source URL and the actual date of verification. Do not assign a verification date just because a mission appears in a directory.

### Worker guidance

Maintain `src/data/rights.json` with short bilingual instructions. Replace the sample content only after checking relevant official sources. Include the review date and appropriate contact destinations.

### News

Maintain `src/data/news.json`. Each published story should have:

- A unique ID and `status: "published"`.
- Bangla and English titles and short summaries.
- `countryCodes`, using an empty array for worldwide stories.
- `sourceName`, an HTTPS `sourceUrl` and the original `publishedAt` date.
- An optional expiry date and a carefully chosen urgent flag.
- An HTTPS image URL, bilingual alternative text and an image credit when using an image.

The app excludes drafts, future-dated posts and expired stories. It sorts eligible stories newest first, then applies the relevant country filter. Use short summaries and link readers to the original report. Check publisher permissions before expanding image reuse or automated ingestion.

### Currency rates

`src/utils/exchangeRates.js` requests `https://open.er-api.com/v6/latest/BDT`. Since the response is based on one BDT, foreign-currency amounts are divided by the selected rate to produce BDT.

Valid cached rates are reused until the provider's next-update time. Requests have a timeout. If a request fails, a saved response can be displayed with an explicit stale warning; without saved data, the panel shows an error and retry action.

Provider attribution is included in the UI. See the [ExchangeRate-API open-access documentation](https://www.exchangerate-api.com/docs/free).

## Privacy and offline behavior

There is no account requirement. Language and country preferences, plus cached currency data, are stored locally. The selected city is kept in application state and is not restored after a full reload.

News images and currency requests contact external providers. The production service worker caches app assets and bundled JSON; it does not guarantee offline availability of publisher images or fresh exchange rates.

The home-page offline action checks whether the production app cache is available. It does not download every remote image or force a rate refresh.

## Contribution workflow

```bash
npm ci
node --test tests/*.test.js
npm run build
git add README.md docs/workflow.mmd
git commit -m "Document project setup and application workflow"
git push origin main
```

For application changes, stage the relevant source and test files as well. Dependencies, generated builds, virtual environments, logs, local Vercel settings and environment secrets are excluded by `.gitignore`.

### Currency providers

ExchangeRate-API v4 (USD base) is the default. If it fails, returns invalid data, or returns stale rates, the app tries Open Exchange Rates through `/api/exchange-rates`. Both responses are converted to the app's BDT-based format. If both fail, cached rates remain available with a stale notice.

Set `OPEN_EXCHANGE_RATES_APP_ID` in Vercel's environment variables and redeploy to enable the fallback. Keep it server-side; do not prefix it with `VITE_`. No key is needed for the default provider. The fallback uses USD base so it works with the Open Exchange Rates free plan. Browser results are cached for up to a day; the fallback endpoint has a one-hour shared cache.

For local fallback testing, use `vercel dev` with the environment variable configured. Plain `npm run dev` serves the frontend and default provider but does not run Vercel API functions.

### RSS news

`/api/news` reads Prothom Alo's Bangla and English RSS feeds. The home cards, news pages and ticker share the results. Original headlines, publisher-provided feed excerpts, available media images, source links and publication timestamps are retained; full linked articles are not scraped or translated. Only articles from the last seven days are imported. Feeds refresh on requests after a 15-minute cache expires. Browser storage provides saved news when offline, with curated articles as a further fallback.

The API works on Vercel and through the included Vite development middleware. No API key or scheduled job is required. Configure publishers in `api/news.js`; unavailable images are hidden, and feed failures do not remove curated news.
