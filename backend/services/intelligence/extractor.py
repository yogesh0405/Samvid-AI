"""
Samvid AI - Intelligence Service
Standalone module for structured legal intelligence extraction.
Currently called inline within ai_processor but exposed separately
for independent invocation and future ML pipeline integration.
"""
import json
import re
from typing import Any, Dict, List, Optional, Tuple

# ─────────────────────────────────────────
# Risk Scoring Heuristics
# These rules pre-screen documents before sending to LLM,
# providing a quick first-pass risk assessment and
# reducing LLM token usage for obviously low-risk docs.
# ─────────────────────────────────────────

HIGH_RISK_KEYWORDS = [
    r'\bno refund\b',
    r'\bnon-refundable\b',
    r'\bwaive.*right\b',
    r'\bindemnif',
    r'\bunilateral.*terminat',
    r'\bsolely.*discretion\b',
    r'\barbitration.*mandatory\b',
    r'\bno.*recourse\b',
    r'\bexclusive.*jurisdiction.*foreign\b',
    r'\bliquidated damages\b',
    r'\bpersonal guarantee\b',
    r'\bnon-compete',
    r'\bnon-solicitation',
    r'\bintellectual property.*assign',
    r'\bevergreen\b',
    r'\bauto.renew',
]

MEDIUM_RISK_KEYWORDS = [
    r'\bpenalt',
    r'\blate fee',
    r'\binterest.*overdue\b',
    r'\btermination.*clause\b',
    r'\bnotice period\b',
    r'\bliabilit',
    r'\bindemnit',
    r'\bwithout.*notice\b',
    r'\bgoverning law\b',
]

FINANCIAL_PATTERNS = [
    r'₹\s*[\d,]+(?:\.\d+)?(?:\s*(?:lakh|crore|thousand|hundred))?',
    r'Rs\.?\s*[\d,]+',
    r'INR\s*[\d,]+',
    r'\d+%\s*(?:per\s+annum|p\.a\.|interest|penalty)',
]

DATE_PATTERNS = [
    r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
    r'\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}',
    r'(?:within|by|before|after)\s+\d+\s+(?:days?|weeks?|months?|years?)',
    r'\d+\s+(?:days?|weeks?|months?|years?)\s+(?:from|after|before|of)',
]


def quick_risk_scan(text: str) -> Dict[str, Any]:
    """
    Perform a fast regex-based risk scan before sending to LLM.
    Returns a risk summary dict with counts and matched patterns.
    This helps provide context to the LLM prompt and reduces hallucination.
    """
    text_lower = text.lower()

    high_risk_matches = []
    for pattern in HIGH_RISK_KEYWORDS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        if matches:
            high_risk_matches.extend(matches)

    medium_risk_matches = []
    for pattern in MEDIUM_RISK_KEYWORDS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        if matches:
            medium_risk_matches.extend(matches)

    financial_refs = []
    for pattern in FINANCIAL_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        financial_refs.extend(matches)

    date_refs = []
    for pattern in DATE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        date_refs.extend(matches)

    # Compute preliminary risk level
    if len(high_risk_matches) >= 3:
        prelim_risk = "critical"
    elif len(high_risk_matches) >= 1:
        prelim_risk = "high"
    elif len(medium_risk_matches) >= 3:
        prelim_risk = "medium"
    else:
        prelim_risk = "low"

    return {
        "preliminary_risk_level": prelim_risk,
        "high_risk_keyword_count": len(high_risk_matches),
        "medium_risk_keyword_count": len(medium_risk_matches),
        "financial_references": list(set(financial_refs))[:10],
        "date_references": list(set(date_refs))[:10],
        "high_risk_signals": list(set(high_risk_matches))[:5],
    }


def detect_document_type(text: str) -> str:
    """
    Heuristic document type detection based on keyword frequency.
    Helps prime the LLM with better context.
    """
    text_lower = text.lower()

    type_patterns = {
        "Rental Agreement": ["tenant", "landlord", "rent", "lease", "premises", "security deposit"],
        "Employment Contract": ["employee", "employer", "salary", "designation", "probation", "notice period"],
        "Loan Agreement": ["borrower", "lender", "interest rate", "emi", "repayment", "collateral"],
        "Sale Deed": ["vendor", "vendee", "property", "sale consideration", "registration", "title"],
        "Power of Attorney": ["principal", "attorney", "authorize", "power of attorney", "act on behalf"],
        "Partnership Deed": ["partner", "partnership", "profit sharing", "capital contribution"],
        "NDA": ["confidential", "non-disclosure", "trade secret", "proprietary information"],
        "Service Agreement": ["service provider", "client", "deliverable", "milestone", "scope of work"],
        "Insurance Policy": ["insurer", "insured", "premium", "claim", "coverage", "policy"],
        "Court Notice": ["court", "respondent", "petitioner", "summons", "hearing", "order"],
    }

    scores = {}
    for doc_type, keywords in type_patterns.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[doc_type] = score

    if not scores:
        return "Legal Document"

    return max(scores, key=scores.get)


def extract_parties(text: str) -> List[str]:
    """
    Attempt to extract named parties from the document.
    Used to personalize the LLM analysis.
    """
    patterns = [
        r'(?:between|party of the first part)[:\s]+([A-Z][a-zA-Z\s]+?)(?:\s+and|\s*,)',
        r'(?:M/s|Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][a-zA-Z\s&.]+?)(?:\s+\(|,|\n)',
    ]
    parties = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        parties.extend([m.strip() for m in matches if len(m.strip()) > 3])
    return list(set(parties))[:5]


def build_enriched_prompt_context(text: str) -> Dict[str, Any]:
    """
    Build enriched context to prepend to the LLM prompt.
    Provides the AI model with pre-analyzed hints for better accuracy.
    """
    scan = quick_risk_scan(text)
    doc_type = detect_document_type(text)
    parties = extract_parties(text)

    return {
        "detected_type": doc_type,
        "parties": parties,
        "preliminary_risk": scan["preliminary_risk_level"],
        "financial_refs": scan["financial_references"],
        "date_refs": scan["date_references"],
        "high_risk_signals": scan["high_risk_signals"],
        "word_count": len(text.split()),
        "char_count": len(text),
    }
