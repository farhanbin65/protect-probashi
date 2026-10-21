"""Discover official mission sites and fill missing directory fields, with backups."""
import argparse
import copy
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup
from scrape_embassies import extract

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = 'https://mofa.gov.bd/pages/static-pages/6940329e35ce18e1c055f712'
EMAIL = re.compile(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}')

def normalize_phone(value):
    value = value.strip()
    if value.startswith('+'):
        value = value.replace('(0)', '')
    value = re.sub(r'[\s().-]', '', value)
    return value if re.fullmatch(r'\+?[0-9]{7,15}', value) else None

def text_key(value):
    return re.sub(r'\W+', '', value.casefold())

class Fetcher:
    def __init__(self, allowed, ca=None):
        self.allowed = allowed
        self.session = requests.Session()
        self.session.headers['User-Agent'] = 'ProtectProbashiDirectory/2.0'
        if ca:
            self.session.verify = ca
        self.robots = {}
        self.cache = {}
        self.last = 0

    def valid(self, url):
        parsed = urlparse(url)
        host = parsed.hostname or ''
        return parsed.scheme == 'https' and not parsed.username and not parsed.password and (host == 'mofa.gov.bd' or host.endswith('.mofa.gov.bd') or host in self.allowed)

    def request(self, url):
        time.sleep(max(0, 1.5 - (time.monotonic() - self.last)))
        try:
            response = self.session.get(url, timeout=(10, 25), allow_redirects=False)
            response.raise_for_status()
            return response
        finally:
            self.last = time.monotonic()

    def get(self, url, depth=0):
        if not self.valid(url):
            raise ValueError('URL is outside official/explicitly trusted hosts')
        if url in self.cache:
            return self.cache[url]
        origin = f'https://{urlparse(url).netloc}'
        if origin not in self.robots:
            robot = RobotFileParser()
            try:
                response = self.request(origin + '/robots.txt')
                if response.is_redirect:
                    raise ValueError('robots.txt redirects; needs manual inspection')
                robot.parse(response.text.splitlines())
            except requests.HTTPError as error:
                if error.response.status_code != 404:
                    raise
                robot.parse([])
            self.robots[origin] = robot
        if not self.robots[origin].can_fetch('ProtectProbashiDirectory', url):
            raise ValueError('robots.txt disallows this page')
        response = self.request(url)
        if response.is_redirect:
            if depth >= 3:
                raise ValueError('Too many redirects')
            return self.get(urljoin(url, response.headers['Location']), depth + 1)
        if 'html' not in response.headers.get('Content-Type', '').lower():
            raise ValueError('Not an HTML page')
        self.cache[url] = (response.text, url)
        return self.cache[url]

def discover(html, records):
    """Match a directory row to exactly one office; never guess domain names."""
    found = {}
    for row in BeautifulSoup(html, 'html.parser').find_all('tr'):
        text = row.get_text(' ', strip=True)
        matches = [i for i, record in enumerate(records) if text_key(record['name']) in text_key(text)]
        if len(matches) != 1:
            continue
        urls = {a.get('href', '') for a in row.find_all('a', href=True)}
        urls = {u for u in urls if urlparse(u).scheme == 'https' and (urlparse(u).hostname or '').endswith('.mofa.gov.bd')}
        hosts = {urlparse(u).hostname for u in urls}
        if len(hosts) == 1:
            found[matches[0]] = f'https://{next(iter(hosts))}/'
    return found

def contacts(html, url):
    result = extract(html, url)
    soup = BeautifulSoup(html, 'html.parser')
    # Remove officer tables before extracting office-level fields.
    for table in soup.find_all('table'):
        if table.find('img') or 'designation' in table.get_text().lower():
            table.decompose()
    for node in soup.select('script, style, nav, header, form'):
        node.decompose()
    lines = [line.strip() for line in soup.get_text('\n', strip=True).splitlines() if line.strip()]
    candidates = {key: set() for key in ['phone', 'email', 'address', 'whatsapp']}
    # Only explicit contact labels; unrelated numbers and emails are not promoted.
    for i, line in enumerate(lines):
        for field, pattern in [('phone', r'^(?:telephone|phone(?:\s*\(office\))?|tel|ফোন)\s*[:：]?\s*(.*)$'), ('email', r'^(?:e-?mail|ইমেইল)\s*[:：]?\s*(.*)$'), ('whatsapp', r'^whats\s*app\s*[:：]?\s*(.*)$')]:
            match = re.match(pattern, line, re.I)
            if not match:
                continue
            value = match.group(1) or (lines[i+1] if i+1 < len(lines) else '')
            value = (EMAIL.fullmatch(value).group() if EMAIL.fullmatch(value) else None) if field == 'email' else normalize_phone(value)
            if value:
                candidates[field].add(value)
    # Contact pages often use an Address heading followed by a paragraph.
    for heading in soup.find_all(['h2', 'h3', 'h4', 'strong']):
        if re.fullmatch(r'(?:postal\s+)?address|ঠিকানা', heading.get_text(' ', strip=True), re.I):
            block = heading.find_next_sibling()
            if block and block.name in ['p', 'div']:
                value = block.get_text(' ', strip=True)
                if 15 < len(value) < 500 and not EMAIL.search(value) and not re.search(r'phone|telephone|whatsapp', value, re.I):
                    candidates['address'].add(value)
    for address in soup.find_all('address'):
        value = address.get_text(' ', strip=True)
        if 15 < len(value) < 500 and not EMAIL.search(value):
            candidates['address'].add(value)
    for a in soup.find_all('a', href=True):
        parsed = urlparse(a['href'])
        if parsed.hostname == 'wa.me':
            value = normalize_phone('+' + parsed.path.strip('/'))
            if value:
                candidates['whatsapp'].add(value)
    result['fields'] = {key: sorted(values) for key, values in candidates.items()}
    for person in result['officers']:
        person['phoneAsPublished'] = person.get('phone')
        person['phone'] = normalize_phone(person.get('phone') or '')
        person.setdefault('imageUrl', None)
    return result

