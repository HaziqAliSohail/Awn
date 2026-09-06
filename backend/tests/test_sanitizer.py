"""Unit tests for the PII sanitizer — the bounded patterns are the important
behavior (no over-redaction of ordinary numbers, valid email handling)."""

from app.sanitizer import sanitize_raw_text


def test_redacts_formatted_phone():
    assert "[REDACTED PHONE]" in sanitize_raw_text("call us at (201) 555-0199 today")


def test_redacts_bare_ten_digit_phone():
    assert "[REDACTED PHONE]" in sanitize_raw_text("number is 2015550199 ok")


def test_redacts_email():
    out = sanitize_raw_text("reach me: dir@relief.org please")
    assert "[REDACTED EMAIL]" in out
    assert "dir@relief.org" not in out


def test_redacts_ssn():
    assert "[REDACTED ID]" in sanitize_raw_text("SSN 123-45-6789 on file")


def test_does_not_over_redact_plain_numbers():
    # A 7-digit quantity must survive (the old greedy pattern ate these).
    out = sanitize_raw_text("we serve 2000000 meals and 1500 families")
    assert "2000000" in out
    assert "1500" in out
    assert "REDACTED" not in out


def test_redacts_street_address():
    assert "[REDACTED LOCATION]" in sanitize_raw_text("come to 1423 River Road for pickup")
