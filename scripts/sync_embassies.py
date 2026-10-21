"""Discover official mission sites and fill missing directory fields, with backups."""
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
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
    value = re.sub(r'\s*\((?:office|consular|telephone)\)\s*$', '', value.strip(), flags=re.I)
    # Abbreviated ranges and mixed international/trunk prefixes need review.
    if re.search(r'\d{4,}\s*[-–—]\s*\d{1,2}\s*$', value) or re.match(r'^\+\(\d+[- ]0', value):
        return None
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

    def get(self, url, depth=0, binary=False):
        if not self.valid(url):
            raise ValueError('URL is outside official/explicitly trusted hosts')
        cache_key = (url, binary)
        if cache_key in self.cache:
            return self.cache[cache_key]
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
            return self.get(urljoin(url, response.headers['Location']), depth + 1, binary=binary)
        if not binary and 'html' not in response.headers.get('Content-Type', '').lower():
            raise ValueError('Not an HTML page')
        self.cache[cache_key] = (response.content if binary else response.text, url)
        return self.cache[cache_key]

def discover(html, records, officer_pages=False):
    """Match a directory row to exactly one office; never guess domain names."""
    found = {}
    for row in BeautifulSoup(html, 'html.parser').find_all('tr'):
        text = row.get_text(' ', strip=True)
        matches = [i for i, record in enumerate(records) if text_key(record['name']) in text_key(text)]
        if not matches:
            cells = [text_key(cell.get_text(' ', strip=True)) for cell in row.find_all('td')]
            matches = [i for i, record in enumerate(records) if record.get('location') and text_key(record['location']) in cells]
        if len(matches) != 1:
            continue
        urls = {a.get('href', '') for a in row.find_all('a', href=True)}
        urls = {urlparse(u)._replace(scheme='https').geturl() for u in urls
                if urlparse(u).scheme in ('http', 'https')
                and not urlparse(u).username and not urlparse(u).password
                and (urlparse(u).hostname or '').endswith('.mofa.gov.bd')}
        hosts = {urlparse(u).hostname for u in urls}
        if len(hosts) == 1:
            officers = sorted(u for u in urls if '/pages/officers-profile' in urlparse(u).path)
            if officer_pages:
                if len(officers) == 1:
                    found[matches[0]] = officers[0]
            else:
                found[matches[0]] = f'https://{next(iter(hosts))}/'
    return found

def page_priority(url, label=''):
    path = urlparse(url).path
    if path in ('', '/'):
        return 200
    text = path + ' ' + label
    if re.search(r'honorary|bank|deposit|fees|outsourc', text, re.I):
        return -10
    for pattern, score in [(r'contact|address|location|যোগাযোগ|ঠিকানা', 100),
                           (r'consul|visa|passport|কনস্যুলার', 70),
                           (r'about|mission|পরিচিতি', 40)]:
        if re.search(pattern, text, re.I):
            return score
    return 20 if path.rstrip('/').endswith('officers-profile') else 10


def email_score(email):
    local = email.split('@')[0].lower()
    for pattern, score in [(r'^mission(?:[._-]|$)', 100),
                           (r'^(?:info|embassy|office|contact)(?:[._-]|$)', 90),
                           (r'^consular(?:[._-]|$)', 80),
                           (r'^(?:hoc|ambassador|hc)(?:[._-]|$)', 30)]:
        if re.search(pattern, local):
            return score
    return -50


def pick_office_email(emails):
    ranked = sorted(set(emails), key=lambda e: (-email_score(e), e))
    if not ranked or email_score(ranked[0]) < 70:
        return None
    if len(ranked) > 1 and email_score(ranked[0]) == email_score(ranked[1]):
        return None
    return ranked[0]


POSTAL = re.compile(r'\b(?:[A-Z]\d[A-Z]\s?\d[A-Z]\d|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}|\d{4,6}(?:[- ]?[A-Z]{2})?)\b', re.I)
STREET = re.compile(r'\b(?:street|st\.?|road|rd\.?|avenue|ave|circuit|crescent|drive|lane|boulevard|terrace|suite|tower|পথ|রোড|সড়ক)\b', re.I)

