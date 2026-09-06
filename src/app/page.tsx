import Link from "next/link";
import {
  ArrowRight,
  Users,
  MessageSquareText,
  ShieldCheck,
  Search,
  HandHeart,
  HeartHandshake,
  MapPin,
  Languages,
  BadgeCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CATEGORIES } from "@/lib/domains";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        {/* ─── HERO ─── */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Background mesh */}
          <div className="absolute inset-0 gradient-mesh" />
          <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-brand-500/5 blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-20">
            <div className="max-w-3xl">
              {/* Eyebrow */}
              <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 mb-6">
                <Sparkles className="h-4 w-4" />
                Muslims helping Muslims · عَوْن
              </div>

              {/* Headline */}
              <h1 className="animate-slide-up font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-surface-950 tracking-tight leading-[1.1]">
                When one of us needs help,{" "}
                <span className="text-gradient">the ummah shows up</span>
              </h1>

              {/* Subheadline */}
              <p className="animate-slide-up stagger-1 mt-6 text-lg sm:text-xl text-surface-600 leading-relaxed max-w-2xl">
                From a janāzah at dawn to a ride to the hospital, a leaking pipe
                to a child&apos;s first Qur&apos;an lesson. Say what you need in
                your own words, and a brother or sister nearby steps forward.
                Free, always, purely for the sake of Allah.
              </p>

              {/* CTAs */}
              <div className="animate-slide-up stagger-2 mt-8 flex flex-wrap gap-4">
                <Link href="/login" className="btn-brand text-base px-8 py-4 group" id="hero-cta-intake">
                  Ask for help
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="btn-outline text-base px-8 py-4"
                >
                  See how it works
                </Link>
              </div>

              {/* Stats */}
              <div className="animate-slide-up stagger-3 mt-14 grid grid-cols-3 gap-6 max-w-md">
                {[
                  { value: "$0", label: "Always, never for a fee" },
                  { value: "15+", label: "Ways to serve each other" },
                  { value: "100%", label: "Volunteer-powered" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl sm:text-3xl font-display font-bold text-surface-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-surface-500 mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="badge-brand text-sm">How it works</span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight">
                From a need to a neighbor in{" "}
                <span className="text-gradient">three steps</span>
              </h2>
              <p className="mt-4 text-surface-500 leading-relaxed">
                No forms, no jargon, no cost. Tell us what you need the way
                you&apos;d tell a friend, and Awn does the rest.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  icon: MessageSquareText,
                  title: "Say it in your own words",
                  description:
                    "“My father passed away, we need help with the janāzah tomorrow.” “Kitchen sink is leaking.” “Can someone teach my son Qur'an?” Plain language is perfect.",
                  accent: "from-brand-500 to-brand-600",
                },
                {
                  step: "02",
                  icon: Search,
                  title: "We understand & connect you",
                  description:
                    "Awn shapes your words into a clear request, shares it with your local community, and surfaces the people who've done exactly this kind of help before.",
                  accent: "from-blue-500 to-blue-600",
                },
                {
                  step: "03",
                  icon: HeartHandshake,
                  title: "Meet & help, in trust",
                  description:
                    "Chat right in the app, with gender, language, and locality preferences respected. Give and receive as Sadaqah Jāriyah, never for a fee.",
                  accent: "from-emerald-500 to-emerald-600",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group relative rounded-3xl border border-surface-200 bg-surface-50/50 p-8 transition-all duration-300 hover:border-surface-300 hover:shadow-glass hover:-translate-y-1"
                >
                  {/* Step number */}
                  <span className="text-6xl font-display font-bold text-surface-100 absolute top-6 right-6 group-hover:text-surface-200 transition-colors">
                    {item.step}
                  </span>

                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} shadow-lg`}
                  >
                    <item.icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-surface-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-surface-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── WHAT PEOPLE HELP WITH ─── */}
        <section id="what" className="py-24 gradient-mesh">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <span className="badge-brand text-sm inline-flex">
              <HandHeart className="h-3.5 w-3.5 me-1" />
              Anything, really
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight">
              The everyday help a community runs on
            </h2>
            <p className="mt-4 text-surface-500 leading-relaxed max-w-2xl mx-auto">
              Big or small, urgent or planned, in person or remote. If it helps
              a brother or sister, it belongs here.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-2.5">
              {CATEGORIES.map((c) => (
                <span
                  key={c.value}
                  className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white/80 px-4 py-2 text-sm font-medium text-surface-700 shadow-sm"
                >
                  <span aria-hidden="true">{c.emoji}</span>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TWO SIDES ─── */}
        <section id="for-orgs" className="py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="badge-brand text-sm">Give &amp; receive</span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight">
                Everyone here does{" "}
                <span className="text-gradient">both</span>
              </h2>
              <p className="mt-4 text-surface-500 leading-relaxed">
                The one who needs a hand today lends one tomorrow. That&apos;s the
                whole idea.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* When you need a hand */}
              <div className="rounded-3xl border border-surface-200 bg-surface-50/50 p-8 transition-all duration-300 hover:shadow-glass hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg">
                  <HandHeart className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-surface-900">
                  When you need a hand
                </h3>
                <p className="mt-2 text-sm text-surface-500 leading-relaxed">
                  Asking for help is not a burden. It&apos;s how the ummah was
                  meant to work. Post your need with dignity and let people come
                  to you.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Describe it in plain words, no forms",
                    "Matched with people who've done it before",
                    "Your gender, language & locality respected",
                    "Free, always. It's Sadaqah, not a service",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-surface-600"
                    >
                      <CheckCircle2 className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* When you can lend one */}
              <div className="rounded-3xl border border-surface-200 bg-surface-50/50 p-8 transition-all duration-300 hover:shadow-glass hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                  <HeartHandshake className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-surface-900">
                  When you can lend one
                </h3>
                <p className="mt-2 text-sm text-surface-500 leading-relaxed">
                  Whatever you&apos;re good at, whether driving, cooking, fixing,
                  teaching, or just showing up, someone nearby needs exactly
                  that.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Pick the ways you're willing to help",
                    "Get surfaced to needs near you",
                    "Help on your own schedule, no commitment",
                    "Earn Sadaqah Jāriyah, every good deed counts",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-surface-600"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── TRUST ─── */}
        <section id="for-talent" className="py-24 gradient-mesh">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="badge-brand text-sm inline-flex">
                <ShieldCheck className="h-3.5 w-3.5 me-1" />
                Built on trust
              </span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight">
                Help that respects your{" "}
                <span className="text-gradient">deen &amp; comfort</span>
              </h2>
              <p className="mt-4 text-surface-500 leading-relaxed">
                Inviting someone into your home or your family&apos;s hardest
                moments takes trust. We designed for it from the start.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
              {[
                {
                  icon: Users,
                  title: "Mahram-aware",
                  desc: "Ask for brothers-only or sisters-only help. Your preference is honored in every match.",
                },
                {
                  icon: Languages,
                  title: "Your language",
                  desc: "Matched with people who speak Arabic, Urdu, Somali, or English, whatever you're comfortable in.",
                },
                {
                  icon: MapPin,
                  title: "Near you",
                  desc: "In-person help comes from your own local community, not strangers across the country.",
                },
                {
                  icon: BadgeCheck,
                  title: "Proven helpers",
                  desc: "See who's actually done this kind of help before, so you know you're in good hands.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-surface-200 bg-white/80 p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-900 shadow-lg">
                    <item.icon className="h-5 w-5 text-brand-400" />
                  </div>
                  <h3 className="mt-4 font-bold text-surface-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-surface-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA BANNER ─── */}
        <section className="py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl px-8 py-16 sm:px-16 sm:py-20">
              {/* Background */}
              <div className="absolute inset-0 bg-surface-950" />
              <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 to-transparent" />
              <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-brand-500/10 blur-3xl" />

              <div className="relative text-center max-w-2xl mx-auto">
                <p className="font-mono text-xs uppercase tracking-wider text-brand-400">
                  &ldquo;The believers, in their mutual mercy, are like one
                  body.&rdquo;
                </p>
                <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Be the answer to someone&apos;s duʿā
                </h2>
                <p className="mt-4 text-surface-300 leading-relaxed">
                  Whether you need help today or want to be there for someone who
                  does, join a community that shows up for each other.
                </p>
                <div className="mt-8 flex flex-wrap gap-4 justify-center">
                  <Link href="/login" className="btn-brand text-base px-8 py-4 group" id="footer-cta-intake">
                    Ask for help
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/login"
                    className="btn text-base px-8 py-4 border border-white/20 text-white hover:bg-white/10"
                  >
                    <Users className="h-5 w-5" />
                    Offer to help
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
