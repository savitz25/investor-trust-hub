"""MN-INV-001 — Minnesota Commerce CARDS securities enforcement index.

Source: Minnesota Department of Commerce, CARDS (Commerce Actions and Regulatory Documents Search),
https://cards.web.commerce.state.mn.us/enforcement-actions, one public search:
Industry type = Securities, Signed from 2022-01-01, Signed to 2026-09-26. The site answers a plain HTTP client
with 403, so the search was run once in a normal Chrome session (no challenge was shown or bypassed) and the
rendered result table was read. 43 rows; the result list ended without a "Load more" control.

Input (gitignored): data/raw/minnesota/mn-inv-001/cards-rows.json — each rendered row as printed:
[document, industry type, respondent, signed date, action type, penalty, allegation, city, state, zip, document GUID].
Multi-line allegation cells are joined with " || ". ZIP codes are dropped from the committed output.

Order documents: 42 of the 43 linked PDFs carry image objects and no font resources (scanned orders with no text
layer); printed CRD / SEC numbers inside them would need OCR and were not read. Only identifiers printed in the
CARDS index row itself are used. Attachment is by exact firm CRD against the accepted IAPD compilation only.
"""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "minnesota" / "mn-inv-001" / "cards-rows.json"
OUT = ROOT / "data" / "minnesota" / "mn-inv-001" / "cards-securities-index.json"
CRDS = ROOT / "data" / "minnesota" / "mn-inv-001" / "iapd-mn-firm-crds.json"
SEARCH = "https://cards.web.commerce.state.mn.us/enforcement-actions?doSearch=true&industry=Securities&signedFromDate=2022-01-01&signedToDate=2026-09-26"
DOC = "https://cards.web.commerce.state.mn.us/documents/{{{guid}}}/download"
RETRIEVED_AT = "2026-09-26T15:14:12Z"

# Rows Commerce filed under the Securities industry type whose printed allegation names another program the Securities
# Unit administers (subdivided land and timeshares, Minn. Stat. ch. 83) or a lending licence. Kept, labelled, and
# excluded from the securities-scope headline.
NON_SECURITIES_SCOPE = {
    "260868-A": "subdivided land (Minn. Stat. 83.23)",
    "273332-A": "timeshare (subdivided land and timeshare program)",
    "491270-A": "regulated lender licence",
}

# In-browser measurement of each linked order PDF (bytes, image objects, font resources), same row order as the table.
DOC_MEASURE = [
    (168777, 19, 0), (166626, 19, 0), (126460, 16, 0), (110367, 15, 0), (126650, 17, 0), (336726, 32, 0), (90885, 8, 0),
    (101591, 10, 0), (100264, 10, 0), (103561, 15, 0), (240768, 19, 0), (220679, 23, 0), (255646, 38, 0), (176140, 19, 0),
    (94310, 16, 0), (112109, 16, 0), (228137, 39, 0), (94936, 16, 0), (399165, 40, 0), (106597, 13, 0), (282397, 23, 0),
    (32649, 2, 0), (98281, 12, 0), (222063, 72, 0), (150172, 9, 0), (150614, 7, 0), (370558, 15, 0), (255490, 11, 0),
    (255572, 11, 0), (4898052, 17, 0), (262611, 21, 0), (1152242, 9, 0), (3998392, 21, 0), (105230, 13, 0), (104503, 12, 0),
    (81227, 8, 0), (122125, 10, 0), (112394, 8, 0), (174938, 6, 0), (304935, 8, 0), (952153, 23, 15), (117307, 10, 0),
    (84689, 11, 0),
]

CRD_RE = re.compile(r"\bCRD\s*(?:no\.?|number|#)?\s*(\d{3,8})\b", re.I)
SEC_RE = re.compile(r"\b(801-\d{3,6}|802-\d{3,6}|8-\d{3,6})\b")


def iso(mdy: str) -> str:
    m, d, y = mdy.split("/")
    return f"{y}-{int(m):02d}-{int(d):02d}"