def contacts(html, url, country=None):
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
    for i, line in enumerate(lines):
        if re.fullmatch(r'(?:postal |office |physical )?address[:：]?|ঠিকানা[:：]?', line, re.I):
            parts = []
            for following in lines[i+1:i+11]:
                if re.match(r'contact|phone|tel|fax|email|web|office hours|যোগাযোগ', following, re.I):
                    break
                parts.append(following)
                if country and country.casefold() in following.casefold():
                    break
            value = ' '.join(parts)
            if 15 < len(value) < 350 and country and country.casefold() in value.casefold() and not EMAIL.search(value):
                candidates['address'].add(value)
    office_emails = set(EMAIL.findall(soup.get_text(' ', strip=True)))
    best_email = pick_office_email(office_emails | candidates['email'] | {e for e in result['emailCandidates'] if email_score(e) >= 80})
    candidates['email'] = {best_email} if best_email else set()
    result['officeEmailCandidates'] = sorted(office_emails)
    # Keep broad unlabelled address matches for review unless their block has
    # both a postal/street signature and an office/address context.
    address_review = set()
    for block in soup.find_all(['p', 'td', 'address']):
        value = block.get_text(' ', strip=True)
        if not 15 < len(value) < 350 or EMAIL.search(value) or re.search(r'phone|telephone|fax|©', value, re.I):
            continue
        if POSTAL.search(value) and STREET.search(value):
            address_review.add(value)
            if re.search(r'address|chancery|ঠিকানা', value, re.I) or (country and country.casefold() in value.casefold()):
                candidates['address'].add(value)
    result['addressCandidates'] = sorted(address_review)
    # Contact pages often use an Address heading followed by a paragraph.
    for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'th']):
        if re.fullmatch(r'(?:postal\s+)?address|ঠিকানা', heading.get_text(' ', strip=True).strip(' :：'), re.I):
            block = heading.find_next_sibling()
            if block and block.name in ['p', 'div', 'td', 'ul']:
                value = block.get_text(' ', strip=True)
                if 15 < len(value) < 500 and not EMAIL.search(value) and not re.search(r'phone|telephone|whatsapp', value, re.I):
                    candidates['address'].add(value)
    for cell in soup.find_all(['td', 'th']):
        if re.fullmatch(r'(?:postal |office |physical )?address[:：]?|ঠিকানা[:：]?', cell.get_text(' ', strip=True), re.I):
            sibling = cell.find_next_sibling(['td', 'th'])
            if sibling:
                value = sibling.get_text(' ', strip=True)
                if 15 < len(value) < 350 and not EMAIL.search(value):
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
    title = result['pageText'].split('|', 1)[0]
    if re.search(r'honorary|bank|deposit|fees|outsourc', title, re.I):
        result['scopeWarning'] = 'Other office or financial-service page; office contacts withheld for review'
        candidates = {key: set() for key in candidates}
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
        if field == 'email' and len(values) > 1:
            best = pick_office_email(values)
            if best:
                values = {best: values[best]}
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
    # A fallback is explicitly labelled as an individual's contact in the app.
    if not result.get('phone') and not result.get('email'):
        for person in officers:
            title = person.get('designation', '')
            title = title.get('en', '') if isinstance(title, dict) else title
            if not re.fullmatch(r'(?:H\.?E\.?\s+)?(?:Ambassador|High Commissioner)', title.strip(), re.I):
                continue
            for field in ('phone', 'email'):
                value = person.get(field)
                valid = normalize_phone(value or '') if field == 'phone' else (value if EMAIL.fullmatch(value or '') else None)
                if valid:
                    result[field] = valid
                    result[field + 'Note'] = {'en': 'Head of mission contact (individual), used because office contacts are unavailable. Unverified.', 'bn': 'অফিসের যোগাযোগ না থাকায় মিশন প্রধানের ব্যক্তিগত যোগাযোগ দেখানো হচ্ছে। যাচাই করা হয়নি।'}
                    result.setdefault('fieldSources', {})[field] = {'urls': [person.get('sourceUrl')], 'fetchedAt': fetched, 'contactType': 'headOfMission', 'verified': False}
            if result.get('phone') or result.get('email'):
                break
    if not result.get('verified'):

        result['verified'] = False
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
    parser.add_argument('--workers', type=int, default=4, help='Parallel mission sites (1–8); each host remains rate limited')
    args = parser.parse_args()
    if not 1 <= args.workers <= 8:
        parser.error('--workers must be between 1 and 8')
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
    officer_pages = {}
    try:
        html, url = fetch.get(DIRECTORY)
        discovered = discover(html, records)
        officer_pages = discover(html, records, officer_pages=True)
    except (ValueError, requests.RequestException) as error:
        report['discoveryErrors'].append(str(error))
        print('Directory discovery:', error, flush=True)
    site_fetchers = {}
    site_locks = {}
    for i in selected:
        host = urlparse(records[i].get('website') or discovered.get(i) or '').hostname
        site_fetchers.setdefault(host, Fetcher(allowed, args.ca_bundle))
        site_locks.setdefault(host, Lock())

    def collect(i):
        host = urlparse(records[i].get('website') or discovered.get(i) or '').hostname
        with site_locks[host]:
            return collect_site(i, site_fetchers[host])

    def collect_site(i, fetch):
        record = records[i]
        website = record.get('website') or discovered.get(i)
        entry = {'city': record['city'], 'name': record['name'], 'pages': [], 'errors': []}
        if not website:
            entry['errors'].append('No official website discovered; add its confirmed website to this record and rerun.')
            print(record['city'], 'no official website found', flush=True)
            return entry
        if not record.get('website') and i in discovered:
            record['website'] = website
            record.setdefault('fieldSources', {})['website'] = {'urls': [DIRECTORY], 'fetchedAt': datetime.now(timezone.utc).isoformat()}
        # The master index links directly to staff pages; collect these even
        # when the mission homepage fails or has no discoverable navigation.
        queue = list(dict.fromkeys([officer_pages.get(i), website]))
        queue = [url for url in queue if url]
        visited = set()
        labels = {}
        while queue and len(visited) < args.max_pages:
            queue.sort(key=lambda u: -page_priority(u, labels.get(u, '')))
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)
            try:
                html, final_url = fetch.get(url)
                entry['pages'].append(contacts(html, final_url, record.get('country')))
                for a in BeautifulSoup(html, 'html.parser').find_all('a', href=True):
                    link = urljoin(final_url, a['href']).split('#')[0]
                    label = a.get_text(' ', strip=True) + ' ' + link
                    if urlparse(link).hostname == urlparse(final_url).hostname and re.search(r'contact|address|location|consul|visa|passport|about|officers-profile|যোগাযোগ|ঠিকানা', label, re.I) and link not in visited and link not in queue:
                        labels[link] = a.get_text(' ', strip=True)
                        queue.append(link)
            except (ValueError, requests.RequestException) as error:
                entry['errors'].append({'url': url, 'error': str(error)})
        if entry['pages']:
            fetched = datetime.now(timezone.utc).isoformat()
            records[i], entry['conflicts'] = merge(record, entry['pages'], fetched)
            if not records[i].get('website'):
                records[i]['website'] = website
        print(record['city'], len(entry['pages']), 'pages;', len(entry['errors']), 'errors', flush=True)
        return entry

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        report['missions'] = list(pool.map(collect, selected))
    from protocol_sources import HOST_PROTOCOL_DIRECTORIES, crosscheck
    protocol_fetch = Fetcher({urlparse(u).hostname for u in HOST_PROTOCOL_DIRECTORIES.values()} | {'assets.publishing.service.gov.uk'}, args.ca_bundle)
    report['protocolChecks'] = crosscheck(records, selected, protocol_fetch, datetime.now(timezone.utc).isoformat())
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
