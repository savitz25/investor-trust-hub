from datetime import date

from ith_ingestion.sec_adv.discover import discover_latest_from_html, parse_filename_date

HTML = """
<html><body>
<a href="/files/ia07012026.zip">Registered Investment Advisers, July 2026</a>
<a href="/files/ia07012026-exempt.zip">Exempt Investment Advisers, July 2026</a>
<a href="/files/ia08032026_0.zip">Registered Investment Advisers, August 2026</a>
<a href="/files/ia08032026-exempt_0.zip">Exempt Investment Advisers, August 2026</a>
<a href="/files/ia-no-data-110125.pdf">Registered Investment Advisers, November 2025</a>
</body></html>
"""


def test_discover_picks_latest_zip_not_pdf() -> None:
    latest = discover_latest_from_html(HTML, "https://www.sec.gov")
    assert latest["ria"].filename == "ia08032026_0.zip"
    assert latest["era"].filename == "ia08032026-exempt_0.zip"
    assert latest["ria"].published_on == date(2026, 8, 3)
    assert "pdf" not in latest["ria"].url


def test_filename_date_parser() -> None:
    assert parse_filename_date("ia08032026_0.zip") == date(2026, 8, 3)
    assert parse_filename_date("ia07012026-exempt.zip") == date(2026, 7, 1)
