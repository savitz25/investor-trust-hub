import json
from pathlib import Path

census = json.loads(Path("docs/inv-home-001-census.json").read_text(encoding="utf-8"))
rows = census["groups"]["principal_office_states"]
non = [r for r in rows if r["state"] != "(null)"]
null_n = sum(r["n"] for r in rows if r["state"] == "(null)")
print("resolved", sum(r["n"] for r in non))
print("null_all_firms", null_n)
print("states", len(non))
print(json.dumps([(r["state"], r["n"]) for r in sorted(non, key=lambda x: (-x["n"], x["state"]))]))
