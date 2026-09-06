"""Pydantic request/response models. Field names are camelCase to match the
frontend payloads exactly (the browser posts JSON as-is)."""

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator

# Community mutual-aid categories — in-person + advisory help.
DomainCategory = Literal[
    "janaza",             # Janāzah & bereavement
    "meals_food",         # Meals & food
    "transport_errands",  # Rides & errands
    "home_repairs",       # Plumbing, electrical, handywork
    "moving_labor",       # Moving & heavy lifting
    "elder_sick_care",    # Elder & sick care
    "childcare_family",   # Childcare & family
    "masjid_events",      # Masjid & event volunteering
    "quran_islamic",      # Qur'an & Islamic learning
    "tutoring_education",  # Tutoring & education
    "career_resume",      # Career & resume guidance
    "legal_immigration",  # Legal & immigration
    "health_guidance",    # Health & wellbeing guidance
    "tech_digital",       # Tech & digital help
    "other",              # Anything else
]

HelpTiming = Literal["urgent", "this_week", "flexible", "scheduled"]

Gender = Literal["male", "female"]

# Muslim-community org types (a strictly-ummah platform). Values are stable;
# UI labels present them in Islamic terms (Masjid/Islamic Center, Muslim
# Non-Profit, Islamic School, MSA/Muslim Student Group, Islamic Council).
OrgType = Literal[
    "mosque_icc",       # Masjid / Islamic center
    "islamic_school",   # Full-time or weekend Islamic school / madrasah
    "501c3_nonprofit",  # Muslim non-profit / relief org
    "small_business",   # Muslim-owned business
    "student_org",      # MSA / Muslim student group
    "federation",       # Islamic council / federation
]

ProfileRole = Literal["professional", "student", "org_lead"]
HandshakeStatus = Literal["invited", "matched", "accepted", "rejected", "completed"]


class IntakeRequest(BaseModel):
    rawText: str = Field(min_length=10, max_length=2000)
    # An individual community member by default; org is opt-in "on behalf of".
    requesterKind: Literal["individual", "organization"] = "individual"
    orgName: str | None = Field(default=None, min_length=2, max_length=120)
    orgType: OrgType | None = None
    # How the help happens.
    timing: HelpTiming = "flexible"
    neededBy: str | None = None  # ISO date, when timing == scheduled
    inPerson: bool = False
    # Optional trust/locality requirements for the matched helper.
    requiredGender: Gender | None = None
    languagesNeeded: list[str] = Field(default_factory=list, max_length=10)
    city: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def _require_org_fields_when_org(self) -> "IntakeRequest":
        if self.requesterKind == "organization" and not (self.orgName and self.orgType):
            raise ValueError(
                "orgName and orgType are required when requesterKind is 'organization'"
            )
        return self


class SprintOutput(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    domain: DomainCategory
    deliverables: list[str] = Field(min_length=1, max_length=4)  # what's needed
    estimatedHours: int | None = Field(default=None, ge=1, le=40)
    prerequisites: list[str] = Field(default_factory=list, max_length=6)


class MatchRequest(BaseModel):
    sprintId: str
    threshold: float | None = Field(default=None, ge=0, le=1)
    limit: int | None = Field(default=None, ge=1, le=10)


class HandshakeClaim(BaseModel):
    """Path A: a helper offers to help on an open need (→ 'matched')."""

    sprintId: str
    waiverAcknowledged: Literal[True]
    note: str | None = Field(default=None, max_length=1000)


class RequestHelp(BaseModel):
    """Path B: a requester invites a specific helper they picked (→ 'invited')."""

    sprintId: str
    contributorId: str
    waiverAcknowledged: Literal[True]
    note: str | None = Field(default=None, max_length=1000)


class HandshakeUpdate(BaseModel):
    handshakeId: str
    status: Literal["accepted", "rejected", "completed"]


class ProfileInput(BaseModel):
    fullName: str = Field(min_length=2, max_length=120)
    headline: str = Field(min_length=2, max_length=160)
    roleType: ProfileRole
    skills: list[str] = Field(default_factory=list, max_length=20)
    linkedinUrl: HttpUrl | None = None
    hoursAvailable: int = Field(ge=0, le=40, default=3)
    bio: str | None = Field(default=None, max_length=1000)
    # Trust & locality dimensions
    gender: Gender | None = None
    languages: list[str] = Field(default_factory=list, max_length=10)
    city: str | None = Field(default=None, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    # Experience-driven help
    canHelpWith: list[DomainCategory] = Field(default_factory=list, max_length=15)
    haveHelpedWith: list[DomainCategory] = Field(default_factory=list, max_length=15)
    volunteerExperience: str | None = Field(default=None, max_length=2000)


class AdminHandMatch(BaseModel):
    sprintId: str
    contributorId: str


class AdminSprintStatus(BaseModel):
    sprintId: str
    status: Literal["open", "claimed", "in_progress", "completed", "cancelled"]
