# Interviewer app documentation

This directory holds plan documentation, requirements, and design notes for the AI Interviewer project.

- **[interview-modes-and-templates.md](interview-modes-and-templates.md)** — Plan for interview modes (1–5), templates, and agent architecture (implemented; see requirements for current state).
- **[requirements.md](requirements.md)** — Product and feature requirements, including implemented behavior and terminology (Position, Interview instance, Session). Covers admin routes, position/template detail pages, and Supabase backend.
- **[landing-page-motion-and-imagery.md](landing-page-motion-and-imagery.md)** — Description of the landing page hero motion (circles migrating to triangle, pulse) and imagery (gradient, roll-in hover, color tokens). Intended to be extended as more motion or imagery is added.

## Terminology (implemented)

- **Position** — The role or project (job opening or biography project). Type: job | biography | screening.
- **Interview (definition)** — Reusable config: questions, intro, conclusion, reminder. Implemented as `InterviewTemplate`.
- **Interview instance** — One candidate’s or person’s run; has many sessions. Implemented as `InterviewInstanceRecord`.
- **Session** — One sitting / one conversation. Implemented as `SessionRecord`.

## Recent plans implemented

- **Intro, conclusion, reminder** — Per-template optional intro before Q1 and conclusion after all questions; reminder shown once when the interviewee dismisses the interview (with `detectDisengagement` tool).
- **Terminology refactor** — Types and persistence renamed: `InterviewRecord` → `InterviewInstanceRecord`, `InterviewSessionRecord` → `SessionRecord`; storage functions and UI variables aligned.
- **Position** — New entity: create positions (name, type), optional template link; “New position from JD” flow: paste/upload JD or URL → LLM generates 5–10 questions and suggested job title → create template + position.
- **JD extract (unified)** — Single endpoint `POST /api/jd/extract` accepts: (1) **text** — `{ type: 'text', content: string }`; (2) **file** — multipart with `.txt`, `.pdf`, or `.docx` (server-side extraction via pdf-parse, mammoth, cheerio); (3) **url** — `{ type: 'url', url: string }` (fetch with size limit, then extract from HTML/PDF/DOCX). Used by landing hero and demo; keeps analyze step within model context (HTML main-content extraction, character cap).
- **Demo flow and claim** — Unauthenticated demo at `/demo`: paste/upload/URL JD → analyze → review questions and position name → settings → generate shareable link. Position and instance live under a demo org (`DEMO_ORG_ID`). **Claim**: after sign-in or sign-up, user can “Add to my account” (demo done page when signed in) or land on `/claim-demo` (e.g. sign-in with `?next=/claim-demo`); `POST /api/demo/claim` moves the position, template, and instances to the user’s org. Cookie `demo_claim_id` set on demo create and cleared on claim.
- **Web app structure** — Global header on all pages; admin under `/admin` with URL-based routes. Auth via Clerk (Sign in with Google, etc.); admin pages and API routes (`/api/templates`, `/api/positions`, `/api/instances`) protected by middleware and `credentials: 'include'` on client fetches. Database: Supabase optional; when configured, positions, custom templates, and interview instances/sessions use Supabase (see [supabase/schema.sql](../supabase/schema.sql)).
- **Create Position (dedicated page)** — “Create New” on the positions list goes to `/admin/positions/new`. Primary flow: upload or paste job description (or URL) → extract text if needed → generate questions (POST `/api/analyze-jd`) → review → create template + position. Secondary: “Use existing template” or “From scratch” with name/type and optional questions. All flows POST to `/api/templates` and/or `/api/positions` then redirect to `/admin/positions`.
- **Position detail** — Clicking “View” on a position goes to `/admin/positions/[id]`. View and edit name, type, template link; Save (PATCH `/api/positions/[id]`) or Delete (DELETE then redirect to list). Back link to positions list.
- **Template detail** — Clicking “View” on a template goes to `/admin/templates/[id]`. Built-in templates: view-only (name, intro, conclusion, reminder, questions). Custom templates: full edit (same fields plus TTS voice dropdown and add/remove questions) and Delete (DELETE `/api/templates/[id]`). Voice is stored per template and copied to interview instances when created. API: GET/PATCH/DELETE `/api/templates/[id]`.
