# Requirements

Product and feature requirements for the AI Interviewer project. Items marked *Implemented* are in the current codebase.

---

## Core interview flow

- *Implemented* **Interview modes (1–5)**  
  Per-question mode: screening (1), hints (2), list-only (3), biographer (4), contradiction check (5). Mode controls which tools run and how the agent responds.

- *Implemented* **Templates**  
  Built-in and custom interview templates (questions, intro, conclusion, reminder, optional TTS voice). Start from template or save current questions as a template.

- *Implemented* **Voice (TTS)**  
  Voice is configurable per template (OpenAI-style ids: alloy, echo, fable, onyx, nova, shimmer). When an interview instance is created from a template, the template’s voice is copied to the instance. The candidate experience uses the instance’s voice for browser TTS and for POST `/api/tts` when server-generated audio is used. Admin config panel can pick a browser voice; when loading a template or instance that has a voice set, the panel’s selection is initialized from it.

- *Implemented* **Persistence**  
  When Supabase is configured (see Database backend), positions, custom templates, and interview instances/sessions use Supabase. Otherwise localStorage is used for instances and sessions. Resume a previous interview; review-historical runs at session start to brief the agent.

- *Implemented* **Intro and conclusion**  
  Optional intro before the first question and conclusion after all questions (per template). Used for screening and biography flows.

- *Implemented* **Disengagement reminder**  
  When the interviewee dismisses the interview (e.g. "idk this is stupid"), show a one-time per-session reminder that responses are reviewed as a real interview; then re-ask the current question.

- *Implemented* **Screening reply wording**  
  Per-question `correctReply` / `incorrectReply` (e.g. "Great, because this job does not offer visa sponsorships. Let's move on."). Mode 1/2/3 append the next question when moving on so the agent completes all questions.

---

## Terminology and data model

- *Implemented* **Position**  
  A role or project (e.g. "Janitor at Company X", "Biography for Grandma Betty"). Has optional `type`: job | biography | screening. Links to one interview definition (template). Stored in Supabase `positions` table when configured (see [supabase/schema.sql](../supabase/schema.sql)).

- *Implemented* **Interview (definition)**  
  Reusable config: questions, intro, conclusion, reminder, optional voice. Implemented as **InterviewTemplate** (built-in in code; custom in Supabase when configured, else localStorage).

- *Implemented* **Interview instance**  
  One candidate's or person's run. Created when someone starts an interview. Has many sessions. Voice is copied from the template on create (optional override). Stored as **InterviewInstanceRecord** in Supabase `interview_instances` when configured.

- *Implemented* **Session**  
  One sitting / one continuous conversation. Stored as **SessionRecord** in Supabase `sessions` when configured (keyed by `interview_instance_id`).

---

## Positions and job descriptions

- *Implemented* **Create position**  
  Admin goes to `/admin/positions/new`. Primary flow: upload or paste job description (or URL) → text extracted via `POST /api/jd/extract` when needed → LLM generates 5–10 questions and suggested job title (POST `/api/analyze-jd`) → review → create template + position. Alternative: “Use existing template” or “From scratch” (name, type, optional questions). Position dropdown in header; selecting a position loads its template when `templateId` is set.

- *Implemented* **New position from job description**  
  On `/admin/positions/new` or in the **demo flow** (`/demo`), user pastes text, uploads a file, or pastes a URL. Supported formats: plain text; **.txt, .pdf, .docx** (server-side extraction); **URLs** (fetch then extract from HTML/PDF/DOCX with size limit). Single endpoint `POST /api/jd/extract` returns `{ text }`. LLM then analyzes the JD and returns suggested job title + 5–10 screening questions. Admin (or demo user) reviews, edits position name and questions, then creates the position and template.

- *Implemented* **Demo flow (no account)**  
  Landing hero: paste JD or URL, or upload .txt/.pdf/.docx → submit → `/demo?step=analyzing` → analyze JD → review questions and position name → settings (voice, intro, conclusion, etc.) → enter recipient name → generate shareable interview link. Position and instance are created under a demo org. **Claim**: if the user signs in (or signs up), they can add the demo to their account: from the demo "done" page, "Add to my account" (when already signed in) calls `POST /api/demo/claim` and redirects to `/admin`; or "Sign in" with `?next=/claim-demo` so after login they land on `/claim-demo`, which POSTs to `/api/demo/claim` and redirects to `/admin`. Claim moves the position, its template, and instances from the demo org to the user's org; cookie `demo_claim_id` is cleared.

---

