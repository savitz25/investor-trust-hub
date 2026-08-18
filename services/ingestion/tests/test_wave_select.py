from ith_ingestion.wave_select import sample_crds_for_qa, select_wave, wave_sort_key


def _row(crd: str, classification: str = "reported_as_registered", region: str = "NY") -> dict:
    return {
        "crd": crd,
        "classification": classification,
        "region": region,
        "release_label": "2026-08-03",
        "id": crd,
        "slug": f"sec-crd-{crd}",
    }


def test_sort_key_is_stable() -> None:
    first = wave_sort_key("105958", "2026-08-03")
    second = wave_sort_key("105958", "2026-08-03")
    assert first == second
    assert first != wave_sort_key("105958", "other-release")


def test_select_wave_is_deterministic_and_sized() -> None:
    universe = [_row(str(n)) for n in range(1, 501)]
    first = select_wave(universe, 25)
    second = select_wave(list(reversed(universe)), 25)
    assert [item["crd"] for item in first] == [item["crd"] for item in second]
    assert len(first) == 25


def test_select_wave_does_not_prefer_low_crd_or_name_order() -> None:
    universe = [_row(str(n)) for n in range(1, 201)]
    selected = [item["crd"] for item in select_wave(universe, 10)]
    assert selected != [str(n) for n in range(1, 11)]


def test_qa_sample_covers_classes() -> None:
    rows = (
        [_row("10", "reported_as_registered")]
        + [_row("20", "pending_120_day")]
        + [_row("30", "exempt_reporting_adviser")]
        + [_row(str(100 + n)) for n in range(40)]
    )
    sample = sample_crds_for_qa(rows, 10)
    assert sample[:3] == ["10", "20", "30"]
    assert len(sample) == 10
