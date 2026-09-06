<div align="center">

# Awn (عَوْن)
### The Decentralized Talent & Capacity Infrastructure for the American Muslim Ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase_pgvector-3ECF8E)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/AI-Autonomous_Scope_Engine-412991)](https://openai.com/)

**Unlocking billions in latent human capital across community enterprises, institutions, and the emerging workforce.**

[Live Demo](#) • [Pitch Deck](#) • [System Architecture](#system-architecture) • [Getting Started](#quick-start)

</div>

---

## Executive Summary

The American Muslim demographic represents **$100B+ in annual consumer spending power** and one of the most disproportionately educated, tech-literate professional populations in North America. 

Yet the ecosystem remains fundamentally fragmented:
- **100,000+ Muslim-owned businesses & civic institutions** struggle with operational debt, digital transformation, and capacity bottlenecks.
- **Top-tier tech, finance, and creative talent** operate in corporate silos, seeking purposeful ways to deploy high-leverage skills.
- **Emerging university talent** is locked out of verified, production-grade portfolio experience.

**Awn** is the intelligent coordination layer that dismantles these silos. It converts unstructured institutional bottlenecks into bounded, high-impact capacity sprints—matched semantically to top talent in seconds.

---

## How It Works: The Autonomous Capacity Engine
ORGANIZATIONAL BOTTLENECK                AI TASK ARCHITECT                  VETTED TALENT NETWORK
┌─────────────────────────┐             ┌────────────────────┐             ┌────────────────────────┐
│ "Our relief pantry line │             │ • Structured Specs │             │ • Senior Cloud Eng     │
│  takes 2 hours and our  │ ──────────> │ • Bounded Sprints  │ ──────────> │ • Junior Web Developer │
│  inventory is broken."  │             │ • Milestones & KPIs│             │ • Product Designer     │
└─────────────────────────┘             └────────────────────┘             └────────────────────────┘
│
[pgvector Cosine Match]
│
▼
┌─────────────────────────────┐
│   1-Click Team Deployment   │
│   & Verified Proof-of-Work  │
└─────────────────────────────┘


### 1. Autonomous Project Decomposition
No complex RFPs or job descriptions required. Non-profit leads and small business founders submit a 30-second voice note or raw paragraph. Our LLM pipeline transforms ambiguity into **production-ready sprint roadmaps**, complete with time caps, milestones, and deliverable checklists.

### 2. High-Dimensional Semantic Matchmaking
Powered by PostgreSQL `pgvector`, Awn computes high-dimensional embeddings across user skill graphs, verified credentials, and organizational urgency to surface optimal contributors in milliseconds.

### 3. On-Chain & Verified "Proof of Impact"
Contributors build verified, immutable track records. Every completed sprint generates verifiable project artifacts that feed directly into resumes, LinkedIn profiles, and institutional grant reporting.

---

## The Market Opportunity

+---------------------------------------------------------------------------------------+
|  TAM: $100B+ US Muslim Consumer & Commercial Market                                    |
+---------------------------------------------------------------------------------------+
|  SAM: 100K+ Muslim-owned Small Businesses, Non-Profits & Regional Councils            |
+---------------------------------------------------------------------------------------+
|  SOM: $450M Annual Addressable Capacity, Services & Professional Placement Market      |
+---------------------------------------------------------------------------------------+
Awn sits at the intersection of **Enterprise SaaS**, **Workforce Development**, and **Civic Infrastructure**:
- **B2B Capacity SaaS:** Premium project management & staffing intelligence for high-growth halal brands, schools, and federations.
- **Talent Discovery Pipeline:** High-signal technical recruiting engine connecting top-tier enterprises with vetted minority tech talent.
- **Ecosystem Network Effects:** Every completed sprint enriches the community's sovereign knowledge base, driving compounding organic retention.

---

## Technical Architecture

Built for planetary scale, enterprise reliability, and zero-latency performance.

- **Frontend:** Next.js 14 (App Router, Server Components, Streaming SSR, Tailwind CSS, Radix UI).
- **Intelligence Layer:** OpenAI GPT-4o structured JSON extraction + `text-embedding-3-small` vectorization.
- **Database & Compute:** Supabase PostgreSQL 15 with native `pgvector` indexing.
- **Security:** Strict Row Level Security (RLS) policies, end-to-end sanitized inputs, and cryptographic credential verification.

---

## Quick Start

### Prerequisites
- Node.js >= 18.x
- Supabase CLI or hosted PostgreSQL instance with `pgvector`
- OpenAI API Key

### Installation

```bash
# 1. Clone repository
git clone [https://github.com/your-org/awn.git](https://github.com/your-org/awn.git)
cd awn

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# 4. Run database migrations
npx supabase db push

# 5. Launch local development server
npm run dev