## Tools and APIs

- *Implemented* **check-answer**  
  Compares user response to acceptable answers; question-aware evaluation (e.g. "Yes I was born in Chicago" accepted for work authorization). Used in modes 1 and 2.

- *Implemented* **detectDisengagement**  
  Classifies whether the last user message indicates the interviewee is dismissing the interview. Used to show the template reminder once per session.

- *Implemented* **review-for-contradiction**  
  Compares latest response to prior statements. Used in mode 5.

- *Implemented* **discover-entities**  
  Extracts entities and timeline from conversation. Used in modes 4 and 5.

- *Implemented* **review-historical**  
  Runs at session start when resuming; returns a briefing for the agent from prior sessions and question coverage.

- *Implemented* **POST /api/jd/extract**  
  Single endpoint for JD text extraction. Request: (1) `Content-Type: application/json`, body `{ type: 'text', content: string }` — passthrough/normalize; (2) `Content-Type: multipart/form-data`, field `file` — .txt, .pdf, or .docx (max 10 MB); (3) `Content-Type: application/json`, body `{ type: 'url', url: string }` — fetch URL (max 5 MB response, 15s timeout), extract from HTML/PDF/DOCX/plain text. Response: `{ text: string }`. Errors: 400 (invalid/empty), 413 (too large), 415 (unsupported file type), 502 (URL fetch failed). Used by landing hero and demo; HTML extraction prefers `<main>`/`<article>` and strips nav/footer/ads to reduce token usage.

- *Implemented* **POST /api/analyze-jd**  
  Request: `{ jobDescription: string }`. Response: `{ suggestedTitle: string, questions: Question[] }`. Uses LLM to extract a suggested job title from the JD and generate 5–10 screening questions. JD text is capped (e.g. 18k chars) to stay within model context.

---

## UI and configuration

- *Implemented* **Config panel**  
  Edit questions, mode, acceptable answers, follow-up prompt, correctReply/incorrectReply. Per-question mode selector.

- *Implemented* **Debug panel**  
  Optional right-hand panel showing full history of debug steps (thinking, tool calls). Resizable; header spans main content only so debug panel is full height.

- *Implemented* **Resume**  
  Dropdown lists saved interview instances (and position name when linked). Selecting one loads the latest session and runs review-historical.

---

## Admin routes (implemented)

- **Positions list** — `/admin/positions`. Table with filter by type; “Create New” links to `/admin/positions/new`; “View” links to `/admin/positions/[id]`.
- **Position detail** — `/admin/positions/[id]`. View and edit name, type, template; Save (PATCH) or Delete (DELETE). Back to list.
- **Create position** — `/admin/positions/new`. JD upload/paste/URL (with extract + generate questions), use existing template, or from scratch. Redirects to positions list on success.
- **Templates list** — `/admin/templates`. Table with filter by source (Built-in / Custom); “View” links to `/admin/templates/[id]`.
- **Template detail** — `/admin/templates/[id]`. Built-in: view-only. Custom: edit name, intro, conclusion, reminder, TTS voice (dropdown), and questions (add/remove/edit main question text); Save (PATCH) or Delete (DELETE). Back to list.
- **Demo and claim** — `/demo`: unauthenticated flow (JD → questions → settings → generate link). `/claim-demo`: runs after sign-in when `?next=/claim-demo`; POSTs to `/api/demo/claim` then redirects to `/admin`. Demo done page shows "Add to my account" when signed in (claims and redirects to admin).
- **Auth** — Clerk protects `/admin` and `/api/templates`, `/api/positions`, `/api/instances`. `/api/demo/*` is public (create, create-instance); claim requires auth inside handler. Client fetches use `credentials: 'include'`. Env: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Demo org: `DEMO_ORG_ID` in env for unauthenticated demo positions.

## Database backend (implemented)

- *Implemented* **Supabase (optional)**  
  When `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, positions, custom templates, and interview instances/sessions use Supabase. Run [supabase/schema.sql](../supabase/schema.sql) in the Supabase SQL Editor to create tables: `positions`, `interview_templates`, `interview_instances`, `sessions`. Aligns with terminology and API routes (GET/POST/PATCH/DELETE for positions and templates).

  **Session reads:** For consistent reads after refresh (no stale session), set **`SUPABASE_PRIMARY_URL`** to your project’s Primary API URL. With one URL today, use the same as `NEXT_PUBLIC_SUPABASE_URL`. When you add Read Replicas, use the dedicated Primary URL from Dashboard → Project Settings → API (Source: Primary).
