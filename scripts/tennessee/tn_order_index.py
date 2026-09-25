"""TN-INV-001 — parse the Tennessee Securities Division order archive pages (standard library only).

Each archive page (Consent Orders, Cease and Desist Orders, Final Administrative Orders, Initial
Orders) lists orders under year headings. A top-level list item is one listing; nested items are
alternate copies of the same order (for example a signed scan beside an accessible "ADA" version).
The listing keeps its archive category exactly; it is never relabeled or merged across archives.
"""
from __future__ import annotations

import html
import re

BASE = "https://www.tn.gov"
ARCHIVES = {
    "consent-orders": "CONSENT_ORDER",
    "cease-and-desist-orders": "CEASE_AND_DESIST_ORDER",
    "final-administrative-orders": "FINAL_ADMINISTRATIVE_ORDER",
    "initial-orders": "INITIAL_ORDER",
}
PREFIX = {
    "CONSENT_ORDER": "co",
    "CEASE_AND_DESIST_ORDER": "cd",
    "FINAL_ADMINISTRATIVE_ORDER": "fao",
    "INITIAL_ORDER": "io",
}
MONTHS = {
    m: i
    for i, m in enumerate(
        ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1
    )
}
MONTHS.update({"jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12})
DATE = r"([A-Z][a-z]+\.?,?\s*\d{1,2}(?:st|nd|rd|th)?\s*[,.]?\s*\d{4})"


def text_of(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).replace("\xa0", " ").split())


def iso(date_text: str | None) -> str | None:
    if not date_text:
        return None
    m = re.search(r"([A-Za-z]+)\.?,?\s*(\d{1,2})(?:st|nd|rd|th)?\s*[,.]?\s*(\d{4})", date_text)
    if not m or m.group(1).lower() not in MONTHS:
        return None
    return f"{int(m.group(3))}-{MONTHS[m.group(1).lower()]:02d}-{int(m.group(2)):02d}"


def top_level_items(ul_body: str) -> list[str]:
    """Split the inner HTML of a <ul> into its top-level <li> blocks, keeping nested lists inside."""
    items, depth, start = [], 0, None
    for m in re.finditer(r"<(/?)(li|ul|ol)\b[^>]*>", ul_body, re.I):
        closing, tag = m.group(1) == "/", m.group(2).lower()
        if tag == "li" and not closing and depth == 0:
            start = m.start()
        if tag in ("ul", "ol"):
            depth += -1 if closing else 1
        if tag == "li" and closing and depth == 0 and start is not None:
            items.append(ul_body[start : m.end()])
            start = None
    return items


def top_level_lists(section: str) -> list[str]:
    """Inner HTML of each top-level <ul>/<ol> in a year section."""
    out, depth, start = [], 0, None
    for m in re.finditer(r"<(/?)(ul|ol)\b[^>]*>", section, re.I):
        if m.group(1) != "/":
            if depth == 0:
                start = m.end()
            depth += 1
        else:
            depth -= 1
            if depth == 0 and start is not None:
                out.append(section[start : m.start()])
    return out


def listing(li: str) -> dict | None:
    links = [
        (a.group(1), text_of(a.group(3)), html.unescape(a.group(2) or ""))
        for a in re.finditer(r'<a\b(?=[^>]*href="([^"]+)")(?:[^>]*title="([^"]*)")?[^>]*>(.*?)</a>', li, re.S | re.I)
    ]
    links = [(h, t, ttl) for h, t, ttl in links if not h.startswith("#")]
    if not links:
        return None
    first_block = re.split(r"<ul\b", li, maxsplit=1, flags=re.I)[0]
    # Adjacent links that split one word ("Lir" + "io LLC") are joined before reading text.
    first_text = text_of(re.sub(r"</a>\s*<a\b[^>]*>", "", first_block, flags=re.I))
    m = re.search(DATE, first_text)
    date_text = m.group(1) if m else None
    caption = first_text[: m.start()] if m else first_text
    caption = re.sub(r"\((?:ADA|ada)[^)]*\)", "", caption).strip(" -–,")
    docs, seen = [], set()
    for href, label, title in links:
        url = href if href.startswith("http") else BASE + href
        if url in seen:
            continue
        seen.add(url)
        low = f"{href} {label} {title}".lower()
        docs.append(
            {
                "url": url,
                "linkTextAsListed": label,
                "exParteInFileName": "ex parte" in low or "ex%20parte" in low,
                "petitionInFileName": "petition" in low,
            }
        )
    return {"captionAsListed": caption, "dateAsListed": date_text, "orderDate": iso(date_text), "documents": docs}


def parse_archive(name: str, article: str) -> list[dict]:
    category = ARCHIVES[name]
    heads = [(m.start(), m.end(), text_of(m.group(1))) for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", article, re.S | re.I)]
    if not heads:
        # A page without year headings (Initial Orders) is one section; the year comes from each date.
        heads = [(0, 0, "")]
    rows: list[dict] = []
    counters: dict[int, int] = {}
    for k, (_, end, head) in enumerate(heads):
        y = re.search(r"(?:19|20)\d\d", head)
        if head and not y:
            continue
        section = article[end : heads[k + 1][0] if k + 1 < len(heads) else len(article)]
        for ul in top_level_lists(section):
            for li in top_level_items(ul):
                row = listing(li)
                if row is None:
                    continue
                year = int(y.group(0)) if y else int((row["orderDate"] or "0000")[:4])
                counters[year] = counters.get(year, 0) + 1
                rows.append(
                    {
                        "id": f"tn-sd-{PREFIX[category]}-{year}-{counters[year]:03d}",
                        "archive": category,
                        "archivePage": name,
                        "yearHeading": head.strip() or None,
                        "sourceYear": year,
                        **row,
                        "dateYearDiffersFromHeading": bool(row["orderDate"] and int(row["orderDate"][:4]) != year),
                    }
                )
    return rows
