#!/usr/bin/env python3
"""Harvest DoBS Enforcement Orders via the official Coveo catalog (search hub DOBS-Enforcement Orders)."""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

ORG = "commonwealthofpennsylvaniaproductiono8jd9ckm"
TOKEN = "xx4e57cda9-3464-437d-9375-b947ca6b72c8"
HUB = "DOBS-Enforcement Orders"
ENDPOINTS = [
    f"https://{ORG}.org.coveo.com/rest/search/v2",
    "https://platform.cloud.coveo.com/rest/search/v2",
]
OUT = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-inv-001/dobs-enforcement-catalog.json"
FIELDS = [
    "title",
    "uri",
    "clickableuri",
    "filetype",
    "copapwptitle",
    "copapwpdocketnumber",
    "copapwpissuedate",
    "copapwpissueyear",
    "copapwpissuemonth",
    "copapwpdocumentid",
    "copapwpprovidername",
    "copapwpcontenttype",
    "copapwpshortdescription",
    "copapwpdescription",
    "copapwpdocumentdownload1",
    "source",
    "collection",
]


def post(url: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "PA-INV-001/1.0 (+https://www.investortrusthub.com)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))


def classify(row: dict) -> str:
    blob = " ".join(
        str(row.get(k) or "")
        for k in (
            "copapwpdocketnumber",
            "title",
            "copapwptitle",
            "uri",
            "copapwpshortdescription",
        )
    ).upper()
    if re.search(r"\bSEC[-_ ]?(OSC|DO|ORD|CAO|FO)\b|\(SEC-", blob) or "/SECURITIES" in blob:
        return "SECURITIES_SOURCE_NATIVE"
    if re.search(r"\b(ENF-ORD|BNK-|BANK|CREDIT UNION|MORTGAGE|CHECK CASHER|MLA)\b", blob):
        return "NON_SECURITIES_SOURCE_NATIVE"
    return "UNRESOLVED_CLASS"


def docket(row: dict) -> str | None:
    raw = row.get("copapwpdocketnumber")
    if isinstance(raw, list):
        raw = " ".join(str(x) for x in raw if x)
    text = str(raw or "")
    m = re.search(r"\d{2,6}[-_ ]?\d{2,6}|\d{4,}", text)
    return text.strip() or None


def main() -> None:
    payload_base = {
        "q": "",
        "aq": "",
        "searchHub": HUB,
        "numberOfResults": 100,
        "firstResult": 0,
        "fieldsToInclude": FIELDS,
        "sortCriteria": "@copapwpissuedate descending",
    }
    first = None
    used = None
    for url in ENDPOINTS:
        try:
            first = post(url, payload_base)
            used = url
            print("endpoint", url, "total", first.get("totalCount"))
            break
        except urllib.error.HTTPError as exc:
            print("fail", url, exc.code, exc.read()[:200])
    if not first:
        raise SystemExit("Coveo search failed")
    total = int(first.get("totalCount") or 0)
    results = list(first.get("results") or [])
    first_result = len(results)
    while first_result < total:
        payload = dict(payload_base)
        payload["firstResult"] = first_result
        page = post(used, payload)
        batch = page.get("results") or []
        if not batch:
            break
        results.extend(batch)
        first_result += len(batch)
        print("got", len(results), "/", total, flush=True)
        time.sleep(0.15)
    slim = []
    for r in results:
        raw = r.get("raw") or {}
        row = {
            "title": r.get("title") or raw.get("copapwptitle") or raw.get("title"),
            "uri": r.get("clickUri") or r.get("uri") or raw.get("clickableuri"),
            "filetype": raw.get("filetype"),
            "docket": raw.get("copapwpdocketnumber"),
            "issueDate": raw.get("copapwpissuedate"),
            "issueYear": raw.get("copapwpissueyear"),
            "issueMonth": raw.get("copapwpissuemonth"),
            "documentId": raw.get("copapwpdocumentid"),
            "providerName": raw.get("copapwpprovidername"),
            "contentType": raw.get("copapwpcontenttype"),
            "excerpt": (r.get("excerpt") or "")[:400],
        }
        row["class"] = classify({**row, **raw, "copapwpdocketnumber": row["docket"], "uri": row["uri"]})
        row["docketKey"] = docket(row)
        crd = None
        blob = json.dumps(row, default=str)
        m = re.search(r"\bCRD\s*#?\s*(\d{4,7})\b", blob, re.I)
        if m:
            crd = m.group(1)
        row["crdInMetadata"] = crd
        slim.append(row)
    classes = Counter(r["class"] for r in slim)
    years = Counter(str(r.get("issueYear") or "") for r in slim)
    dockets = [r["docketKey"] for r in slim if r.get("docketKey")]
    securities = [r for r in slim if r["class"] == "SECURITIES_SOURCE_NATIVE"]
    sec_dockets = [r["docketKey"] for r in securities if r.get("docketKey")]
    catalog = {
        "source": "DoBS Enforcement Orders Coveo hub",
        "officialUrl": "https://www.pa.gov/agencies/dobs/enforcement-orders",
        "searchHub": HUB,
        "organizationId": ORG,
        "retrievedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalCountReported": total,
        "rowsHarvested": len(slim),
        "classCounts": dict(classes),
        "yearCounts": dict(sorted(years.items())),
        "allDocuments": len(slim),
        "securitiesDocuments": len(securities),
        "uniqueDocketsAll": len(set(dockets)),
        "uniqueDocketsSecurities": len(set(sec_dockets)),
        "crdInMetadataRows": sum(1 for r in slim if r.get("crdInMetadata")),
        "rows": slim,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    summary = {k: v for k, v in catalog.items() if k != "rows"}
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
