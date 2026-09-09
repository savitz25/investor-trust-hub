"""Profile Colorado Division of Securities enforcement/sanctions HTML. No PDF download. No attach."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "colorado" / "co-inv-001"
OUT = SRC / "enforcement-coverage.json"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def visible_text(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)
    html = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    html = re.sub(r"</(p|li|h[1-6]|div)>", "\n", html, flags=re.I)
    html = re.sub(r"<[^>]+>", " ", html)
    html = html.replace("&nbsp;", " ").replace("&amp;", "&")
    html = re.sub(r"[ \t]+", " ", html)
    html = re.sub(r"\n+", "\n", html)
    return html.strip()


def main() -> None:
    sanctions_html = (SRC / "sanctions-against-licensees.html").read_text(encoding="utf-8")
    actions_html = (SRC / "enforcement-actions.html").read_text(encoding="utf-8")
    sanctions_text = visible_text(sanctions_html)
    actions_text = visible_text(actions_html)
    crds = sorted(set(re.findall(r"\b(?:CRD|IARD)\s*#?\s*(\d{3,8})\b", sanctions_text, flags=re.I)))
    dated = re.findall(
        r"((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}):\s*([^.\n]{3,160})",
        sanctions_text,
    )
    named_entries = [{"date": d, "respondentText": name.strip()} for d, name in dated]
    name_only = [row for row in named_entries if not re.search(r"\b(?:CRD|IARD)\s*#?\s*\d", row["respondentText"], re.I)]
    coverage = {
        "ticket": "CO-INV-001",
        "retrievedAt": "2026-09-09",
        "sourceAsOf": None,
        "officialIndex": "https://securities.colorado.gov/enforcement-actions",
        "sanctionsUrl": "https://securities.colorado.gov/sanctions-against-licensees",
        "enforcementActions": {
            "http_status": 200,
            "bytes": len(actions_html.encode("utf-8")),
            "sha256": sha256_text(actions_html),
            "staticHtmlTables": 0,
            "coverage": "OPEN_HTML_INDEX / JS_RENDERED_TABLE_NOT_EXTRACTED",
            "note": "Drupal page announces an enforcement-action table. The table is not present in static HTML. Bulk rows were not extracted. PDFs were not downloaded.",
        },
        "sanctionsAgainstLicensees": {
            "http_status": 200,
            "bytes": len(sanctions_html.encode("utf-8")),
            "sha256": sha256_text(sanctions_html),
            "coverage": "NARRATIVE_INDEX_PROFILED_NOT_ATTACHED",
            "datedNarrativeEntries": len(named_entries),
            "entriesWithCrdInText": len(crds),
            "entriesNameOnly": len(name_only),
            "nativeCrdInHtml": crds,
            "sampleEntries": named_entries[:12],
            "note": "Official narrative list of sanctions against licensees. Dates and respondent names are present. Static HTML does not include CRD/IARD numbers. Name-only adverse attachment is UNSAFE. Complaint is not a violation. Allegation is not a final finding.",
        },
        "pdfsDownloaded": 0,
        "profileAttachments": 0,
        "identity": {
            "EXACT": "firm CRD/IARD, person CRD for person grain only, exact Colorado case/order/file ID",
            "UNSAFE": "name alone",
            "REVIEW_REQUIRED": "name + city, DBA, name variants",
            "auto_attach": False,
        },
    }
    OUT.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: coverage[k] for k in ("retrievedAt", "officialIndex")}, indent=2))
    print("dated", len(named_entries), "crds", crds, "name_only", len(name_only))
    for row in named_entries:
        print("-", row["date"], row["respondentText"][:120])


if __name__ == "__main__":
    main()
