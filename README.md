# AI Interviewer

A conversational AI interviewer that supports multiple interview modes (screening, behavioral, biography, contradiction check), voice-enabled chat, and position-based flows with optional job-description analysis.

## Features

- **Interview modes (1–5)** — Per-question mode: strict screening (1), hints (2), list-only (3), biographer (4), contradiction check (5). Mode controls evaluation and follow-up behavior.
- **Templates** — Built-in and custom templates (questions, intro, conclusion, reminder). Start from template or save current questions as a template.
- **Positions** — Create positions (e.g. “Janitor at Company X”, “Biography for Grandma Betty”) with optional type (job / biography / screening) and link to a template. Resume list shows instance and position.
- **New position from job description** — Paste or upload a job description, or paste a URL to a JD; an LLM generates 5–10 screening questions and a suggested job title. Create a position and a new template from the result in one flow. Supported inputs: plain text, **.txt / .pdf / .docx** files, or **URLs** (HTML/PDF/DOCX); text is extracted server-side via `POST /api/jd/extract`.
- **Demo flow (no account)** — From the landing hero, paste or upload a JD or paste a URL → generate questions → customize settings → generate a shareable interview link. **Claim**: after signing in (or signing up), add the demo position to your account so it appears in admin; or use “Add to my account” on the demo done page when already signed in.
- **Voice-enabled chat** — Text-to-speech for AI questions and speech-to-text for user responses (Chrome/Edge recommended).
- **Persistence** — When Supabase is configured, positions, custom templates, and interview instances/sessions use Supabase; otherwise instances and sessions use localStorage. Resume a previous interview; the agent receives a brief from prior sessions.
- **Intro, conclusion, reminder** — Optional intro before the first question and conclusion after all questions (per template). One-time disengagement reminder when the interviewee dismisses the interview.
- **Biography generation** — Turn interview conversations into narrative biographies (for biographer-style interviews).
- **Debug panel** — Optional right-hand panel with full history of steps (thinking, tool calls) for the current conversation.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk (admin auth); create an app at https://clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```
Enable **Organizations** in the Clerk Dashboard so admins can create/join an org; data is scoped by organization. Optional: `SUPERADMIN_USER_IDS=user_xxx,user_yyy` (comma-separated Clerk user IDs) to allow those users to use "View as org" in admin. Optional: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` if you use custom paths.

**Supabase (database):** When set, positions, custom templates, and interview instances/sessions are stored in Supabase instead of localStorage. Run the SQL in [supabase/schema.sql](supabase/schema.sql) in your Supabase project, then add:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
For client-side access (optional), add `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Browser compatibility

- **Voice input**: Chrome or Edge (Web Speech API).
- **Voice output**: All modern browsers.
- **Fallback**: Type responses if voice input is unavailable.

## Usage

**Demo (no account):** On the landing page, paste a job description or URL, or upload a .txt/.pdf/.docx file → submit → review/edit questions and position name → settings (voice, intro, etc.) → generate a shareable interview link. To keep the position in your account: sign in (or sign up) and use “Add to my account” on the done page, or sign in with “Sign in” (redirects to claim after login); the demo is then moved to your org and appears under Admin → Positions.

**Admin / full flow:**
1. **Position (optional)** — Choose a position from the dropdown to load its template; or leave “None”.
2. **Template** — Choose “Start from template” (built-in or custom) or “New position from JD” to paste/upload a job description or URL and generate questions (supports .txt, .pdf, .docx and URLs).
3. **Start** — The AI sends an intro (if set) and the first question.
4. **Respond** — Use voice (microphone) or type. In screening modes the agent evaluates answers and moves on; in biographer mode it asks follow-ups and tracks entities.
5. **Resume** — Pick a saved interview instance from the “Resume” dropdown to continue where you left off.
6. **Conclusion** — After all questions, the agent sends the template conclusion (if set).
7. **Create Story** — For biographer-style interviews, generate a biography from the conversation.
8. **Reset** — Start a new conversation (creates a new interview instance).

## Project structure

- `app/` — Next.js app router: pages and API routes (`/api/chat`, `/api/analyze-jd`, `/api/jd/extract`, `/api/demo/create`, `/api/demo/create-instance`, `/api/demo/claim`, `/api/review-historical`, `/api/biography`, `/api/wordcount`).
- `components/` — React UI (ChatInterface, ConfigPanel, MessageBubble, landing HeroInput, etc.).
- `lib/` — OpenAI chat and tools (evaluateAnswer, analyzeJobDescription, checkAnswer, detectDisengagement, reviewForContradiction), JD extractors (PDF, DOCX, HTML), persistence, voice.
- `lib/constants/` — Built-in templates, JD extract limits (`jdExtract.ts`), demo org and cookie (`demo.ts`).
- `types/` — TypeScript types (Question, InterviewTemplate, PositionRecord, InterviewInstanceRecord, SessionRecord, etc.).
- `docs/` — Documentation: [docs/README.md](docs/README.md), [docs/requirements.md](docs/requirements.md), [docs/interview-modes-and-templates.md](docs/interview-modes-and-templates.md).

## Documentation

- **[docs/requirements.md](docs/requirements.md)** — Implemented and planned requirements (terminology, positions, JD extract and analyze flow, demo flow and claim, tools, APIs).
- **[docs/interview-modes-and-templates.md](docs/interview-modes-and-templates.md)** — Interview modes and template design.
