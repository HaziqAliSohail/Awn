"""PII redaction — strips contact identifiers before text reaches the LLM or DB.

Ported from the TypeScript sanitizer with the same bounded patterns so behavior
is identical across the stack. Bounds on the phone/SSN patterns prevent the
over-redaction of arbitrary short digit runs that would degrade scope quality.
"""

import re

_PHONE = re.compile(
    r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)|(?<!\d)\d{10,11}(?!\d)"
)
_ADDRESS = re.compile(
    r"\b\d{1,5}\s+(?:[A-Z][a-z]+\s*){1,3}"
    r"(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|"
    r"Place|Pl|Way|Circle|Cir|Terrace|Ter)\b\.?",
    re.IGNORECASE,
)
_SSN = re.compile(r"(?<!\d)\d{3}[-\s]?\d{2}[-\s]?\d{4}(?!\d)")
_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")


def sanitize_raw_text(text: str) -> str:
    # Order matters: SSN before phone (more specific), then address, then email.
    text = _SSN.sub("[REDACTED ID]", text)
    text = _PHONE.sub("[REDACTED PHONE]", text)
    text = _ADDRESS.sub("[REDACTED LOCATION]", text)
    text = _EMAIL.sub("[REDACTED EMAIL]", text)
    return text
