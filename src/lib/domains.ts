// Community mutual-aid categories, timing, and states. Keyed by string so all
// DB-supported values render without exhaustiveness gaps.

export const DOMAIN_LABEL: Record<string, string> = {
  janaza: "Janāzah & bereavement",
  meals_food: "Meals & food",
  transport_errands: "Rides & errands",
  home_repairs: "Home repairs",
  moving_labor: "Moving & labor",
  elder_sick_care: "Elder & sick care",
  childcare_family: "Childcare & family",
  masjid_events: "Masjid & events",
  quran_islamic: "Qur'an & Islamic",
  tutoring_education: "Tutoring & education",
  career_resume: "Career & resume",
  legal_immigration: "Legal & immigration",
  health_guidance: "Health guidance",
  tech_digital: "Tech & digital",
  other: "Other",
};

// Ordered list for pickers (onboarding, filters). Emoji aid quick scanning.
export const CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "janaza", label: "Janāzah & bereavement", emoji: "🕌" },
  { value: "meals_food", label: "Meals & food", emoji: "🍲" },
  { value: "transport_errands", label: "Rides & errands", emoji: "🚗" },
  { value: "home_repairs", label: "Home repairs", emoji: "🔧" },
  { value: "moving_labor", label: "Moving & labor", emoji: "📦" },
  { value: "elder_sick_care", label: "Elder & sick care", emoji: "🤲" },
  { value: "childcare_family", label: "Childcare & family", emoji: "👶" },
  { value: "masjid_events", label: "Masjid & events", emoji: "🕌" },
  { value: "quran_islamic", label: "Qur'an & Islamic", emoji: "📖" },
  { value: "tutoring_education", label: "Tutoring & education", emoji: "✏️" },
  { value: "career_resume", label: "Career & resume", emoji: "💼" },
  { value: "legal_immigration", label: "Legal & immigration", emoji: "⚖️" },
  { value: "health_guidance", label: "Health guidance", emoji: "🩺" },
  { value: "tech_digital", label: "Tech & digital", emoji: "💻" },
  { value: "other", label: "Other", emoji: "✨" },
];

export function domainLabel(d: string): string {
  return DOMAIN_LABEL[d] ?? d.replace(/_/g, " ");
}

export const TIMING_LABEL: Record<string, string> = {
  urgent: "Urgent",
  this_week: "This week",
  flexible: "Flexible",
  scheduled: "Scheduled",
};

export const SPRINT_STATUS: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-brand-50 text-brand-700 border-brand-200" },
  claimed: { label: "Claimed", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completed", className: "bg-surface-100 text-surface-600 border-surface-200" },
  cancelled: { label: "Closed", className: "bg-red-50 text-red-600 border-red-200" },
};

export const CONNECTION_STATUS: Record<string, { label: string; className: string }> = {
  invited: { label: "Invited, awaiting their reply", className: "bg-amber-50 text-amber-700 border-amber-200" },
  matched: { label: "Offer, awaiting your reply", className: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted: { label: "Connected", className: "bg-brand-50 text-brand-700 border-brand-200" },
  rejected: { label: "Declined", className: "bg-surface-100 text-surface-500 border-surface-200" },
  completed: { label: "Completed", className: "bg-surface-100 text-surface-600 border-surface-200" },
};
