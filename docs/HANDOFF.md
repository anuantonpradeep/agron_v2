# Agron V2 — Project Handoff

> Purpose: everything needed to resume this project if the working session ends —
> objective, vision, architecture, every milestone, every decision, every
> challenge and its resolution, current state, and how to pick up.
> Last updated: 2026-07-02.

---

## 1. Objective & Vision

**Objective:** Agron is an AI-powered trading-chart analysis and memory tool. A user
logs in (2FA), uploads trading-chart screenshots, and Claude produces a structured
reading of each chart. The user adds their own notes, saves charts to durable
storage, and asks natural-language questions grounded strictly in their own charts.

**Vision — a "second brain" for a trader.** Beyond one-off analysis, Agron should
remember the user's past chart analyses + their annotations (their reasoning at the
time) and reason over that history: answer reflective questions like *"why was the
entry I annotated not the best?"* or *"what biases show up in my setups?"* — like a
coach that explains reasons and surfaces patterns/biases.

**Non-negotiable principle: the AI never fabricates.** Analysis output is validated;
chat answers use only retrieved data, cite their sources `[n]`, and explicitly say
when they don't have enough information. Reflective claims (biases/patterns) must be
grounded in the user's own recorded evidence and cited, hedged where interpretive.

---

## 2. Tech Stack & Infrastructure