def merge(record, pages, fetched):
    result = copy.deepcopy(record)
    conflicts = {}
    for field in ['phone', 'email', 'address', 'whatsapp']:
        values = {}
        for page in pages:
            for value in page['fields'][field]:
                values.setdefault(value, []).append(page['sourceUrl'])
        if len(values) == 1 and not result.get(field):
            result[field] = next(iter(values))
            result.setdefault('fieldSources', {})[field] = {'urls': values[result[field]], 'fetchedAt': fetched}
        elif values and (len(values) > 1 or result.get(field) not in values):
            conflicts[field] = values
    officers = result.setdefault('officers', [])
    seen = {text_key(p['name'] if isinstance(p['name'], str) else p['name'].get('en', '')) for p in officers}
    for page in pages:
        for person in page['officers']:
            key = text_key(person['name'])
            if key and key not in seen:
                officers.append(person)
                seen.add(key)
    result['lastFetched'] = fetched
    # Fetching is not verification; never set lastVerified here.
    return result, conflicts

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=ROOT / 'src/data/bd_missions.json')
    parser.add_argument('--apply', action='store_true', help='Back up and update main JSON; otherwise save a preview')
    parser.add_argument('--system-trust', action='store_true')
    parser.add_argument('--ca-bundle')
    parser.add_argument('--city', help='Process only this city, for a trial run')
    parser.add_argument('--max-pages', type=int, default=5)
    args = parser.parse_args()
    if args.max_pages < 1:
        parser.error('--max-pages must be positive')
    if args.system_trust:
        try:
            import truststore
            truststore.inject_into_ssl()
        except ImportError:
            parser.error('Run python -m pip install truststore first (Python 3.10+)')
    records = json.loads(args.data.read_text())
    selected = [i for i, r in enumerate(records) if not args.city or r['city'].casefold() == args.city.casefold()]
    if not selected:
        parser.error('No matching city')
    allowed = {urlparse(r.get('website') or '').hostname for r in records} - {None}
    fetch = Fetcher(allowed, args.ca_bundle)
    report = {'discoveryErrors': [], 'missions': []}
    discovered = {}
    try:
        html, url = fetch.get(DIRECTORY)
        discovered = discover(html, records)
    except (ValueError, requests.RequestException) as error:
        report['discoveryErrors'].append(str(error))
        print('Directory discovery:', error, flush=True)
    for i in selected:
        record = records[i]
        website = record.get('website') or discovered.get(i)
        entry = {'city': record['city'], 'name': record['name'], 'pages': [], 'errors': []}
        report['missions'].append(entry)
        if not website:
            entry['errors'].append('No official website discovered; add its confirmed website to this record and rerun.')
            print(record['city'], 'no official website found', flush=True)
            continue
        queue = [website]
        visited = set()
        while queue and len(visited) < args.max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)
            try:
                html, final_url = fetch.get(url)
                entry['pages'].append(contacts(html, final_url))
                for a in BeautifulSoup(html, 'html.parser').find_all('a', href=True):
                    link = urljoin(final_url, a['href']).split('#')[0]
                    label = a.get_text(' ', strip=True) + ' ' + link
                    if urlparse(link).hostname == urlparse(final_url).hostname and re.search(r'contact|officers-profile|যোগাযোগ', label, re.I) and link not in visited and link not in queue:
                        queue.append(link)
            except (ValueError, requests.RequestException) as error:
                entry['errors'].append({'url': url, 'error': str(error)})
        if entry['pages']:
            fetched = datetime.now(timezone.utc).isoformat()
            records[i], entry['conflicts'] = merge(record, entry['pages'], fetched)
            if not records[i].get('website'):
                records[i]['website'] = website
        print(record['city'], len(entry['pages']), 'pages;', len(entry['errors']), 'errors', flush=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    output = ROOT / 'scrape-output'
    output.mkdir(exist_ok=True)
    (output / f'report-{stamp}.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    preview = output / f'missions-{stamp}.json'
    preview.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    if args.apply:
        backup = output / f'backup-{stamp}.json'
        backup.write_bytes(args.data.read_bytes())
        temporary = args.data.with_suffix('.json.tmp')
        temporary.write_bytes(preview.read_bytes())
        temporary.replace(args.data)
        print('Updated:', args.data, '\nBackup:', backup)
    else:
        print('Preview:', preview, '\nUse --apply to update the main JSON.')
    print('Reports:', output)

if __name__ == '__main__':
    main()
