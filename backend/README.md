# Awn API (FastAPI)

Python backend for Awn. Verifies Supabase access tokens (bearer), talks to
Postgres **as the calling user** so Row-Level Security applies, runs the OpenAI
scope engine + embeddings, and enforces durable rate limits.

## Endpoints

| Method | Path              | Auth        | Purpose |
|--------|-------------------|-------------|---------|
| POST   | `/preview-sprint` | public      | Instant AI preview, no DB write, per-IP rate limit |
| POST   | `/scope-sprint`   | bearer      | Persist an AI-scoped sprint owned by the caller |
| POST   | `/match-talent`   | bearer      | Semantic match for a sprint you own (or admin) |
| POST   | `/handshake`      | bearer      | Claim a sprint (as yourself) |
| PATCH  | `/handshake`      | bearer      | Advance handshake state (accept/reject/complete) |
| PUT    | `/profile`        | bearer      | Create/update your profile (+embedding for talent) |
| POST   | `/admin/hand-match`   | admin   | Concierge hand-match |
| POST   | `/admin/sprint-status`| admin   | Concierge status change |
| GET    | `/health`         | public      | Liveness |

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in real values
uvicorn app.main:app --reload --port 8000
```

Interactive docs at `http://localhost:8000/docs`.

## Tests

```bash
pip install pytest
python -m pytest
```

## Docker

```bash
docker build -t awn-api .
docker run --env-file .env -p 8000:8000 awn-api
```

## Frontend wiring (Next.js)

The browser calls this service directly with the Supabase access token:

```ts
const { data: { session } } = await supabase.auth.getSession();
await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scope-sprint`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({ orgName, orgType, rawText }),
});
```

Set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000`) in the Next app and add
that Next origin to `FRONTEND_ORIGINS` here. The public landing preview calls
`/preview-sprint` **without** a token.

> Migration note: the legacy Next.js `/api/*` routes are superseded by this
> service. Once the frontend fetches point here, delete `src/app/api/*` and the
> now-unused `src/lib/services/*`, `src/lib/rate-limit.ts`, and TS `openai.ts`
> to avoid maintaining two backends.
