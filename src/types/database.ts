/**
 * Supabase database type definitions.
 * Mirrors the schema from migrations 002–005.
 */

export type ProfileRole = "professional" | "student" | "org_lead";

export type DomainCategory =
  | "tech_software"
  | "cybersecurity_it"
  | "accounting_tax"
  | "creative_branding"
  | "operations_admin";

export type SprintStatus =
  | "open"
  | "claimed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type HandshakeStatus = "matched" | "accepted" | "rejected" | "completed";

export interface Profile {
  id: string;
  full_name: string;
  headline: string;
  role_type: ProfileRole;
  skills: string[];
  linkedin_url: string | null;
  hours_available_per_week: number;
  bio: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  creator_id: string | null;
  org_name: string;
  org_type: string;
  raw_input: string;
  title: string;
  domain: DomainCategory;
  deliverables: string[];
  prerequisites: string[];
  estimated_hours: number;
  status: SprintStatus;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface SprintHandshake {
  id: string;
  sprint_id: string;
  contributor_id: string;
  waiver_acknowledged: boolean;
  status: HandshakeStatus;
  proof_of_work_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchedCandidate {
  id: string;
  full_name: string;
  headline: string;
  role_type: ProfileRole;
  skills: string[];
  linkedin_url: string | null;
  hours_available_per_week: number;
  bio: string | null;
  similarity: number;
}
