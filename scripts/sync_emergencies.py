"""Collect country emergency numbers from government travel advice, never embassy pages."""
import argparse
import copy
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup
import requests
from sync_embassies import Fetcher, ROOT

SERVICES = ('police', 'ambulance', 'fire')

def extract_emergency(html):
    soup = BeautifulSoup(html, 'html.parser')
    heading = next((h for h in soup.find_all(['h2', 'h3']) if re.match(r'Emergency services\b', h.get_text(' ', strip=True), re.I)), None)
    if not heading:
        raise ValueError('No emergency services section; no numbers imported')
    lines = []
    for node in heading.next_siblings:
        if getattr(node, 'name', None) in ['h2', 'h3']:
            break
        if getattr(node, 'name', None):
            lines.extend(node.get_text('\n', strip=True).splitlines())
    numbers = {}
    common_numbers = {}
    alternatives = {}
    for line in lines:
        line = line.strip().replace('\xa0', ' ')
        line = re.sub(r'^Ambulance or rescue:', 'Ambulance:', line, flags=re.I)
        line = re.sub(r'^Police and emergency:', 'Police:', line, flags=re.I)
        line = re.sub(r'^Fire and Rescue:', 'Fire:', line, flags=re.I)
        combined = re.fullmatch(r'(Police|Ambulance|Fire) and (Police|Ambulance|Fire):\s*(\d{2,6})', line, re.I)
        if combined:
            for service in (combined[1].lower(), combined[2].lower()):
                numbers[service] = combined[3]
        # Accept only complete, unqualified labels, retaining alternatives.
        match = re.fullmatch(r'(Police|Ambulance|Fire)(?: service| brigade)?\s*:\s*(\d[\d ]{1,14}(?:\s*(?:or|/)\s*\d[\d ]{1,14})*)\.?', line, re.I)
        if match:
            service = match[1].lower()
            values = [re.sub(r'\s', '', v) for v in re.split(r'\s*(?:or|/)\s*', match[2])]
            if not all(re.fullmatch(r'\d{2,15}', v) for v in values):
                continue
            if service in numbers and numbers[service] != values[0]:
                raise ValueError('Conflicting service labels; manual review needed')
            numbers[service] = values[0]
            alternatives[service] = values[1:]
        common = re.fullmatch(r'(?:Telephone|Call|Dial)\s*:?\s*(\d{2,6})\s*\(([^)]+)\)\.?', line, re.I)
        if common:
            labels = re.findall(r'police|ambulance|fire', common[2].lower())
            if re.fullmatch(r'(?:police|ambulance|fire)(?:,?\s+(?:police|ambulance|fire))*', common[2].lower()):
                for service in labels:
                    common_numbers[service] = common[1]
    for service, number in common_numbers.items():
        numbers.setdefault(service, number)
    return numbers, alternatives, '\n'.join(lines)

def merge_entry(existing, numbers, source, timestamp, alternatives, excerpt):
    # Existing entries are curated; differing values must not replace them silently.
    result = copy.deepcopy(existing) if existing else {'numbers': {}, 'sourceUrl': source}
    conflicts = {}
    for service, value in numbers.items():
        old = result['numbers'].get(service)
        if old and old != value:
            conflicts[service] = {'existing': old, 'scraped': value}
        elif not old:
            result['numbers'][service] = value
            result.setdefault('fieldSources', {})[service] = source
    if not existing:
        result.update(fetchedAt=timestamp, alternatives=alternatives, sourceExcerpt=excerpt, verification='automatically-extracted')
    return result, conflicts

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--system-trust', action='store_true')
    parser.add_argument('--country', help='Optional ISO country code for a trial')
    parser.add_argument('--sources', type=Path, default=ROOT / 'scripts/emergency-sources.json')
    args = parser.parse_args()
    if args.system_trust:
        try:
            import truststore
            truststore.inject_into_ssl()
        except ImportError:
            parser.error('Install truststore: python -m pip install truststore')
    path = ROOT / 'src/data/emergency_numbers.json'
    data = json.loads(path.read_text())
    # Preserve the existing curated SA, AE and QA records too.
    for country in json.loads((ROOT / 'src/data/countries.json').read_text()):
        if country.get('emergency'):
            data.setdefault(country['code'], {'numbers': country['emergency'], 'sourceUrl': country['emergencySourceUrl'], 'lastVerified': country['emergencyLastVerified']})
    sources = json.loads(args.sources.read_text())
    if args.country:
        sources = [s for s in sources if s['code'] == args.country.upper()]
    if not sources:
        parser.error('No matching countries')
    fetch = Fetcher({'www.gov.uk'})
    report = []
    for source in sources:
        code = source['code']
        entry = {**source}
        try:
            if code == 'GB':
                # UK has no foreign-travel page; preserve separately verified domestic data.
                entry['status'] = 'retained domestic government record'
            else:
                html, url = fetch.get(source['url'])
                numbers, alternatives, excerpt = extract_emergency(html)
                entry.update(numbers=numbers, sourceExcerpt=excerpt)
                if not numbers:
                    raise ValueError('No unambiguous service labels; existing data retained')
                data[code], entry['conflicts'] = merge_entry(data.get(code), numbers, url, datetime.now(timezone.utc).isoformat(), alternatives, excerpt)
                entry['status'] = 'complete' if all(s in data[code]['numbers'] for s in SERVICES) else 'partial'
        except (ValueError, requests.RequestException) as error:
            entry.update(status='needs review', error=str(error))
        report.append(entry)
        print(code, source['name'], entry['status'], flush=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    output = ROOT / 'scrape-output'
    output.mkdir(exist_ok=True)
    (output / f'emergency-report-{stamp}.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    preview = output / f'emergencies-{stamp}.json'
    preview.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
    if args.apply:
        (output / f'emergency-backup-{stamp}.json').write_bytes(path.read_bytes())
        temporary = path.with_suffix('.json.tmp')
        temporary.write_bytes(preview.read_bytes())
        temporary.replace(path)
    print('Updated:' if args.apply else 'Preview:', path if args.apply else preview)
    print('Complete coverage:', sum(all(s in item['numbers'] for s in SERVICES) for item in data.values()), 'countries')
    print('Report:', output / f'emergency-report-{stamp}.json')

if __name__ == '__main__':
    main()