| Layer | Choice |
|---|---|
| Framework | Next.js **16.2.9** (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 + dark design tokens (`app/globals.css`) |
| AI | **Anthropic API — Claude Opus 4.8** (`claude-opus-4-8`) via `@anthropic-ai/sdk` (vision analysis + chat). NOT Bedrock (see decisions). |
| Object storage | **AWS S3** via `@aws-sdk/client-s3` |
| Auth | **AWS Cognito** (`@aws-sdk/client-cognito-identity-provider`) + `jose` for the session cookie |
| Local persistence | IndexedDB (chart queue), localStorage (chat) |
| Hosting | Vercel; source on a **public** GitHub repo `anuantonpradeep/agron_v2` |

**Deps of note:** `@anthropic-ai/sdk`, `@aws-sdk/client-s3`, `@aws-sdk/client-cognito-identity-provider`, `jose`.

---

## 3. Environment & How to Run

**Node:** the local Node 22 toolchain is at
`/Users/anuantonpradeep-multibank/.local/node-v22.22.0-darwin-arm64/bin` — prepend it
to `PATH` for `node`/`npm`/`git`. (It is not on the default PATH.)

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev      # http://localhost:3000
npm run build    # production build (also type-checks)
npm run lint     # eslint (flat config)
```

**Environment variables** (`.env.local` locally; must also be set in **Vercel** for the
deployed app — they are never committed):

```
ANTHROPIC_API_KEY=          # Claude vision + chat (requires API credits)
AWS_REGION=eu-west-1        # S3 region
AWS_ACCESS_KEY_ID=          # IAM user (scoped: s3:PutObject/GetObject/HeadObject/ListBucket)
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=agron-chart-analysis
COGNITO_REGION=eu-west-1
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=          # confidential client (has a secret)
COGNITO_CLIENT_SECRET=
SESSION_SECRET=             # 32+ byte random (openssl rand -base64 48). MUST be non-empty.
```

**AWS setup that exists:** an S3 bucket in `eu-west-1`; a Cognito user pool with one
user (the owner), self-signup off, **MFA = TOTP (authenticator app)**, confidential app
client with `USER_PASSWORD_AUTH` enabled. IAM user `agron-local-dev` (account
`143386573841`) is scoped (no `ListUsers`/`ListAllMyBuckets`).

---

## 4. Architecture

**Pages** (App Router): `/` Analyze, `/chat` Ask, `/login`.
**API routes:** `/api/analyze`, `/api/memories`, `/api/memories/reindex`, `/api/chat`,
`/api/auth/{login,new-password,verify,verify-setup,logout}`.
**Gate:** `proxy.ts` (Next.js "proxy" middleware — the renamed `middleware`) requires a
valid session for everything except `/login` and `/api/auth/*`. Unauth → pages redirect
to `/login?next=…`, API routes return 401.
**Shared state:** `ChartQueueProvider` (in `AppShell`, at the app root) holds the
session's charts so Analyze and Ask share them and they survive navigation.

**Analyze flow:** upload/drag images → `useChartQueue` runs each through the analyzer
(`/api/analyze`) sequentially → Claude vision + forced `submit_chart_analysis` tool →
validated `ChartAnalysis` → the 8 panels render. Notes (section 9) are per-chart.

**Save flow:** per-image "Save"/"Save all" → `/api/memories` writes
`users/{sub}/memories/{id}/original.<ext>` + `memory.json` (notes nested inside
analysis), and upserts the search catalog.

**Chat (Ask) flow — two-phase RAG:** client sends the question + session charts →
`/api/chat`: **(1) SELECT** — Claude picks relevant ids from a combined pool (session
charts + saved `catalog.json`); **(2) ANSWER** — fetches the selected fulls (session
from the request, saved via S3) and streams a grounded, reflective answer that cites
`[n]`. A `sources` SSE frame drives the workbench provenance panel; reasoning trace via
Opus summarized thinking.

---

## 5. Data Model & Storage

- **`ChartAnalysis`** (`lib/analysis-types.ts`): `metadata`, `marketContext`,
  `observations[]`, `interpretation`, `evidence[]`, `tradeIdeas`, `concepts[]`. All
  optional so panels render empty/loading/populated independently.
- **Stored Memory (S3 `memory.json`)**: `{ schemaVersion, id, savedAt, image{key,contentType,…},
  analysis: ChartAnalysis & { notes } }`. Notes are nested **inside** `analysis`.
  Serialized generically (field-agnostic) so new analysis sections persist without
  changing the save path.
- **Catalog (S3 `users/{sub}/catalog.json`)**: compact array — per memory `{ id, symbol,
  timeframe, savedAt, bias, phase, concepts, summary, notes }`. Updated on Save; rebuilt
  by `/api/memories/reindex`. Doubles as the future library index.
- **Session cookie**: encrypted (JWE, `jose`) `{ sub, email }`, 7-day, httpOnly,
  `secure` in production.
- **Local persistence**: IndexedDB `agron/queue` (one ordered record with image blobs +
  analysis + notes + statuses); localStorage `agron.chat` (conversation). Both cleared
  on sign-out.

**S3 key layout:**
```
users/{cognitoSub}/catalog.json
users/{cognitoSub}/memories/{id}/original.<ext>
users/{cognitoSub}/memories/{id}/memory.json
```

---

## 6. Milestones (chronological)

Commit hashes on `main` (newest last):

1. **`7ecc725` Initial project** — Next 16 + React 19 + Tailwind v4 scaffold; the
   8-section analysis screen built to the design, fully prop-driven with empty/loading
   states, no placeholder data.
2. **Milestone 1 — Real image upload** — multi-file select/drag, immediate object-URL
   preview, an upload queue with statuses, and a **pluggable `Uploader` abstraction**
   (so S3 could drop in later without UI changes). *(Note: a Milestone-2 that wired
   S3 + Bedrock was built and then **reverted** at the user's request to return to this
   clean state; the later AI work used the Anthropic API directly instead of Bedrock.)*
3. **`15a4fda` Per-image chart analysis** — `/api/analyze` (Claude Opus 4.8 vision +
   forced structured-output tool + validation); the simulated uploader became a real
   analyzer; panels populate. No persistence.
4. **`a5ce87d` Your Notes + speech-to-text** — section 9 notes textarea; dictation via
   the browser Web Speech API (progressive enhancement; mic shown only where supported).
5. **`a27ecfd` Save to S3** — `/api/memories` writes image + `memory.json`; per-image
   Save + Save all; notes nested in analysis; per-image save status.
6. **`9503c9c` Ask (chat) over session charts** — Cursor-style split (workbench +
   streaming chat), grounded, cites, reasoning trace; originally manual source basket.
7. **`4979b8d` Cognito login + TOTP 2FA** — custom multi-step login, `proxy.ts` gate,
   encrypted session cookie, per-user S3 namespacing (`users/{sub}/…`), sign-out.
8. **`f92a2be` Persist chart queue** — IndexedDB rehydration + autosave; survives refresh.
9. **`55960d0` Persist chat** — localStorage for the conversation.
10. **`5544b8c` Chat searches saved memories (S3) + session** — two-phase retrieval,
    per-user catalog, `/api/memories/reindex`, auto-search (basket retired).

---

## 7. Key Decisions (with rationale)

- **UI first, prop-driven, no fabricated data.** Every section renders empty/loading/
  populated states; nothing invented.
- **AI provider = Anthropic API directly (Claude Opus 4.8), not Bedrock.** Simpler for a
  no-infra pipeline (one API key). Bedrock is the documented scale-up (esp. for
  embeddings later). S3 + Cognito still use AWS directly.
- **Analysis is stateless / no image storage for analysis.** Image bytes are sent
  straight to `/api/analyze` and discarded; nothing stored until the user explicitly
  Saves. Structured output via a **forced tool** + server-side **validation** (fail →
  error, never partial fabrication).
- **Per-image, independent analysis** (not batched into one).
- **Persistence = S3 only (Aurora deferred).** Store image + `memory.json`; no relational
  DB yet. Serialization is field-agnostic → adding analysis sections never breaks save.
- **Save granularity:** individual + "Save all" (a loop of individual saves).
- **Notes nested inside the analysis** in the saved JSON (user's explicit request).
- **Chat grounding contract** preserved everywhere: answer only from provided/retrieved
  sources, cite `[n]`, decline if insufficient.
- **Second factor = TOTP authenticator app** (switched from email OTP after setup
  errors — see challenges). Invite-only; users created in the Cognito console.
- **Custom login UI** (not Cognito Hosted UI) to match the app's dark theme.
- **Session = our own encrypted JWE cookie** (7-day), verified in `proxy.ts`; we do NOT
  refresh Cognito tokens (re-login after expiry) — simpler, edge-safe.
- **Refresh persistence:** IndexedDB for the queue (needed for image blobs — localStorage
  can't hold them), localStorage for chat (text only). Cleared on sign-out.
- **Retrieval = "catalog + Claude selects", no embeddings yet.** Data is small; Claude's
  own semantic understanding selects relevant memories from a compact catalog. Bedrock/
  embeddings are the scale-up when the catalog outgrows the context window.
- **Two-phase retrieval (select → answer)** rather than mid-stream tool use — simpler,
  reuses the existing streaming path, very transparent.
- **Auto-search by default** over session + saved (manual basket retired).
- **Reasoning-critique only for now** — trade *outcomes* are not captured, so it critiques
  decision quality vs. the chart/notes, not results. Capturing outcomes is a future
  upgrade.

---

## 8. Challenges & Resolutions

- **No Node in the assistant's sandbox initially.** Code was written "blind" and verified
  by the user on Cursor; later the local Node 22 install (path above) was used to build/
  lint/commit.
- **Anthropic "credit balance too low" (400).** Analysis/chat require **API credits** on
  the Anthropic account (separate from any Claude.ai subscription). Not a code issue.
- **S3 "Save failed."** Root cause: `AWS_REGION` was `eu-east-1` (**not a real region** →
  DNS failure) and the bucket name didn't match. Fixed by setting the real region
  (`eu-west-1`) and exact bucket name; validated with `PutObject`/`ListBuckets` probes.
- **Cognito email-OTP setup errors → switched to TOTP.** Confirmed `USER_PASSWORD_AUTH`
  enabled and the confidential client needs **`SECRET_HASH`** on every call.
- **Login failed with misleading "Incorrect email or password", then "Authentication
  failed".** Real root cause: **`SESSION_SECRET` was present but empty** in `.env.local`
  (an earlier "already present" check matched the empty line and skipped filling it), so
  minting the session cookie threw *after* Cognito had actually authenticated. Fixed by
  setting a real 64-char secret and restarting the dev server. (Error messages were
  temporarily made verbose to diagnose, then reverted.)
- **`middleware.ts` deprecated in Next 16** → renamed to **`proxy.ts`** (`export function
  proxy`), the new convention.
- **`react-hooks/refs` lint errors** (writing `ref.current` during render) → moved the
  "latest ref" writes into effects; `npm run lint` is clean.
- **Secret hygiene.** A real key was once pasted into `.env.local.example` (a **tracked**
  template) — scrubbed back to a placeholder and verified it never reached git history.
  `.env.local` is gitignored. Every commit is checked to ensure no env/secret file is
  staged.
- **Images can't go in localStorage** → IndexedDB (stores `File`/`Blob`) for the queue.

---

## 9. Current State — what works

- **Auth + TOTP 2FA** — confirmed working by the user.
- **Save to S3** — confirmed working (files visible in the bucket).
- **Analysis, chat, retrieval, refresh-persistence** — build/lint-verified; analysis/chat
  require Anthropic credits to run.
- Build and lint are **clean**; every milestone is committed and pushed to `main`.
- Only `.claude/` (local tooling) is untracked; nothing else outstanding.

---

## 10. Backlog / Next Steps (not built)

| Item | Note |
|---|---|
| **Library / load view** | Can Save + search, but not yet *browse/reopen* saved memories in the UI. The `catalog.json` already supports it. Most natural next step. |
| **Capture trade outcomes** | Would let the coach critique *results & calibration*, not just reasoning. |
| **Reflection profile (background job)** | A periodic pass building a standing bias/pattern summary → the one place **Lambda or Vercel Cron** would be introduced. |
| **Embeddings / Bedrock** | Only needed when the catalog outgrows the context window (thousands of memories). |
| **Edit/delete saved memories** | No update/delete from the app. |
| **In-app user invites / password reset** | Users are console-created; no forgot-password flow. |
| **Per-user local isolation** | Local caches clear on sign-out but aren't namespaced by user (shared-browser edge case if not signed out). |
| **Automated tests** | Only `build` + `lint`; no test suite. |
| **Images in chat context** | Chat reasons over structured analysis text, not raw images. |

---

## 11. Repo & Workflow Conventions

- **Commit/push without asking permission** (a saved preference). Still: never stage a
  secret — always check that no `.env*`/secret file is in the staged set first, and
  exclude `.claude/`.
- **Commit message style:** short imperative subject + bullet body; end every commit with
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Use the Node path above for `git`/`npm` in this environment.
- **Public repo** — secrets live only in `.env.local` (gitignored) and Vercel env.
- Verify with `npm run build` (type-check) + `npm run lint` before committing.

---

## 12. Operational Gotchas

- **Vercel:** set all env vars (Cognito, `SESSION_SECRET`, AWS, Anthropic) in the project
  or login/save/analysis fail on the deployed app. `SESSION_SECRET` must be non-empty.
- **First-time retrieval:** click **"Sync saved memories"** on the Ask screen once (or
  `POST /api/memories/reindex`) to backfill the catalog for charts saved before the
  retrieval feature. Future saves index automatically.
- **Env changes require a dev-server restart** (read at startup).
- **Two Claude calls per chat question** (select + answer) — mind credit usage.
- Persistence is **per-browser**; cleared on sign-out.

---

## 13. File Map (key files)

**Pages / shell**
- `app/layout.tsx` — wraps everything in `AppShell`.
- `components/app/app-shell.tsx` — nav (Analyze/Ask), Sign out (clears local caches), hides nav on `/login`.
- `components/providers/chart-queue-provider.tsx` — shared session-chart state.
- `app/page.tsx` → `components/analysis/analysis-view.tsx` — Analyze screen (8 panels + notes).
- `app/chat/page.tsx` → `components/chat/chat-view.tsx` — Ask screen (workbench + chat).
- `app/login/page.tsx` → `components/auth/login-flow.tsx` — multi-step login.
- `proxy.ts` — auth gate.

**Analyze UI:** `components/analysis/{original-chart, metadata-panel, market-context-panel,
observations-panel, interpretation-panel, evidence-panel, trade-ideas-panel,
tags-concepts-panel, notes-panel}.tsx`, `use-dictation.ts`; `components/ui/primitives.tsx`.

**Upload/queue:** `lib/upload/{types, analyzer, memory-saver, use-chart-queue, queue-storage}.ts`.

**Analysis contract:** `lib/analysis-types.ts`, `lib/analysis/{chart-analysis-tool, validate}.ts`.

**AI routes:** `app/api/analyze/route.ts`, `app/api/chat/route.ts`.

**Persistence:** `app/api/memories/route.ts`, `app/api/memories/reindex/route.ts`,
`lib/aws/s3.ts`, `lib/memories/catalog.ts`.

**Chat plumbing:** `lib/chat/{types, stream-chat, chat-storage}.ts`.

**Auth:** `lib/auth/{session, cognito, flow, error}.ts`, `app/api/auth/*`.

---

## 14. How to Resume

1. Ensure `.env.local` is complete (see §3) and the dev server runs (`npm run dev`).
2. Read §6 (milestones) + §7 (decisions) to reconstruct context.
3. Check `git log --oneline` — the last commit is `5544b8c` (S3 retrieval).
4. Pick from §10 backlog. The strongest next milestone is the **library/load view**
   (browse/reopen saved memories) — the catalog already supports it.
5. Follow §11 conventions when committing.
