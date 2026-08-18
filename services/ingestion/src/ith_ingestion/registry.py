from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RegisteredSource:
    authority_id: str
    system_id: str
    dataset_id: str
    name: str
    prospecting_prohibited: bool = False


REGISTERED_SOURCES: tuple[RegisteredSource, ...] = (
    RegisteredSource("sec", "iapd", "iapd_individuals", "IAPD individuals"),
    RegisteredSource("sec", "form_adv", "form_adv", "Form ADV"),
    RegisteredSource("sec", "form_adv", "sec_ia_ria", "SEC registered investment advisers"),
    RegisteredSource("sec", "form_adv", "sec_ia_era", "SEC exempt reporting advisers"),
    RegisteredSource(
        "finra",
        "brokercheck",
        "brokercheck_individuals",
        "BrokerCheck individuals",
        prospecting_prohibited=True,
    ),
    RegisteredSource(
        "finra",
        "brokercheck",
        "brokercheck_firms",
        "BrokerCheck firms",
        prospecting_prohibited=True,
    ),
    RegisteredSource("sec", "edgar", "edgar_submissions", "EDGAR submissions"),
    RegisteredSource("sec", "sec_investment_company", "ncen_nport", "N-CEN / N-PORT"),
    RegisteredSource("nfa", "nfa_basic", "nfa_basic_entities", "NFA BASIC"),
    RegisteredSource("cftc", "cftc", "cftc", "CFTC public records"),
    RegisteredSource(
        "synthetic",
        "synthetic_dev",
        "synthetic_fixtures",
        "Synthetic development fixtures",
        prospecting_prohibited=True,
    ),
)


def get_registered_source(system_id: str, dataset_id: str) -> RegisteredSource | None:
    for source in REGISTERED_SOURCES:
        if source.system_id == system_id and source.dataset_id == dataset_id:
            return source
    return None
