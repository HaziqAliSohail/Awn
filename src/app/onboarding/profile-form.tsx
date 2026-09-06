"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Input, Textarea, Select, Label, FieldError, Hint } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/domains";

export interface ProfileInitial {
  fullName: string;
  headline: string;
  roleType: "professional" | "student" | "org_lead";
  gender: "male" | "female" | "";
  skills: string;
  languages: string;
  city: string;
  linkedinUrl: string;
  hoursAvailable: number;
  bio: string;
  canHelpWith: string[];
  haveHelpedWith: string[];
  volunteerExperience: string;
}

function splitList(v: string, max: number): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, max);
}

function Chips({
  selected,
  onToggle,
  disabledUnselected,
}: {
  selected: Set<string>;
  onToggle: (v: string) => void;
  disabledUnselected?: (v: string) => boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {CATEGORIES.map((c) => {
        const on = selected.has(c.value);
        const dis = !on && disabledUnselected?.(c.value);
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={on}
            disabled={dis}
            onClick={() => onToggle(c.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              on
                ? "border-primary bg-primary text-white"
                : dis
                ? "border-surface-200 bg-surface-50 text-surface-300"
                : "border-surface-300 bg-white text-surface-700 hover:border-primary hover:text-primary"
            }`}
          >
            <span aria-hidden="true">{c.emoji}</span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileForm({ initial, email }: { initial: ProfileInitial | null; email: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<ProfileInitial["roleType"]>(initial?.roleType ?? "professional");
  const [gender, setGender] = useState<ProfileInitial["gender"]>(initial?.gender ?? "");
  const [canHelp, setCanHelp] = useState<Set<string>>(new Set(initial?.canHelpWith ?? []));
  const [haveDone, setHaveDone] = useState<Set<string>>(new Set(initial?.haveHelpedWith ?? []));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ gender?: string; canHelp?: string; linkedinUrl?: string }>({});

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, v: string) {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next: typeof errors = {};
    if (!gender) next.gender = "Please select so we can honor gender preferences in matching.";
    if (canHelp.size === 0) next.canHelp = "Pick at least one way you can help the community.";
    const linkedinUrl = String(fd.get("linkedinUrl") ?? "").trim();
    if (linkedinUrl && !/^https?:\/\/.+/i.test(linkedinUrl)) next.linkedinUrl = "Enter a valid URL (with https://).";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      fullName: String(fd.get("fullName") ?? "").trim(),
      headline: String(fd.get("headline") ?? "").trim(),
      roleType: role,
      gender,
      canHelpWith: Array.from(canHelp),
      haveHelpedWith: Array.from(haveDone),
      volunteerExperience: String(fd.get("volunteerExperience") ?? "").trim() || null,
      skills: splitList(String(fd.get("skills") ?? ""), 20),
      languages: splitList(String(fd.get("languages") ?? ""), 10),
      city: String(fd.get("city") ?? "").trim() || null,
      linkedinUrl: linkedinUrl || null,
      hoursAvailable: Number(fd.get("hoursAvailable") ?? 3),
      bio: String(fd.get("bio") ?? "").trim() || null,
    };

    setLoading(true);
    try {
      await api.put("/profile", payload);
      toast({ variant: "success", title: "Profile saved", description: "Jazāk Allāhu khayran." });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.replace("/login");
        return;
      }
      toast({ variant: "error", title: "Couldn't save", description: err instanceof ApiError ? err.message : "Please try again." });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName" required>Full name</Label>
          <Input id="fullName" name="fullName" defaultValue={initial?.fullName} required minLength={2} autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="gender" required>Gender</Label>
          <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value as ProfileInitial["gender"])}
            aria-invalid={errors.gender ? true : undefined} aria-describedby={errors.gender ? "gender-error" : undefined}>
            <option value="">Select…</option>
            <option value="male">Brother</option>
            <option value="female">Sister</option>
          </Select>
          <FieldError id="gender-error">{errors.gender}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="headline" required>Short headline</Label>
        <Input id="headline" name="headline" defaultValue={initial?.headline} required minLength={2}
          placeholder="e.g. Software engineer, drives, helps with janāzah" />
      </div>

      <div>
        <Label required>Ways I can help</Label>
        <Chips selected={canHelp} onToggle={(v) => toggle(canHelp, setCanHelp, v)} />
        <FieldError>{errors.canHelp}</FieldError>
        <Hint>Pick everything you&apos;re willing to help the community with. This is how people find you.</Hint>
      </div>

      <div>
        <Label>Have you done any of these before?</Label>
        <Chips selected={haveDone} onToggle={(v) => toggle(haveDone, setHaveDone, v)} />
        <Hint>We&apos;ll surface you first to people who need help you&apos;ve done before, in shā’ Allāh.</Hint>
      </div>

      <div>
        <Label htmlFor="volunteerExperience">Your past volunteering / service</Label>
        <Textarea id="volunteerExperience" name="volunteerExperience" defaultValue={initial?.volunteerExperience}
          placeholder="e.g. Helped with 6 janāzahs at Masjid Al-Noor, delivered Ramadan meals, tutored kids on weekends." />
        <Hint>A sentence or two. It builds trust and improves your matches.</Hint>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="languages">Languages</Label>
          <Input id="languages" name="languages" defaultValue={initial?.languages} placeholder="English, Arabic, Urdu" />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={initial?.city} placeholder="e.g. Paterson, NJ" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="skills">Skills (optional)</Label>
          <Input id="skills" name="skills" defaultValue={initial?.skills} placeholder="Tajwīd, plumbing, bookkeeping, driving" />
          <Hint>Comma-separated. Sharpens your match score.</Hint>
        </div>
        <div>
          <Label htmlFor="hoursAvailable">Hours / week (optional)</Label>
          <Input id="hoursAvailable" name="hoursAvailable" type="number" min={0} max={40} defaultValue={initial?.hoursAvailable ?? 3} inputMode="numeric" />
        </div>
      </div>

      <div>
        <Label htmlFor="linkedinUrl">LinkedIn (optional)</Label>
        <Input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={initial?.linkedinUrl} placeholder="https://linkedin.com/in/…"
          aria-invalid={errors.linkedinUrl ? true : undefined} aria-describedby={errors.linkedinUrl ? "linkedinUrl-error" : undefined} />
        <FieldError id="linkedinUrl-error">{errors.linkedinUrl}</FieldError>
      </div>

      <div>
        <Label htmlFor="bio">A little about you (optional)</Label>
        <Textarea id="bio" name="bio" defaultValue={initial?.bio}
          placeholder="Your intention (niyyah) and what you hope to contribute to the ummah." />
      </div>

      <input type="hidden" name="roleType" value={role} />
      <Button type="submit" size="lg" loading={loading} className="w-full">
        {loading ? "Saving…" : "Save profile & continue"}
      </Button>
      <p className="text-center text-xs text-surface-400">Signed in as {email}</p>
    </form>
  );
}