def main() -> None:
    rows = json.loads(RAW.read_text(encoding="utf-8"))
    if len(rows) != 43 or len(DOC_MEASURE) != 43:
        raise SystemExit("expected the 43-row CARDS result")
    crds = json.loads(CRDS.read_text(encoding="utf-8"))
    iapd_firms = set()
    for k in ("state_ia_approved", "state_ia_current", "state_era_active", "notice_filed", "principal_office_sec_feed"):
        iapd_firms |= {str(x) for x in crds[k]}
    actions = []
    for i, r in enumerate(rows):
        doc, industry, respondent, signed, atype, penalty, allegation, city, st, _zip, guid = r
        if industry != "Securities":
            raise SystemExit(f"{doc} is not Securities industry type")
        crd_printed = CRD_RE.findall(allegation)
        sec_printed = SEC_RE.findall(allegation)
        b, imgs, fonts = DOC_MEASURE[i]
        actions.append({
            "document": doc,
            "industryType": industry,
            "respondentAsListed": respondent,
            "signedDate": iso(signed),
            "actionTypeAsListed": atype,
            "consentInActionType": bool(re.search(r"consent", atype, re.I)),
            "penaltyAsListed": penalty,
            "allegationAsListed": allegation,
            "cityAsListed": city,
            "stateAsListed": st,
            "scope": "securities" if doc not in NON_SECURITIES_SCOPE else "other_securities_unit_program",
            "scopeNote": NON_SECURITIES_SCOPE.get(doc),
            "documentUrl": DOC.format(guid=guid),
            "orderDocument": {"bytes": b, "imageObjects": imgs, "fontResources": fonts, "textLayer": fonts > 0, "read": False},
            "crdPrintedInIndex": crd_printed,
            "secNumbersPrintedInIndex": sec_printed,
            "exactFirmCrdLinks": [c for c in crd_printed if c in iapd_firms],
            "crdPrintedNotIapdFirm": [c for c in crd_printed if c not in iapd_firms],
            "attribution": "exact_firm_crd" if any(c in iapd_firms for c in crd_printed) else ("printed_crd_not_iapd_firm" if crd_printed else "standalone_no_identifier"),
        })
    sec_scope = [a for a in actions if a["scope"] == "securities"]
    out = {
        "version": "investor-mn-cards-securities-index-v1",
        "source": "Minnesota Department of Commerce — CARDS (Commerce Actions and Regulatory Documents Search)",
        "searchUrl": SEARCH,
        "search": {"industryType": "Securities", "signedFrom": "2022-01-01", "signedTo": "2026-09-26"},
        "retrievedAt": RETRIEVED_AT,
        "access": "Plain HTTP client: 403. Normal Chrome session: served, no challenge. One search; rendered table read. No download, no bypass.",
        "rawRowsSha256": hashlib.sha256(RAW.read_bytes()).hexdigest(),
        "rows": len(actions),
        "securitiesScopeRows": len(sec_scope),
        "otherSecuritiesUnitProgramRows": len(actions) - len(sec_scope),
        "orderDocumentsWithoutTextLayer": sum(1 for a in actions if not a["orderDocument"]["textLayer"]),
        "actionTypesAsListed": dict(sorted(Counter(a["actionTypeAsListed"] for a in actions).items(), key=lambda kv: (-kv[1], kv[0]))),
        "securitiesScopeByYear": dict(sorted(Counter(a["signedDate"][:4] for a in sec_scope).items())),
        "firstSignedDate": min(a["signedDate"] for a in actions),
        "lastSignedDate": max(a["signedDate"] for a in actions),
        "rowsWithCrdPrinted": sum(1 for a in actions if a["crdPrintedInIndex"]),
        "exactFirmCrdLinks": sorted({c for a in actions for c in a["exactFirmCrdLinks"]}),
        "nameOnlyAttachment": False,
        "actions": actions,
    }
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({k: v for k, v in out.items() if k != "actions"}, indent=1))


if __name__ == "__main__":
    main()
