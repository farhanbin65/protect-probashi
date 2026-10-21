"""Office-scoped host-government cross-checks; countrywide lists remain review-only."""
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

HOST_PROTOCOL_DIRECTORIES = {
    'Australia': 'https://protocol.dfat.gov.au/Public/Missions/20',
    'New Zealand': 'https://www.mfat.govt.nz/en/countries-and-regions/asia/bangladesh/high-commission-for-the-peoples-republic-of-bangladesh',
    'United Kingdom': 'https://www.gov.uk/government/publications/foreign-embassies-in-the-uk',
    'USA': 'https://www.state.gov/protocol/c56129',
}


def scoped_fields(html, country, city):
    soup = BeautifulSoup(html, 'html.parser')
    root = soup.find('main') or soup
    text = root.get_text('\n', strip=True)
    fields = {}
    if country == 'New Zealand' and city == 'Wellington':
        # Do not mix the honorary consulate with the High Commission.
        text = text.split('Other consular contacts')[0]
        match = re.search(r'Physical address\s+(.+?)(?=\bTel\b|\bEmail\b|\bWebsite\b)', text, re.S)
        if match:
            fields['address'] = ' '.join(match[1].split())
        match = re.search(r'\bTel\s+([+\d ()-]+)', text)
        if match:
            fields['phone'] = re.sub(r'[ ()-]', '', match[1]).strip()
        match = re.search(r'\bEmail\s+([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})', text)
        if match:
            fields['email'] = match[1]
    elif country == 'Australia' and city == 'Canberra':
        match = re.search(r'Chancery\s+(?:Details\s+)?(.+?)(?=\bEmail Address\b|\bWeb Site\b|\bPhone\b)', text, re.S)
        if match:
            value = ' '.join(match[1].split())
            if 15 < len(value) < 300:
                fields['address'] = value
    return fields


def london_document_fields(raw):
    import io
    import zipfile
    from xml.etree import ElementTree as ET
    root = ET.fromstring(zipfile.ZipFile(io.BytesIO(raw)).read('content.xml'))
    ns = '{urn:oasis:names:tc:opendocument:xmlns:text:1.0}'
    lines = [''.join(n.itertext()).strip() for n in root.iter() if n.tag in (ns + 'p', ns + 'h')]
    starts = [i for i, line in enumerate(lines) if line == 'BANGLADESH']
    if len(starts) != 1:
        return {}
    block = []
    for line in lines[starts[0]+1:]:
        if line.startswith('Hours') or (line.isupper() and len(line) > 2):
            break
        if line:
            block.append(line)
        if len(block) > 12:
            return {}
    if not any('High Commission' in line for line in block):
        return {}
    fields = {}
    for line in block:
        if re.search(r'\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b', line):
            fields['address'] = line
        if line.startswith('Phone:'):
            phone = re.sub(r'\s', '', line.split(':', 1)[1])
            if re.fullmatch(r'0\d{10}', phone):
                fields['phone'] = '+44' + phone[1:]
        if line.startswith('Email:'):
            emails = re.findall(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', line)
            mission = [email for email in emails if email.startswith('mission.') and email.endswith('@mofa.gov.bd')]
            if len(mission) == 1:
                fields['email'] = mission[0]
    return fields


def crosscheck(records, selected, fetch, fetched):
    report = []
    for country, url in HOST_PROTOCOL_DIRECTORIES.items():
        targets = [i for i in selected if records[i]['country'] == country and any(not records[i].get(k) for k in ('phone', 'email', 'address'))]
        if not targets:
            continue
        entry = {'country': country, 'sourceUrl': url, 'missions': [], 'fetchedAt': fetched}
        report.append(entry)
        try:
            html, final_url = fetch.get(url)
            entry['sourceUrl'] = final_url
            entry['documents'] = [urljoin(final_url, a['href']) for a in BeautifulSoup(html, 'html.parser').find_all('a', href=True) if re.search(r'diplomatic|consular offices', a.get_text(' ', strip=True), re.I)]
            london_values = {}
            london_source = final_url
            if country == 'United Kingdom' and any(records[i]['city'] == 'London' for i in targets):
                documents = [u for u in entry['documents'] if 'LONDON_DIPLOMATIC_LIST' in u.upper() and u.lower().endswith('.odt')]
                if len(set(documents)) == 1:
                    try:
                        raw, london_source = fetch.get(documents[0], binary=True)
                        london_values = london_document_fields(raw)
                    except Exception as error:
                        entry['documentError'] = str(error)
            for i in targets:
                record = records[i]
                values = london_values if country == 'United Kingdom' and record['city'] == 'London' else scoped_fields(html, country, record['city'])
                field_url = london_source if country == 'United Kingdom' and record['city'] == 'London' else final_url
                review = {'city': record['city'], 'filled': [], 'conflicts': {}}
                entry['missions'].append(review)
                if not values:
                    review['status'] = 'Office-specific document review required; countrywide contacts are not promoted.'
                for field, value in values.items():
                    source = {'urls': [field_url], 'fetchedAt': fetched, 'verified': False, 'sourceType': 'hostProtocol'}
                    if not record.get(field):
                        record[field] = value
                        record.setdefault('fieldSources', {})[field] = source
                        review['filled'].append(field)
                    elif record[field] != value:
                        review['conflicts'][field] = {'existing': record[field], 'candidate': value}
                    else:
                        record.setdefault('protocolCorroboration', {})[field] = source
        except Exception as error:
            entry['error'] = str(error)
    return report

if __name__ == '__main__':
    import argparse
    import json
    from pathlib import Path
    from datetime import datetime, timezone
    from urllib.parse import urlparse
    from sync_embassies import Fetcher, ROOT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--system-trust', action='store_true')
    args = parser.parse_args()
    if args.system_trust:
        import truststore
        truststore.inject_into_ssl()
    path = ROOT / 'src/data/bd_missions.json'
    records = json.loads(path.read_text())
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    report = crosscheck(records, range(len(records)), Fetcher({urlparse(u).hostname for u in HOST_PROTOCOL_DIRECTORIES.values()} | {'assets.publishing.service.gov.uk'}), datetime.now(timezone.utc).isoformat())
    output = ROOT / 'scrape-output'
    output.mkdir(exist_ok=True)
    (output / f'protocol-report-{stamp}.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    preview = output / f'protocol-preview-{stamp}.json'
    preview.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    if args.apply:
        (output / f'protocol-backup-{stamp}.json').write_bytes(path.read_bytes())
        temporary = path.with_suffix('.json.tmp')
        temporary.write_bytes(preview.read_bytes())
        temporary.replace(path)
    print(json.dumps(report, ensure_ascii=False, indent=2))
