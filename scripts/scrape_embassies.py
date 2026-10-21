"""Collect review candidates from explicitly supplied official mission pages.
Never overwrites application data. See scripts/README.md for the review process.
"""
import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

AGENT = "ProtectProbashiDirectory/1.0"

def official(url):
    host = (urlparse(url).hostname or "").lower()
    return urlparse(url).scheme == "https" and (host == "mofa.gov.bd" or host.endswith(".mofa.gov.bd"))

def extract(html, url):
    soup = BeautifulSoup(html, "html.parser")
    root = soup.find("main") or soup
    for node in root.select("script, style, nav, footer, header"):
        node.decompose()
    text = root.get_text(" ", strip=True)
    emails = sorted(set(re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)))
    phones = sorted(set(a.get("href", "")[4:].strip() for a in root.select('a[href^="tel:"]')))
    officers = []
    # MOFA templates vary. Only interpret rows whose headers identify each field.
    for table in root.find_all("table"):
        headers = []
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"], recursive=False)
            values = [cell.get_text(" ", strip=True) for cell in cells]
            if any("name" in v.lower() or "নাম" in v for v in values) and any("designation" in v.lower() or "পদবি" in v for v in values):
                headers = [v.lower() for v in values]
                continue
            if not headers or len(cells) != len(headers):
                continue
            person = {"sourceUrl": url}
            for heading, cell, value in zip(headers, cells, values):
                for field, words in {"name": ["name", "নাম"], "designation": ["designation", "পদবি"], "email": ["email", "ইমেইল"], "phone": ["phone", "mobile", "ফোন", "মোবাইল"]}.items():
                    if any(word in heading for word in words):
                        person[field] = value
                image = cell.find("img")
                if image:
                    image_url = urljoin(url, image.get("src", ""))
                    if urlparse(image_url).scheme == "https":
                        person["imageUrl"] = image_url
            if person.get("name"):
                officers.append(person)
    return {"sourceUrl": url, "emailCandidates": emails, "phoneCandidates": phones,
            "officers": officers, "pageText": text[:30000]}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, default=Path("embassy-review.json"))
    parser.add_argument("--ca-bundle", type=Path, help="Trusted CA certificate bundle in PEM format")
    parser.add_argument("--system-trust", action="store_true", help="Use operating-system certificate verification (requires truststore and Python 3.10+)")
    args = parser.parse_args()
    if args.system_trust:
        try:
            import truststore
        except ImportError:
            parser.error("Install system trust support with: python -m pip install truststore (Python 3.10+ required)")
        truststore.inject_into_ssl()
    if args.ca_bundle and not args.ca_bundle.is_file():
        parser.error("CA bundle file does not exist")
    if args.output.exists():
        parser.error("Output already exists; choose a new filename to preserve prior results.")
    manifest = json.loads(args.manifest.read_text())
    session = requests.Session()
    session.headers["User-Agent"] = AGENT
    if args.ca_bundle:
        session.verify = str(args.ca_bundle.resolve())
    results = []
    robots = {}
    for mission in manifest:
        result = {"id": mission["id"], "fetchedAt": datetime.now(timezone.utc).isoformat(), "pages": [], "errors": []}
        for url in mission["urls"]:
            try:
                if not official(url):
                    raise ValueError("Only HTTPS mofa.gov.bd pages are allowed")
                origin = f"https://{urlparse(url).netloc}"
                if origin not in robots:
                    response = session.get(origin + "/robots.txt", timeout=25, allow_redirects=False)
                    robot = RobotFileParser()
                    if response.status_code == 404:
                        robot.parse([])
                    else:
                        response.raise_for_status()
                        if response.is_redirect:
                            raise ValueError("robots.txt redirected; inspect manually")
                        robot.parse(response.text.splitlines())
                    robots[origin] = robot
                if not robots[origin].can_fetch(AGENT, url):
                    raise ValueError("robots.txt disallows fetching this page")
                response = session.get(url, timeout=30, allow_redirects=False)
                response.raise_for_status()
                if response.is_redirect:
                    raise ValueError("Page redirected; update manifest to the official final URL")
                result["pages"].append(extract(response.text, url))
            except (requests.RequestException, ValueError) as error:
                result["errors"].append({"url": url, "error": str(error)})
                print(f"Failed {url}: {error}")
                if isinstance(error, requests.exceptions.SSLError):
                    print("Certificate verification failed. Try --system-trust with truststore installed, or supply a trusted PEM file with --ca-bundle. TLS verification remains enabled.")
            time.sleep(1.5)
        results.append(result)
        print(result["id"], len(result["pages"]), "pages;", len(result["errors"]), "errors")
    args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")

if __name__ == "__main__":
    main()
