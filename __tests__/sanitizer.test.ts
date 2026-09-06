/**
 * PII Sanitizer Engine — Unit Tests
 * Per TESTING-STRATEGY.md specifications.
 */

import { describe, it, expect } from "vitest";
import { sanitizeRawText, sanitizeWithReport } from "@/lib/sanitizer";

describe("PII Sanitizer Engine", () => {
  // ── Phone Number Redaction ──
  describe("Phone Number Redaction", () => {
    it("should redact formatted US telephone numbers", () => {
      const rawInput =
        "Call me at 201-555-0199 or 2015550188 if you can help.";
      const result = sanitizeRawText(rawInput);
      expect(result).not.toContain("201-555-0199");
      expect(result).toContain("[REDACTED PHONE]");
    });

    it("should redact parenthesized phone numbers", () => {
      const rawInput = "Reach out at (201) 555-0199 for details.";
      const result = sanitizeRawText(rawInput);
      expect(result).not.toContain("(201) 555-0199");
      expect(result).toContain("[REDACTED PHONE]");
    });

    it("should redact multiple phone numbers in one string", () => {
      const rawInput = "Call 201-555-0199 or 973-555-0188 anytime.";
      const result = sanitizeRawText(rawInput);
      expect(result).not.toContain("201-555-0199");
      expect(result).not.toContain("973-555-0188");
    });
  });

  // ── Street Address Redaction ──
  describe("Street Address Redaction", () => {
    it("should redact specific street addresses", () => {
      const rawInput = "Come to 1423 River Road, Teaneck for the gear.";
      const result = sanitizeRawText(rawInput);
      expect(result).not.toContain("1423 River Road");
      expect(result).toContain("[REDACTED LOCATION]");
    });

    it("should redact various street types", () => {
      const rawInput = "We are located at 42 Main Street, Suite 100.";
      const result = sanitizeRawText(rawInput);
      expect(result).not.toContain("42 Main Street");
    });
  });

  // ── Email Redaction ──
  describe("Email Redaction", () => {
    it("should redact email addresses", () => {
      const rawInput = "Contact tariq@bergenrelief.org for more info.";
      const result = sanitizeRawText(rawInput);
      expect(result).not.toContain("tariq@bergenrelief.org");
      expect(result).toContain("[REDACTED EMAIL]");
    });
  });

  // ── SSN Redaction ──
  describe("SSN Redaction", () => {
    it("should redact SSN patterns", () => {
      const rawInput = "My SSN is 123-45-6789, please process.";
      const result = sanitizeRawText(rawInput);
      expect(result).not.toContain("123-45-6789");
      expect(result).toContain("[REDACTED");
    });
  });

  // ── Edge Cases ──
  describe("Edge Cases", () => {
    it("should pass through text with no PII unchanged", () => {
      const rawInput =
        "We need a volunteer signup form that exports to Google Sheets.";
      const result = sanitizeRawText(rawInput);
      expect(result).toBe(rawInput);
    });

    it("should handle mixed PII types in one string", () => {
      const rawInput =
        "Call 201-555-0199, come to 42 Main Street, or email test@org.com.";
      const result = sanitizeRawText(rawInput);
      expect(result).not.toContain("201-555-0199");
      expect(result).not.toContain("42 Main Street");
      expect(result).not.toContain("test@org.com");
    });

    it("should report correct redaction count", () => {
      const rawInput =
        "Call 201-555-0199 or email admin@masjid.org for help.";
      const report = sanitizeWithReport(rawInput);
      expect(report.redactionsApplied).toBeGreaterThanOrEqual(2);
      expect(report.sanitized).toContain("[REDACTED");
    });
  });
});
