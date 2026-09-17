import json
import re
from collections import Counter
from pathlib import Path

src = Path(r"C:\Users\Michael.Savitsky\investor-pa-inv-001\data\pennsylvania\pa-inv-001\dobs-enforcement-catalog.json")
cat = json.loads(src.read_text(encoding="utf-8"))
rows = cat["rows"]

def filename(row):
    return (row.get("title") or "").lower()

doc_types = Counter()
for r in rows:
    t = filename(r)
    if "osc" in t or "order to show cause" in t:
        doc_types["order_to_show_cause"] += 1
    elif "final order" in t:
        doc_types["final_order"] += 1
    elif "denial" in t:
        doc_types["denial"] += 1
    elif "revocation" in t:
        doc_types["revocation"] += 1
    elif "suspension" in t or "suspend" in t:
        doc_types["suspension"] += 1
    elif "settlement" in t:
        doc_types["settlement"] += 1
    elif "cao" in t or "consent" in t:
        doc_types["consent_agreement_and_order"] += 1
    else:
        doc_types["other_or_unlabeled"] += 1

years = Counter()
for r in rows:
    y = r.get("issueYear")
    if isinstance(y, list) and y:
        years[str(y[0])] += 1
    else:
        years[""] += 1

summary = {
    "source": cat["source"],
    "officialUrl": cat["officialUrl"],
    "searchHub": cat["searchHub"],
    "retrievedAt": cat["retrievedAt"],
    "PA_DOBS_ENFORCEMENT_CATALOG_STATUS": "ACQUIRED_CURRENT_SNAPSHOT",
    "PA_DOBS_ALL_ORDER_DOCUMENTS_AUDITED": cat["rowsHarvested"],
    "PA_DOBS_SECURITIES_ORDER_DOCUMENTS": None,
    "PA_DOBS_SECURITIES_UNIQUE_MATTERS": None,
    "PA_DOBS_IA_EXACT_CLASS_DOCUMENTS": None,
    "PA_DOBS_IAR_EXACT_CLASS_DOCUMENTS": None,
    "PA_DOBS_BD_EXACT_CLASS_DOCUMENTS": None,
    "PA_DOBS_OTHER_SECURITIES_DOCUMENTS": None,
    "PA_DOBS_EXACT_CRD_DOCUMENTS": 0,
    "PA_DOBS_EXACT_CRD_ATTACHMENTS": 0,
    "PA_DOBS_NAME_ONLY_ROWS": cat["rowsHarvested"],
    "PA_DOBS_REVIEW_REQUIRED": 0,
    "catalogHasSourceNativeSecuritiesFacet": False,
    "catalogHasDocketField": False,
    "mixedUniverseNotIaCensus": True,
    "doNotKeywordGuessIaCensus": True,
    "pdfsDownloaded": 0,
    "documentTypeFromFilename": dict(doc_types),
    "yearCounts": dict(sorted(years.items())),
    "note": "Coveo hub DOBS-Enforcement Orders returned 1,525 PDF documents. Metadata does not include docket number, industry/program, or CRD. The catalog mixes banking, mortgage, and securities. Securities-only and IA-only counts remain UNKNOWN, not zero. Filename tokens are not a source-native securities class. Unique matter identity was not invented. No PDFs downloaded. No name-only CRD attachments.",
}
out = Path(r"C:\Users\Michael.Savitsky\investor-pa-inv-001\data\pennsylvania\pa-inv-001\dobs-enforcement-coverage.json")
out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
