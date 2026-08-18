from __future__ import annotations

import re
from datetime import date
from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from ith_ingestion.errors import IngestionError
from ith_ingestion.sec_adv import CATALOG_URL, DATASET_ERA, DATASET_RIA
from ith_ingestion.sec_adv.models import DiscoveredFile

# SEC returns 403 to generic library user-agents. Use a normal browser UA.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

FILENAME_DATE_RE = re.compile(
    r"ia(\d{2})(\d{2})(\d{2,4})(?:-exempt)?",
    re.IGNORECASE,
)
MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self._href = href
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href is not None:
            self.links.append((self._href, "".join(self._text).strip()))
            self._href = None
            self._text = []


def fetch_catalog_html(url: str = CATALOG_URL) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.sec.gov/",
        },
    )
    with urlopen(request, timeout=60) as response:  # noqa: S310 - official SEC URL
        return response.read().decode("utf-8", errors="replace")


def parse_filename_date(filename: str) -> date | None:
    match = FILENAME_DATE_RE.search(filename)
    if not match:
        return None
    month, day, year = match.groups()
    year_i = int(year)
    if year_i < 100:
        year_i += 2000
    try:
        return date(year_i, int(month), int(day))
    except ValueError:
        return None


def _kind_from_title(title: str) -> str | None:
    lowered = title.lower()
    if "exempt" in lowered:
        return "era"
    if "registered investment adviser" in lowered:
        return "ria"
    return None


def discover_latest_from_html(html: str, base_url: str = CATALOG_URL) -> dict[str, DiscoveredFile]:
    parser = _LinkParser()
    parser.feed(html)
    found: dict[str, list[DiscoveredFile]] = {"ria": [], "era": []}
    for href, title in parser.links:
        if not href.lower().endswith(".zip"):
            continue
        kind = _kind_from_title(title)
        if kind is None:
            continue
        filename = href.rsplit("/", 1)[-1]
        published = parse_filename_date(filename)
        if published is None:
            continue
        dataset_id = DATASET_RIA if kind == "ria" else DATASET_ERA
        found[kind].append(
            DiscoveredFile(
                dataset_kind=kind,  # type: ignore[arg-type]
                dataset_id=dataset_id,
                title=title,
                url=urljoin(base_url, href),
                filename=filename,
                published_on=published,
                release_label=published.isoformat(),
            )
        )
    latest: dict[str, DiscoveredFile] = {}
    for kind, items in found.items():
        if not items:
            raise IngestionError(f"no official {kind.upper()} zip listed on {base_url}")
        latest[kind] = max(items, key=lambda item: item.published_on)
    return latest


def discover_latest(url: str = CATALOG_URL) -> dict[str, DiscoveredFile]:
    return discover_latest_from_html(fetch_catalog_html(url), url)
