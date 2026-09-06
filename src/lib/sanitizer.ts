/**
 * PII Sanitization Engine
 *
 * Strips personally identifiable information from raw user input BEFORE
 * it reaches the LLM or database. Per SECURITY-AND-COMPLIANCE-REPORT.md:
 * - Telephone numbers → [REDACTED PHONE]
 * - Street addresses → [REDACTED LOCATION]
 * - SSN patterns → [REDACTED ID]
 * - Email addresses → [REDACTED EMAIL]
 */

// US phone numbers, formatted (needs a real separator) OR a bare 10–11 digit
// run. Bounded by (?<!\d)/(?!\d) so it does NOT swallow arbitrary short digit
// sequences (e.g. "2000000") the way an unbounded 3+4 pattern would — that
// over-redaction degraded scope-engine input quality.
const PHONE_PATTERN =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)|(?<!\d)\d{10,11}(?!\d)/g;

// Street addresses: 1423 River Road, 42 Main St, etc.
const ADDRESS_PATTERN =
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s*){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Circle|Cir|Terrace|Ter)\b\.?/gi;

// SSN: 123-45-6789. Bounded so it isn't carved out of a longer phone digit run.
const SSN_PATTERN = /(?<!\d)\d{3}[-\s]?\d{2}[-\s]?\d{4}(?!\d)/g;

// Email addresses (fixed: the TLD class previously included a literal '|').
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

interface SanitizationResult {
  sanitized: string;
  redactionsApplied: number;
}

/**
 * Sanitizes raw text by redacting all detected PII patterns.
 * Returns the cleaned string and a count of redactions.
 */
export function sanitizeRawText(input: string): string {
  let result = input;

  // Order matters: SSN before phone (SSN is more specific)
  result = result.replace(SSN_PATTERN, "[REDACTED ID]");
  result = result.replace(PHONE_PATTERN, "[REDACTED PHONE]");
  result = result.replace(ADDRESS_PATTERN, "[REDACTED LOCATION]");
  result = result.replace(EMAIL_PATTERN, "[REDACTED EMAIL]");

  return result;
}

/**
 * Sanitizes raw text and returns both the result and a redaction count.
 */
export function sanitizeWithReport(input: string): SanitizationResult {
  let redactionsApplied = 0;

  const countReplacements = (text: string, pattern: RegExp): number => {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  };

  redactionsApplied += countReplacements(input, SSN_PATTERN);
  redactionsApplied += countReplacements(input, PHONE_PATTERN);
  redactionsApplied += countReplacements(input, ADDRESS_PATTERN);
  redactionsApplied += countReplacements(input, EMAIL_PATTERN);

  return {
    sanitized: sanitizeRawText(input),
    redactionsApplied,
  };
}
