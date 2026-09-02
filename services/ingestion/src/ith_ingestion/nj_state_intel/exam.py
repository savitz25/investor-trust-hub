"""Annual IA written examination intelligence. Not a firm pass/fail credential."""

from __future__ import annotations

import hashlib
import re
from dataclasses import asdict, dataclass, field

TOPIC_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("OUTSIDE_BUSINESS_ACTIVITIES", re.compile(r"outside business|other investment advisers|solicit(?:ation)? of business for other", re.I)),
    ("CONFLICTS_OF_INTEREST", re.compile(r"conflict of interest|conflicts of interest", re.I)),
    ("AUM_OR_ASSETS", re.compile(r"assets under management|aum\b", re.I)),
    ("CLIENT_COUNTS", re.compile(r"number of clients|client count", re.I)),
    ("CUSTODY", re.compile(r"\bcustody\b|fees of more than \$500|six or more months in advance", re.I)),
    ("DISCRETION", re.compile(r"discretionary", re.I)),
    ("ADVERTISING_MARKETING", re.compile(r"advertis|marketing|seminar|social media", re.I)),
    ("SOCIAL_MEDIA", re.compile(r"social media|facebook|linkedin|twitter|instagram", re.I)),
    ("DIGITAL_ASSETS", re.compile(r"digital asset", re.I)),
    ("CRYPTOCURRENCY", re.compile(r"crypto", re.I)),
    ("NFT", re.compile(r"\bnfts?\b|non-fungible", re.I)),
    ("ARTIFICIAL_INTELLIGENCE", re.compile(r"\bai\b|artificial intelligence", re.I)),
    ("CYBERSECURITY", re.compile(r"cyber", re.I)),
    ("PRIVACY", re.compile(r"privacy|credentials", re.I)),
    ("VENDOR_DUE_DILIGENCE", re.compile(r"vendor|third-party platform|held away", re.I)),
    ("BUSINESS_CONTINUITY", re.compile(r"business continuity", re.I)),
    ("COMPLAINTS", re.compile(r"complaint", re.I)),
    ("VULNERABLE_ADULTS", re.compile(r"vulnerable adult|senior investor|elder", re.I)),
    ("SENIOR_INVESTORS", re.compile(r"senior investor|elderly", re.I)),
    ("FINANCIAL_CONDITION", re.compile(r"solvent|financial condition", re.I)),
    ("COMPLIANCE_POLICIES", re.compile(r"policies and procedures|compliance", re.I)),
    ("REPRESENTATIVE_OVERSIGHT", re.compile(r"investment adviser representative|associated person", re.I)),
    ("INVESTMENT_CONCENTRATION", re.compile(r"concentration", re.I)),
    ("FIRM_ORGANIZATION", re.compile(r"organization|financial planning|life insurance|annuity|asset management services", re.I)),
]


@dataclass
class ExamQuestion:
    exam_year: int
    question_number: str
    raw_text: str
    topic: str
    subtopic: str | None = None
    required_upload: bool = False
    conditional: bool = False
    source_document: str = ""
    source_hash: str | None = None


@dataclass
class ExamPackage:
    exam_year: int
    release_date: str | None
    deadline: str | None
    sample_exam_url: str | None
    sample_exam_hash: str | None
    announcement_url: str | None
    firm_population_source_text: str | None
    coverage_state: str
    questions: list[ExamQuestion] = field(default_factory=list)
    topics: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return asdict(self)


def classify_topic(text: str) -> str:
    for topic, cre in TOPIC_RULES:
        if cre.search(text or ""):
            return topic
    return "OTHER"


def is_conditional(text: str) -> bool:
    return bool(re.search(r"\bif yes\b|\bif no\b|if you answered yes", text or "", re.I))


def requires_upload(text: str) -> bool:
    return bool(re.search(r"upload|attach|provide a copy|supporting document", text or "", re.I))


def parse_questions(text: str, exam_year: int, source_document: str = "", source_hash: str | None = None) -> list[ExamQuestion]:
    chunks = re.split(r"(?m)^\s*(\d{1,3})[.)]\s+", text)
    out: list[ExamQuestion] = []
    if len(chunks) < 3:
        return out
    # split keeps delimiters: [pre, num, body, num, body, ...]
    i = 1
    while i + 1 < len(chunks):
        number, body = chunks[i], chunks[i + 1]
        body = body.strip()
        if len(body) < 12:
            i += 2
            continue
        out.append(
            ExamQuestion(
                exam_year=exam_year,
                question_number=number,
                raw_text=body[:1200],
                topic=classify_topic(body),
                required_upload=requires_upload(body),
                conditional=is_conditional(body),
                source_document=source_document,
                source_hash=source_hash,
            )
        )
        i += 2
    return out


def parse_deadline(text: str) -> str | None:
    match = re.search(
        r"no later than\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})",
        text or "",
        re.I,
    )
    if not match:
        match = re.search(
            r"must be completed by\s+(January|February|March|April|May|June|July|August|September|October|November|December)"
            r"\s+(\d{1,2}),\s+(\d{4})",
            text or "",
            re.I,
        )
    if not match:
        return None
    months = {
        "january": "01",
        "february": "02",
        "march": "03",
        "april": "04",
        "may": "05",
        "june": "06",
        "july": "07",
        "august": "08",
        "september": "09",
        "october": "10",
        "november": "11",
        "december": "12",
    }
    return f"{match.group(3)}-{months[match.group(1).lower()]}-{int(match.group(2)):02d}"


def parse_exam_year(text: str, fallback: int | None = None) -> int | None:
    match = re.search(r"\b(20\d{2})\s+Investment Adviser (?:Written |Annual )?Examination", text or "", re.I)
    if match:
        return int(match.group(1))
    match = re.search(r"\b(20\d{2})\s+Annual Examination", text or "", re.I)
    if match:
        return int(match.group(1))
    return fallback


ROUNDED_POPULATION = re.compile(r"(nearly|almost|about|approximately)\s+([\d,]+)", re.I)


def extract_rounded_population(text: str) -> str | None:
    match = ROUNDED_POPULATION.search(text or "")
    if not match:
        return None
    return match.group(0)


def population_is_exact(text: str | None) -> bool:
    if not text:
        return False
    return not bool(ROUNDED_POPULATION.search(text))


def topic_timeline(packages: list[ExamPackage]) -> list[dict]:
    years_by_topic: dict[str, list[int]] = {}
    for pkg in packages:
        for topic in sorted(set(pkg.topics)):
            years_by_topic.setdefault(topic, []).append(pkg.exam_year)
    rows = []
    for topic, years in sorted(years_by_topic.items()):
        years = sorted(set(years))
        rows.append(
            {
                "topic": topic,
                "first_year": years[0],
                "years_present": years,
                "added_in_year": years[0],
                "removed_after_year": None if years[-1] == max(p.exam_year for p in packages) else years[-1],
                "source_support": "official_sample_or_announcement",
            }
        )
    return rows


def content_hash(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()
