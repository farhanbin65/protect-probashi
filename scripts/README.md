# Embassy data collection

Run from the project root:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/scrape_embassies.py scripts/embassy-sources.example.json --output embassy-review.json
```

Copy the example manifest and add an entry for each office, using its exact application mission ID and official contact and officers-profile page URLs. The scraper does not discover every mission website automatically. It respects robots.txt, waits between requests, rejects redirects for manual inspection, and records timeouts without discarding successful pages.

Output contains source URLs, fetch timestamps, email and phone candidates, recognizable staff table rows with names, designations and image URLs, and page text for reviewing addresses and hotlines. A fetch timestamp is not a verification date. Non-table staff layouts and JavaScript-only pages require a site-specific parser or manual review. Missing images use the application's user silhouette.

Do not treat every phone or email on a page as the embassy's main contact. Confirm each field against its label. After reviewing, add records to `src/data/mission_details.json`:

```json
[
  {
    "id": "bd-dz-algiers-embassy",
    "officers": [
      {
        "name": { "en": "Reviewed official name", "bn": "যাচাইকৃত নাম" },
        "designation": { "en": "Reviewed role", "bn": "যাচাইকৃত পদবি" },
        "imageUrl": null,
        "phone": null,
        "email": null,
        "sourceUrl": "https://algiers.mofa.gov.bd/pages/officers-profile"
      }
    ]
  }
]
```

Reviewed records may also contain `phone`, `hotline`, `email`, `address`, `website`, `sourceUrl`, and `lastVerified` (YYYY-MM-DD). Existing nonempty directory values take precedence. Never paste the example placeholder person into live data.

Country emergency numbers are separate from embassy contacts. The app currently has sourced numbers for SA, AE and QA. Verify additional countries against their government emergency-service websites before extending the country catalog; never infer a number from another country or scrape a mission staff phone as an emergency number. The UI explicitly states when no verified number is available.

## Certificate verification on macOS

If current certifi certificates still give `unable to get local issuer certificate`, try operating-system trust (Python 3.10+):

```sh
python -m pip install truststore
python scripts/scrape_embassies.py scripts/embassy-sources.example.json --system-trust --output embassy-review-system.json
```

This keeps HTTPS verification enabled. It may resolve differences between macOS and Python certificate-chain handling; it does not guarantee a broken server certificate will work. If it fails, keep the error for diagnosis rather than disabling verification.

## Automatic directory sync

From the project root, run:

```sh
python -m pip install -r scripts/requirements.txt truststore
python scripts/sync_embassies.py --system-trust --apply
```

This processes the full directory. It uses existing website URLs, discovers additional MOFA mission websites from matching rows in the official ministry directory, follows same-site contact and officer links (up to five pages per office), and fills missing contacts and staff in `src/data/bd_missions.json`. Existing values are preserved. It never guesses mission domains or labels a fetch as verification.

Before updating, it creates a backup in `scrape-output/`. That folder also contains a timestamped preview and detailed report, including failed pages, extracted candidates, and conflicts. For a preview without modifying the app, omit `--apply`. For a short trial use `--city Sydney`. Add a confirmed `website` to records which discovery could not resolve, then rerun. Some ministry directory rows have no website links, so full coverage is not guaranteed. JavaScript-only pages and unfamiliar layouts may need parser additions.

The parser automatically imports explicitly labelled phone/email/WhatsApp contacts, HTML address elements, and recognizable officer tables. Other information remains in the report for review rather than being assigned to the wrong field. Country emergency numbers are preserved; this script does not infer or scrape them from staff contact pages. They still require a separately verified government source.

Test the importer without network requests:

```sh
python -m unittest discover -s scripts -p 'test_*.py'
```

## Country emergency numbers (all app countries)

```sh
python scripts/sync_emergencies.py --system-trust --apply
```

This separate scraper covers all 60 countries in `scripts/emergency-sources.json`, using the Emergency services section of UK government travel advice. The UK retains its separately verified domestic government record. It updates `src/data/emergency_numbers.json`, which feeds the Emergency page and embassy country fallbacks automatically. Omit `--apply` for a preview, or add `--country FR` for a trial.

Backups, previews and reports are saved in `scrape-output/`. Existing numbers are preserved on conflicts and failures. Only explicitly labelled service numbers or a clearly identified shared police/ambulance/fire number are imported. Regional/conditional lines are flagged for review, not guessed. Alternative numbers and source excerpts remain in the JSON/report. Automatically fetched data has `fetchedAt`, not a fabricated human-verification date. Complete coverage is reported after each run; unsupported layouts or missing sources remain visible in the report.

## Mission-index discovery and provenance

The sync reads official website and officers-profile links from the MOFA master
index. It first matches the mission name, then an exact country/city location
cell if the displayed mission name differs. Ambiguous matches are left for review.
HTTP links in the official index are upgraded to HTTPS for collection.
It queues the actual linked officers page before the homepage, so missing homepage
navigation does not hide staff pages. It does not construct domains from city names.
Officially indexed websites can be saved with index provenance even if the mission
site cannot be fetched. Contact fields require a successful fetch and an unambiguous,
explicitly labelled value; staff contacts stay separate from mission contacts.

`fieldSources` records source URLs and fetch time per newly filled contact field.
Existing `sourceUrl`, `phoneSourceUrl`, nonempty contacts, `verified`, and
`lastVerified` values are preserved. Newly collected unverified records remain
`verified: false`. Source collection is not a two-source verification: host-country
protocol directories must be reviewed separately, matching the exact office and
jurisdiction before adding their corroborating source. Failed or robots-disallowed
pages remain in the report; the collector does not impersonate a browser to bypass
those restrictions.

Collection runs across four mission hosts at a time by default, with separate
rate limiting and sessions per starting host. Use `--workers 1` for a sequential
run, or choose up to eight workers. Requests to the same starting host are serialized.

## Contact-first collection and protocol checks

The homepage is fetched first to discover navigation. Before every subsequent
request, pending URLs are ranked using both their path and link text: contact,
address and location pages first; consular, visa and passport pages next; then
about pages, staff lists, and individual biographies. The five-page budget is
retained. Sorting is repeated after each page discovers new links.

Office email selection prefers mission mailboxes, then info/embassy/office/contact,
then consular addresses. Equal top scores remain conflicts for review. Personal
mailboxes are not selected simply because they were found first. Addresses can
come from labelled table cells, additional heading levels, and short paragraphs
with a postal/street signature and an office or matching-country context. Other
address-like paragraphs stay in `addressCandidates` for review.

If both mission phone and email are absent, an explicitly designated Ambassador
or High Commissioner may supply a fallback. Such contacts include bilingual
individual-contact notes and `contactType: headOfMission` source metadata. They
do not overwrite office contacts or create a verification date.

After the mission crawl, `protocol_sources.py` checks configured host-country
sources only for offices still missing phone, email or address. Office-scoped
parsers currently support Canberra's DFAT address and Wellington's MFAT contact
block; the latter explicitly excludes the honorary consul's block. Countrywide
UK/US directories are collected for review rather than assigning one office's
contacts to another. Existing conflicting values are reported and preserved.
Unavailable sources remain explicit report errors. Protocol checks alone:

```sh
python scripts/protocol_sources.py --system-trust --apply
```

Protocol collection is not automatic two-source verification. Matching or
conflicting sources are recorded without changing `lastVerified`.

The optional US host-country check is deliberately skipped after the known 403;
reports mark it `needs external verification: skipped (403)` with automatic
retry disabled. Mission-site collection continues normally.

Birmingham and Manchester addresses were checked against the October 2026 UK
regional consular list. Any remaining missing contacts are listed in
`MANUAL_REVIEW_QUEUE` for office-specific review, with automatic protocol retries
disabled. The queue does not assert that the offices lack dedicated websites.
