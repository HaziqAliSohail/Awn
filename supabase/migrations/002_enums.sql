-- Domain enumerations
create type profile_role as enum ('professional', 'student', 'org_lead');

create type domain_category as enum (
  'tech_software',
  'cybersecurity_it',
  'accounting_tax',
  'creative_branding',
  'operations_admin'
);

create type sprint_status as enum (
  'open',
  'claimed',
  'in_progress',
  'completed',
  'cancelled'
);

create type handshake_status as enum (
  'matched',
  'accepted',
  'rejected',
  'completed'
);
