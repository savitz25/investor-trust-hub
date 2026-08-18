from __future__ import annotations

import zipfile
from pathlib import Path
from urllib.request import Request, urlopen

from ith_ingestion.archive import utc_now
from ith_ingestion.checksum import sha256_file
from ith_ingestion.errors import IngestionError
from ith_ingestion.sec_adv.discover import USER_AGENT
from ith_ingestion.sec_adv.models import DiscoveredFile, ReleaseFile


def download_url(url: str, destination: Path) -> int:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urlopen(request, timeout=180) as response:  # noqa: S310 - official SEC URL
        payload = response.read()
    if len(payload) < 100:
        raise IngestionError(f"downloaded file is too small: {url}")
    destination.write_bytes(payload)
    return len(payload)


def extract_csv(zip_path: Path, destination_dir: Path) -> Path:
    with zipfile.ZipFile(zip_path) as archive:
        names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not names:
            raise IngestionError(f"{zip_path.name} does not contain a CSV")
        name = names[0]
        archive.extract(name, destination_dir)
        return destination_dir / name


def materialize_release_file(
    discovered: DiscoveredFile,
    archive_root: Path,
    *,
    local_zip: Path | None = None,
) -> ReleaseFile:
    release_dir = archive_root / discovered.release_label / discovered.dataset_kind
    release_dir.mkdir(parents=True, exist_ok=True)
    zip_path = release_dir / discovered.filename
    retrieved = utc_now()
    if local_zip is not None:
        zip_path.write_bytes(Path(local_zip).read_bytes())
    elif not zip_path.exists():
        download_url(discovered.url, zip_path)
    csv_path = extract_csv(zip_path, release_dir)
    return ReleaseFile(
        discovered=discovered,
        local_zip=str(zip_path),
        local_csv=str(csv_path),
        csv_filename=csv_path.name,
        zip_bytes=zip_path.stat().st_size,
        csv_bytes=csv_path.stat().st_size,
        zip_sha256=sha256_file(zip_path),
        csv_sha256=sha256_file(csv_path),
        retrieved_at=retrieved,
    )
