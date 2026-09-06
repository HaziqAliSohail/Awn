/**
 * Sprint Zod Schema — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  IntakeRequestSchema,
  SprintOutputSchema,
  HandshakeClaimSchema,
} from "@/types/sprint";

describe("IntakeRequestSchema", () => {
  it("should accept valid intake payloads", () => {
    const result = IntakeRequestSchema.safeParse({
      orgName: "Bergen Relief Pantry",
      orgType: "501c3_nonprofit",
      rawText:
        "Our distribution lines take 2 hours and our inventory system is broken.",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty org name", () => {
    const result = IntakeRequestSchema.safeParse({
      orgName: "",
      orgType: "501c3_nonprofit",
      rawText:
        "Our distribution lines take 2 hours and our inventory system is broken.",
    });
    expect(result.success).toBe(false);
  });

  it("should reject raw text under 20 characters", () => {
    const result = IntakeRequestSchema.safeParse({
      orgName: "Test Org",
      orgType: "501c3_nonprofit",
      rawText: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid org type", () => {
    const result = IntakeRequestSchema.safeParse({
      orgName: "Test Org",
      orgType: "invalid_type",
      rawText: "This is a valid length description for testing purposes.",
    });
    expect(result.success).toBe(false);
  });
});

describe("SprintOutputSchema", () => {
  it("should accept valid sprint outputs", () => {
    const result = SprintOutputSchema.safeParse({
      title: "Automated Pantry Intake System",
      domain: "tech_software",
      deliverables: [
        "Create responsive mobile intake web form",
        "Generate automated QR token for recipients",
      ],
      estimatedHours: 6,
      prerequisites: ["Next.js", "Supabase"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject hours below 2", () => {
    const result = SprintOutputSchema.safeParse({
      title: "Test Sprint",
      domain: "tech_software",
      deliverables: ["Task one", "Task two"],
      estimatedHours: 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject hours above 12", () => {
    const result = SprintOutputSchema.safeParse({
      title: "Test Sprint",
      domain: "tech_software",
      deliverables: ["Task one", "Task two"],
      estimatedHours: 20,
    });
    expect(result.success).toBe(false);
  });

  it("should reject fewer than 2 deliverables", () => {
    const result = SprintOutputSchema.safeParse({
      title: "Test Sprint",
      domain: "tech_software",
      deliverables: ["Only one"],
      estimatedHours: 4,
    });
    expect(result.success).toBe(false);
  });
});

describe("HandshakeClaimSchema", () => {
  it("should require waiver acknowledgment to be true", () => {
    const result = HandshakeClaimSchema.safeParse({
      sprintId: "e44d320b-bc11-4700-9831-cb4a309d4791",
      waiverAcknowledged: false,
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid claim with waiver true", () => {
    const result = HandshakeClaimSchema.safeParse({
      sprintId: "e44d320b-bc11-4700-9831-cb4a309d4791",
      waiverAcknowledged: true,
    });
    expect(result.success).toBe(true);
  });
});
