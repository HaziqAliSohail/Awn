/**
 * Zod validation schemas for runtime type-safe API payloads.
 * Per CODING-STANDARDS.md: use Zod for all runtime validation, no `any` types.
 */

import { z } from "zod";

// ──────────────────────────────────────────────
// Domain Enums
// ──────────────────────────────────────────────

export const DomainCategorySchema = z.enum([
  "tech_software",
  "cybersecurity_it",
  "accounting_tax",
  "creative_branding",
  "operations_admin",
]);

// Muslim-community org types (strictly-ummah platform). UI labels present
// these in Islamic terms (see OrgType in backend/app/schemas.py).
export const OrgTypeSchema = z.enum([
  "mosque_icc",
  "islamic_school",
  "501c3_nonprofit",
  "small_business",
  "student_org",
  "federation",
]);

export type OrgType = z.infer<typeof OrgTypeSchema>;
export type DomainCategory = z.infer<typeof DomainCategorySchema>;

// ──────────────────────────────────────────────
// Intake Request (POST /api/scope-sprint)
// ──────────────────────────────────────────────

// A need is posted by an individual community member by default; an
// organization is optional "on behalf of" attribution. Authoritative
// validation lives in the FastAPI backend (backend/app/schemas.py).
export const IntakeRequestSchema = z.object({
  rawText: z
    .string()
    .min(20, "Describe your need in at least 20 characters")
    .max(2000, "Input must be under 2,000 characters"),
  requesterKind: z.enum(["individual", "organization"]).default("individual"),
  orgName: z.string().min(2).max(120).optional(),
  orgType: OrgTypeSchema.optional(),
  requiredGender: z.enum(["male", "female"]).optional(),
  languagesNeeded: z.array(z.string()).max(10).optional(),
  city: z.string().max(120).optional(),
});

export type IntakeRequest = z.infer<typeof IntakeRequestSchema>;

// ──────────────────────────────────────────────
// Structured Sprint Output (from GPT-4o-mini)
// ──────────────────────────────────────────────

export const SprintOutputSchema = z.object({
  title: z.string().min(5).max(100),
  domain: DomainCategorySchema,
  deliverables: z.array(z.string().min(5).max(200)).min(2).max(4),
  estimatedHours: z.number().int().min(2).max(12),
  prerequisites: z.array(z.string()).max(6).default([]),
});

export type SprintOutput = z.infer<typeof SprintOutputSchema>;

// ──────────────────────────────────────────────
// Match Request (POST /api/match-talent)
// ──────────────────────────────────────────────

export const MatchRequestSchema = z.object({
  sprintEmbedding: z.array(z.number()).length(1536),
  matchThreshold: z.number().min(0).max(1).default(0.45),
  limit: z.number().int().min(1).max(10).default(3),
});

export type MatchRequest = z.infer<typeof MatchRequestSchema>;

// Preferred matching contract: the caller names a sprint they own and the
// server loads its stored embedding. Callers never supply raw vectors, which
// previously turned the endpoint into an open talent-PII enumeration surface.
export const MatchBySprintSchema = z.object({
  sprintId: z.string().uuid(),
  threshold: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

export type MatchBySprint = z.infer<typeof MatchBySprintSchema>;

// ──────────────────────────────────────────────
// Handshake Request (POST /api/handshake)
// ──────────────────────────────────────────────

export const HandshakeClaimSchema = z.object({
  sprintId: z.string().uuid(),
  waiverAcknowledged: z.literal(true, {
    errorMap: () => ({
      message: "You must acknowledge the pro-bono capacity agreement",
    }),
  }),
});

export type HandshakeClaim = z.infer<typeof HandshakeClaimSchema>;

// ──────────────────────────────────────────────
// Handshake Update (PATCH /api/handshake)
// ──────────────────────────────────────────────

export const HandshakeUpdateSchema = z.object({
  handshakeId: z.string().uuid(),
  status: z.enum(["accepted", "rejected", "completed"]),
  proofOfWorkUrl: z.string().url().optional(),
});

export type HandshakeUpdate = z.infer<typeof HandshakeUpdateSchema>;
