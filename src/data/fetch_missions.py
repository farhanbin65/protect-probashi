
import requests
import json
from bs4 import BeautifulSoup
from pathlib import Path

URL = "https://mofa.gov.bd/pages/static-pages/6940329e35ce18e1c055f712"

headers = {
    "User-Agent": "Mozilla/5.0 ProtectProbashi/1.0"
}

response = requests.get(
    URL,
    headers=headers,
    timeout=30
)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

missions = []
seen = set()

for table in soup.find_all("table"):
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])

        if len(cells) < 3:
            continue

        number = cells[0].get_text(" ", strip=True)

        if not number.isdigit():
            continue

        location = cells[1].get_text(" ", strip=True)
        name = cells[2].get_text(" ", strip=True)

        if not location or not name:
            continue

        if (location, name) in seen:
            continue

        seen.add((location, name))

        country = location.split("(")[0].strip()

        city = None
        if "(" in location and ")" in location:
            city = location.split("(", 1)[1].split(")", 1)[0]

        missions.append({
            "name": name,
            "country": country,
            "city": city,
            "location": location,
            "address": None,
            "phone": None,
            "email": None,
            "website": None,
            "lat": None,
            "lon": None,
            "source": URL,
            "verified": False
        })

output = Path(__file__).parent / "bd_missions.json"

with open(output, "w", encoding="utf-8") as f:
    json.dump(missions, f, ensure_ascii=False, indent=2)

print(f"Saved {len(missions)} missions")
print(f"Output: {output}")
