<div align="center">

# Awn (عَوْن)
### Community mutual aid, coordinated safely

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase_pgvector-3ECF8E)](https://supabase.com/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688)](https://fastapi.tiangolo.com/)

**Awn helps Muslim community members find and coordinate practical, volunteer help—from meals and rides to janāzah support, repairs, tutoring, and more.**

[Live Demo](#) • [Pitch Deck](#) • [System Architecture](#system-architecture) • [Getting Started](#quick-start)

</div>

---

## What Awn does

1. A member describes a need in plain language.
2. The API sanitizes and screens it, then turns it into a structured request.
3. Members can offer help, or a requester can find compatible helpers.
4. Both parties must accept before chat opens. The requester confirms when help is complete.

The app supports individual and organization requests, timing and in-person preferences, gender and language preferences, local matching, notifications, member reports, blocks, and community vouches.

---

## Technical Architecture

- **Frontend:** Next.js 14 (App Router, Server Components, Streaming SSR, Tailwind CSS, Radix UI).
- **API:** FastAPI verifies Supabase bearer tokens and performs all protected mutations.
- **Intelligence Layer:** Claude scopes and screens content; Gemini produces 768-dimensional embeddings.
- **Database & realtime:** Supabase PostgreSQL with `pgvector`, RLS, and Realtime message delivery.
- **Matching:** Candidates are ordered by a combined relevance score (semantic fit plus relevant experience, language, and city). The UI intentionally shows a qualitative match signal rather than an uncalibrated cosine-similarity percentage.

## Safety model

- Needs are sanitized and screened before they are persisted.
- Chat is available only after both members accept a connection. The browser can read messages through RLS, but cannot insert them directly.
- Every send goes through `POST /messages`, which verifies participation and active status, checks mutual blocks, applies a per-member rate limit, redacts contact identifiers, and performs AI plus keyword safety screening before the service inserts the message.
- Blocking is mutual across discovery, matching, invitations, and chat. The match RPC receives the requesting member ID and excludes either side of a block before ranking candidates.
- The database migration `022_match_and_chat_safety.sql` must be applied with the rest of `supabase/migrations` before deploying this version.

---

## Quick Start

### Prerequisites
- Node.js >= 18.x
- Supabase CLI or hosted PostgreSQL instance with `pgvector`
- Python 3.11+
- Anthropic and Gemini API keys (for content processing and embeddings)

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

# 6. In another terminal, launch the API
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
