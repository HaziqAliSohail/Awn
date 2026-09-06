"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Input, Textarea, Select, Label, Hint } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const ORG_TYPES = [
  { value: "mosque_icc", label: "Masjid / Islamic center" },
  { value: "islamic_school", label: "Islamic / weekend school" },
  { value: "501c3_nonprofit", label: "Muslim non-profit / relief org" },
  { value: "small_business", label: "Muslim-owned business" },
  { value: "student_org", label: "MSA / Muslim student group" },
  { value: "federation", label: "Islamic council / federation" },
];

const MAX = 2000;

export function NewSprintForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [rawText, setRawText] = useState("");
  const [onBehalf, setOnBehalf] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("mosque_icc");
  const [requiredGender, setRequiredGender] = useState("");
  const [languages, setLanguages] = useState("");
  const [city, setCity] = useState("");
  const [timing, setTiming] = useState("flexible");
  const [neededBy, setNeededBy] = useState("");
  const [inPerson, setInPerson] = useState(false);
  const [loading, setLoading] = useState(false);

  const count = rawText.length;
  const valid = count >= 10 && count <= MAX && (!onBehalf || orgName.trim().length >= 2);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    try {
      const json = await api.post<{ data: { id: string; title: string } }>("/scope-sprint", {
        rawText,
        requesterKind: onBehalf ? "organization" : "individual",
        orgName: onBehalf ? orgName.trim() : undefined,
        orgType: onBehalf ? orgType : undefined,
        timing,
        neededBy: timing === "scheduled" && neededBy ? neededBy : undefined,
        inPerson,
        requiredGender: requiredGender || undefined,
        languagesNeeded: languages
          ? languages.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10)
          : undefined,
        city: city.trim() || undefined,
      });
      toast({ variant: "success", title: "Your request is ready", description: json.data.title });
      router.push(`/sprints/${json.data.id}`);
    } catch (err) {
      toast({
        variant: "error",
        title: "Something went wrong",
        description: err instanceof ApiError ? err.message : "Please try again.",
      });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="rawText" required>What do you need help with?</Label>
        <Textarea
          id="rawText"
          value={rawText}
          onChange={(e) => setRawText(e.target.value.slice(0, MAX))}
          rows={6}
          placeholder="Describe it in your own words. For example: 'My father passed away, we need help with the janāzah tomorrow,' or 'Need a ride to the hospital for my mother Thursday,' or 'Kitchen sink is leaking, need a plumber.'"
          aria-describedby="rawText-hint"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <Hint><span id="rawText-hint">Plain language is perfect. Personal contact details are auto-removed before AI and storage.</span></Hint>
          <span className={`font-mono text-xs tabular-nums ${count < 10 ? "text-red-500" : count > MAX - 200 ? "text-amber-600" : "text-surface-400"}`}>
            {count}/{MAX}
          </span>
        </div>
      </div>

      <fieldset className="rounded-xl border border-surface-200 p-4">
        <legend className="px-1 text-sm font-medium text-surface-700">When &amp; how</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="timing">When do you need it?</Label>
            <Select id="timing" value={timing} onChange={(e) => setTiming(e.target.value)}>
              <option value="urgent">Urgent, as soon as possible</option>
              <option value="this_week">This week</option>
              <option value="flexible">Flexible</option>
              <option value="scheduled">On a specific day</option>
            </Select>
          </div>
          {timing === "scheduled" ? (
            <div>
              <Label htmlFor="neededBy">Which day?</Label>
              <Input id="neededBy" type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </div>
          ) : null}
        </div>
        <label className="mt-3 flex items-center gap-2.5 text-sm font-medium text-surface-700">
          <input type="checkbox" checked={inPerson} onChange={(e) => setInPerson(e.target.checked)}
            className="h-4 w-4 rounded border-surface-300 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
          This needs someone in person (not remote)
        </label>
      </fieldset>

      <fieldset className="rounded-xl border border-surface-200 p-4">
        <legend className="px-1 text-sm font-medium text-surface-700">Preferences (optional)</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="requiredGender">Helper should be</Label>
            <Select id="requiredGender" value={requiredGender} onChange={(e) => setRequiredGender(e.target.value)}>
              <option value="">Anyone</option>
              <option value="male">Brothers only</option>
              <option value="female">Sisters only</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="languages">Language(s)</Label>
            <Input id="languages" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Arabic, Urdu" />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paterson, NJ" />
          </div>
        </div>
      </fieldset>

      <div className="rounded-xl border border-surface-200 p-4">
        <label className="flex items-center gap-2.5 text-sm font-medium text-surface-700">
          <input
            type="checkbox"
            checked={onBehalf}
            onChange={(e) => setOnBehalf(e.target.checked)}
            className="h-4 w-4 rounded border-surface-300 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          I&apos;m asking on behalf of an organization
        </label>
        {onBehalf ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="orgName" required>Organization name</Label>
              <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Masjid Al-Noor" maxLength={120} />
            </div>
            <div>
              <Label htmlFor="orgType" required>Type</Label>
              <Select id="orgType" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
          </div>
        ) : null}
      </div>

      <Button type="submit" size="lg" loading={loading} disabled={!valid} className="w-full">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {loading ? "Understanding your request…" : "Post my request"}
      </Button>
    </form>
  );
}
