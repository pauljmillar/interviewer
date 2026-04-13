# Interviewer app documentation

This directory holds plan documentation, requirements, and design notes for the AI Interviewer project.

- **[interview-modes-and-templates.md](interview-modes-and-templates.md)** — Plan for interview modes (1–5), templates, and agent architecture (implemented; see requirements for current state).
- **[requirements.md](requirements.md)** — Product and feature requirements, including implemented behavior and terminology (Position, Interview instance, Session). Covers admin routes, position/template detail pages, and Supabase backend.
- **[landing-page-motion-and-imagery.md](landing-page-motion-and-imagery.md)** — Description of the landing page hero motion (circles migrating to triangle, pulse) and imagery (gradient, roll-in hover, color tokens). Intended to be extended as more motion or imagery is added.

## Terminology (implemented)

- **Position** — The role or project (job opening or biography project). Type is stored in the database but always defaults to `'job'` for new positions; the type selector has been removed from the UI.
- **Interview (definition)** — Reusable config: questions, intro, conclusion, reminder. Implemented as `InterviewTemplate`.
- **Interview instance** — One candidate’s or person’s run; has many sessions. Implemented as `InterviewInstanceRecord`.
- **Session** — One sitting / one conversation. Implemented as `SessionRecord`.

## Recent plans implemented

- **Admin dashboard** — `/admin` now redirects to `/admin/dashboard`. New dashboard page shows four stat cards (links generated, interviews started, interviews completed, positions) fetched from `GET /api/admin/stats` (parallel `COUNT` queries scoped to the org). Below the cards: a plan summary card with usage bar (reusing `/api/billing/usage`) and quick-action links to common admin pages.

- **Billing success banner** — `/admin/billing?success=1` shows a dismissable confirmation banner. Message is plan-specific: PAYG confirms card-on-file and per-interview charge; subscription plans state the included count. Banner auto-dismisses after 10 s or on click. Implemented via `useSearchParams` (wrapped in Suspense per Next.js App Router requirements).

- **Intro, conclusion, reminder** — Per-template optional intro before Q1 and conclusion after all questions; reminder shown once when the interviewee dismisses the interview (with `detectDisengagement` tool).
- **Terminology refactor** — Types and persistence renamed: `InterviewRecord` → `InterviewInstanceRecord`, `InterviewSessionRecord` → `SessionRecord`; storage functions and UI variables aligned.
- **Position** — New entity: create positions (name, type), optional template link; “New position from JD” flow: paste/upload JD or URL → LLM generates 5–10 questions and suggested job title → create template + position.
- **JD extract (unified)** — Single endpoint `POST /api/jd/extract` accepts: (1) **text** — `{ type: 'text', content: string }`; (2) **file** — multipart with `.txt`, `.pdf`, or `.docx` (server-side extraction via pdf-parse, mammoth, cheerio); (3) **url** — `{ type: 'url', url: string }` (fetch with size limit, then extract from HTML/PDF/DOCX). Used by landing hero and demo; keeps analyze step within model context (HTML main-content extraction, character cap).
- **Demo flow and claim** — Unauthenticated demo at `/demo`: paste/upload/URL JD → analyze → review questions and position name → settings → generate shareable link. Position and instance live under a demo org (`DEMO_ORG_ID`). **Claim**: after sign-in or sign-up, user can “Add to my account” (demo done page when signed in) or land on `/claim-demo` (e.g. sign-in with `?next=/claim-demo`); `POST /api/demo/claim` moves the position, template, and instances to the user’s org. Cookie `demo_claim_id` set on demo create and cleared on claim.
- **Try our interview** — Landing "Try our interview" button calls `POST /api/demo/try-interview`, which creates a unique interview instance from the shared built-in template `demo-walkthrough` (explains how the process works); the shareable URL is opened in a new tab. No JD or config steps; shared template and org, one instance per click.
- **Web app structure** — Global header on all pages; admin under `/admin` with URL-based routes. Auth via Clerk (Sign in with Google, etc.); admin pages and API routes (`/api/templates`, `/api/positions`, `/api/instances`) protected by middleware and `credentials: 'include'` on client fetches. Database: Supabase optional; when configured, positions, custom templates, and interview instances/sessions use Supabase (see [supabase/schema.sql](../supabase/schema.sql)).
- **Create Position (dedicated page)** — “Create New” on the positions list goes to `/admin/positions/new`. Primary flow: upload or paste job description (or URL) → extract text if needed → generate questions (POST `/api/analyze-jd`) → review → create template + position. Secondary: “Use existing template” or “From scratch” with name/type and optional questions. All flows POST to `/api/templates` and/or `/api/positions` then redirect to `/admin/positions`.
- **Position detail** — Clicking “View” on a position goes to `/admin/positions/[id]`. View and edit name, type, template link; Save (PATCH `/api/positions/[id]`) or Delete (DELETE then redirect to list). Back link to positions list.
- **Template detail** — Clicking “View” on a template goes to `/admin/templates/[id]`. Built-in templates: view-only (name, intro, conclusion, reminder, questions). Custom templates: full edit (same fields plus TTS voice dropdown and add/remove questions) and Delete (DELETE `/api/templates/[id]`). Voice is stored per template and copied to interview instances when created. API: GET/PATCH/DELETE `/api/templates/[id]`.

- **Copy template** — A Copy button appears on each row of the templates list and on the template detail page (for both built-in and custom templates). Clicking it POSTs to `/api/templates` with the source template's content prefixed with “Copy of …”, creates a new custom template, and navigates to its detail page for editing.

- **Default TTS voice: nova** — The default voice for new templates and interview instances changed from `alloy` to `nova` (applied in `POST /api/tts`, `POST /api/tts/stream`, and the template voice dropdown default label).

- **Disengagement detection narrowed** — `lib/tools/detectDisengagement.ts` now flags only explicit vulgarity or frustration with the AI interview format (e.g. “it's just a bot”, “waste of time”). Short answers, incomplete sentences, “idk”, sarcasm, and on-topic but brief replies are explicitly excluded. The fallback heuristic is also tightened to match.

- **Position type hidden from UI** — The type selector (job / biography / screening) has been removed from position creation (JD, template, scratch flows) and the position edit form. `type: 'job'` is hardcoded for all new positions. Existing type values in the database are preserved on save. The Type column and filter dropdown have been removed from the positions list. The `type` column and API field remain unchanged in the backend.
