from pathlib import Path

from ith_ingestion.checksum import sha256_bytes, verify_checksum


def test_sha256_bytes_is_stable() -> None:
    digest = sha256_bytes(b"investor-trust-hub")
    assert digest == sha256_bytes(b"investor-trust-hub")
    assert len(digest) == 64


def test_file_checksum_round_trip(tmp_path: Path) -> None:
    path = tmp_path / "sample.txt"
    path.write_text("hello", encoding="utf-8")
    result = verify_checksum(path)
    assert result.matches
    assert result.hex_digest == verify_checksum(path, result.hex_digest).hex_digest
