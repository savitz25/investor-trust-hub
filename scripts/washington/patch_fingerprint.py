import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
fp = json.loads((root / "artifacts/wa-inv-001-public-snapshot.json").read_text(encoding="utf-8"))[
    "fingerprint"
]
path = root / "packages/domain/src/wa-public-intel.ts"
text = path.read_text(encoding="utf-8")
updated, n = re.subn(
    r"export const WA_PUBLIC_FINGERPRINT =\n  '[^']+';",
    f"export const WA_PUBLIC_FINGERPRINT =\n  '{fp}';",
    text,
)
if n != 1:
    raise SystemExit(f"fingerprint patch count {n}")
path.write_text(updated, encoding="utf-8")
print("fingerprint", fp)
