# Protect Probashi

Protect Probashi is a Bangla and English information app for Bangladeshi workers living abroad. It brings together emergency contacts, Bangladesh mission listings, worker guidance, expatriate news and currency conversion to Bangladeshi taka.

The project is a React single-page application built with Vite. It can be deployed as a static site on Vercel and includes a production service worker for offline access to cached app content.

## Features

- One-click language switching, with the selected language displayed first in the bilingual brand.
- Country and city search in Bangla or English, plus manual selectors. The current location screen does not request GPS permission.
- Emergency service numbers for countries with verified data and published embassy contacts.
- A directory of 82 Bangladesh offices across 60 countries, including embassies, consulates, high commissions and permanent missions.
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

## Local setup

Use a Node.js version supported by the installed Vite release; Node.js 22.12 or a newer supported LTS release is suitable.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. No API key or environment variables are required for the current implementation.

## Checks and production preview

```bash
node --test tests/*.test.js
npm run build
npm run preview
```

Tests cover mission normalization and deduplication, verified-record precedence, bilingual location search, news metadata and currency calculations/cache behavior. Legacy geolocation utility tests remain, although GPS detection is no longer exposed in the location UI.

`npm run build` generates `dist/`. The production build includes PWA assets and the service worker. Offline behavior should be checked against a production preview or deployed site, after an initial online visit.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Home dashboard and currency converter |
| `/location` | Country and optional city selection |
| `/emergency` | Selected-country emergency and embassy contacts |
| `/embassy` | Full mission directory and country filter |
| `/rights` | Available worker guidance |
| `/rights/:id` | Individual guidance page |
| `/news` | News list and filters |
| `/news/:id` | Summary, image and publisher reference |
| `/about` | Purpose, limitations, privacy and reporting status |

## Workflow

The diagram below covers user navigation, content maintenance, currency fetching, offline behavior and deployment. The standalone Mermaid source is [docs/workflow.mmd](docs/workflow.mmd).

```mermaid
flowchart TD
    Visitor["Worker opens Protect Probashi"] --> Hosting["Vercel serves the Vite production build"]
    Hosting --> Router["React BrowserRouter"]
    Router --> Language["LanguageProvider: Bangla or English"]
    Router --> Location["CountryProvider: saved country and current city"]
    Language --> Shell["Bilingual header, navigation and news ticker"]
    Location --> Shell
    Shell --> Home["Home: location, emergency help, services, news and currency"]
    Home --> Search["Location: search country or city in Bangla or English"]
    Search --> Confirm["Select result or use country and city selectors"]
    Confirm --> Save["Confirm: save country on device and set current city"]
    Save --> Location
    Save --> Home
    Home --> Emergency["Emergency: selected country's services and verified embassy contacts"]
    Home --> Embassy["Embassy: all offices with country filter and local offices first"]
    Home --> Rights["Rights: global and selected-country guidance"]
    Rights --> RightsDetail["Guidance detail and links to help"]
    Home --> News["News: all, my country or worldwide"]
    Shell --> NewsDetail["News detail: bilingual summary, image, date and source"]
    News --> NewsDetail
    NewsDetail --> Publisher["Read original report on publisher website"]
    Shell --> About["About: purpose, limitations, privacy and reporting status"]

    subgraph Content["Content maintenance and local data"]
        Editors["Maintainer checks sources and edits JSON"] --> Verified["embassies.json: five verified contact records"]
        Editors --> Imported["bd_missions.json: imported mission directory"]
        Editors --> CountryData["countries.json: verified country and emergency data"]
        CountryData --> Countries["directoryCountries: merge countries and mission cities"]
        Imported --> Countries
        Countries --> Search
        Countries --> Location
        Verified --> Merge["Normalize missions and deduplicate; verified records take precedence"]
        Imported --> Merge
        Countries --> Merge
        Merge --> Embassy
        Verified --> Emergency
        CountryData --> Emergency
        Editors --> RightsData["rights.json: guidance; currently sample content"]
        RightsData --> Rights
        RightsData --> RightsDetail
        Editors --> NewsData["news.json: manually curated reports with attribution"]
        NewsData --> Published["Exclude drafts, future posts and expired stories; sort newest first"]
        Published --> News
        Published --> NewsDetail
        Published --> Home
        Published --> Shell
    end

    subgraph Currency["Currency to BDT"]
        Home --> LoadRates["Load daily exchange rates"]
        LoadRates --> Fresh{"Valid cache before next update?"}
        Fresh -->|Yes| Convert["Choose currency and amount; divide by BDT-base rate"]
        Fresh -->|No| API["ExchangeRate-API HTTPS request with timeout"]
        API -->|Success| Cache["Validate response and save rates locally"]
        Cache --> Convert
        API -->|Failure with cache| Stale["Show saved rates with stale warning"]
        Stale --> Convert
        API -->|Failure without cache| Retry["Show error and retry button"]
        Retry --> LoadRates
        Convert --> RateDisplay["Display BDT result, provider link and Bangladesh-time update stamp"]
    end

    subgraph Offline["Offline behavior"]
        Hosting --> SW["Production service worker caches app assets"]
        SW --> Cached["Previously cached app and bundled JSON remain available offline"]
        Cached --> Router
        Cached --> Limits["Remote news images need internet; currency uses saved rates when available"]
    end

    subgraph Release["Development and release"]
        Changes["Code or content changes"] --> Tests["Run Node regression tests"]
        Tests --> Build["Run Vite production build"]
        Build --> Git["Commit and push to GitHub"]
        Git --> Deploy["Vercel builds dist with SPA route rewrites"]
        Deploy --> Hosting
    end
```

## Project structure

```text
src/
  components/        Shared UI, header, ticker and currency converter
  data/              Country, embassy, mission, rights and news JSON
  hooks/             Language, country and online-state contexts/hooks
  i18n/              Bangla and English interface text
  pages/             Route-level views
  utils/             Content formatting, mission merge, search and rate loading
  App.jsx            Providers, layout and routes
  main.jsx           App entry point and service-worker registration
tests/               Node regression tests
docs/workflow.mmd    Mermaid workflow source
vercel.json          Build settings and SPA routing
vite.config.js       React and PWA build configuration
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

## Deploying to Vercel

Push the repository to GitHub and import it into Vercel. Use these settings:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root directory | Directory containing `package.json` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | None currently required |

`vercel.json` includes a rewrite to `index.html` so direct visits and refreshes on routes such as `/embassy` work.

After deployment, check direct route refreshes, language switching, location confirmation, source links, currency loading and offline reopening. Subsequent pushes trigger deployments when the repository is connected to the Vercel project.

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
