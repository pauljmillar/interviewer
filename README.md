# Screen AI — AI Interviewer Platform

A Next.js SaaS platform for AI-powered candidate screening. Screen AI conducts structured, consistent first-round interviews with every candidate and surfaces a ranked shortlist for the hiring team to review.

## Features

### Core interview engine
- **Interview modes (1–5)** — Per-question mode: strict screening (1), hints (2), list-only (3), biographer (4), contradiction check (5). Mode controls evaluation and follow-up behaviour.
- **Templates** — Built-in and custom templates (questions, intro, conclusion, reminder). Start from a template or save current questions as a template.
- **Positions** — Create positions with optional type (job / biography / screening) and link to a template.
- **New position from job description** — Paste or upload a JD (plain text, `.txt / .pdf / .docx`, or URL); an LLM generates 5–10 screening questions and a suggested title. Supported via `POST /api/jd/extract`.
- **Demo flow (no account)** — From the landing hero, paste/upload a JD → generate questions → customise settings → get a shareable interview link. After signing in, claim the demo position into your account.
- **Voice-enabled chat** — TTS for AI questions and STT for user responses (Chrome/Edge recommended).
- **Persistence** — Positions, templates, and interview instances stored in Supabase; falls back to localStorage when Supabase is not configured.
- **Biography generation** — Turn biographer-mode conversations into narrative biographies.

### Public marketing site
- **Retro design system** — All public-facing pages (landing, `/ai-interviewer`, `/integrations`, `/blog`, `/interview/*`) and the admin dashboard share a unified retro theme. See [`theme-retro.html`](theme-retro.html) for the full living style guide: colour swatches, typography scale, component examples, and usage notes.
- **Blog** — Public blog listing and post pages. Thumbnails stored in S3.
- **Privacy page**, smooth-scroll nav, retro header with dropdowns.

### Admin
- **Admin → Positions / Templates / Interviews / Settings** — Org-scoped management.
- **Admin → Blog** — Rich text editor (Tiptap), cover image upload, publish/schedule/archive. (Superadmin only.)
- **Admin → API Keys** — Create and revoke Bearer tokens for the v1 API. (Superadmin only.)
- **Admin → Art Config** — JSON editor for geometric art generation parameters, with inline PNG/GIF preview. (Superadmin only.)
- **Email invitations** — Candidate invite emails sent via Brevo.
- **Org logo** — Upload and display organisation logo.

### v1 API
Bearer-token API for programmatic blog management. See [`docs/api-v1.md`](docs/api-v1.md) for full reference.

| Endpoint | Description |
|---|---|
| `GET /api/v1/topics` | List published post slugs + titles |
| `GET /api/v1/posts` | List posts (filter by status, tag, date) |
| `POST /api/v1/posts` | Create a post (supports inline image upload) |
| `GET /api/v1/posts/:slug` | Fetch a single post |
| `PATCH /api/v1/posts/:slug` | Update a post |
| `DELETE /api/v1/posts/:slug` | Soft-delete (archive) a post |
| `POST /api/v1/images` | Upload an image to S3 |
| `POST /api/v1/generate-art` | Generate geometric art PNG or animated GIF |

### Geometric art generation
Pure server-side canvas rendering via `@napi-rs/canvas`. Seeded PRNG guarantees deterministic output for the same `seed` + `bgIndex`. Config (palette, sizes, frame count, etc.) is stored in Supabase `art_config` and editable in the admin UI.

---

## Design system

The entire product — marketing pages, admin dashboard, and interview UI — uses a single retro design system. **[`theme-retro.html`](theme-retro.html)** is the living style guide; open it in a browser to see colour swatches, typography specimens, spacing, border tokens, and component examples.

### Key tokens

| Token | Value | Usage |
|---|---|---|
| `--retro-bg-base` | `#0D0D0D` dark / `#F5F5F5` light | Page background |
| `--retro-bg-surface` | `#141414` dark / `#FFFFFF` light | Cards, panels, header |
| `--retro-bg-raised` | `#1C1C1C` dark / `#F0F0F0` light | Inputs, hover states |
| `--retro-border-color` | amber `rgba(242,138,15,0.22)` dark / `rgba(0,0,0,0.12)` light | All borders |
| `--retro-text-primary` | `#FFE7BD` dark / `#1A1A1A` light | Headings, primary content |
| `--retro-text-secondary` | `rgba(255,231,189,0.68)` dark | Body text |
| `--retro-text-muted` | `rgba(255,231,189,0.42)` dark | Labels, timestamps |
| `--retro-grid-color` | `rgba(63,138,140,0.07)` | Teal grid background |
| `#F28A0F` | amber | Primary CTA buttons, active nav, links |
| `#E5340B` | red | Destructive actions, hot accent |
| `#3F8A8C` | teal | Cool accent, eyebrow labels |

### Rules for new UI
- **Font**: `'Helvetica Neue', Helvetica, Arial, sans-serif` — applied via `font-landing` (public pages) or `font-retro-admin` (admin).
- **Buttons**: Primary = `bg-[#F28A0F] hover:bg-[#d47b0a] text-white`. Destructive = `border-red-* text-red-*`. Secondary = `border-[var(--retro-border-color)] text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)]`.
- **Cards**: Add class `admin-card` alongside the border to get the amber top-gradient accent line.
- **No green `#3ECF8E`**: that was the previous accent; the retro accent is amber `#F28A0F` everywhere.
- **Semantic status badges are exempt**: `bg-green-100 text-green-700` (active/published), `bg-amber-* text-amber-*` (draft/pending), `bg-red-* text-red-*` (error/revoked) — these convey meaning and must not be recoloured.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=sk-...

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk (admin auth) — https://clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: comma-separated Clerk user IDs with superadmin access
SUPERADMIN_USER_IDS=user_xxx,user_yyy

# Supabase (database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key   # optional, for client-side access

# S3 (image storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=your-bucket

# Brevo (candidate email invitations)
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=hello@yourdomain.com
BREVO_SENDER_NAME=Screen AI
```

Enable **Organizations** in the Clerk Dashboard — data is scoped by organization.

### 3. Database migration

Run the SQL in [`supabase/schema.sql`](supabase/schema.sql), then add the art config table:

```sql
create table art_config (
  id         integer primary key default 1,
  config     jsonb not null,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
app/
  page.tsx                        Landing page (retro theme)
  ai-interviewer/page.tsx         AI Interviewer feature page
  integrations/page.tsx           Integrations page
  blog/                           Public blog listing + post pages
  admin/                          Admin dashboard
    positions/, templates/,
    interviews/, settings/        Org management
    blog/                         Blog editor (superadmin)
    api-keys/                     API key management (superadmin)
    art-config/                   Art generation config (superadmin)
  api/
    v1/                           Public v1 API (Bearer token)
      posts/, images/, topics/,
      generate-art/
    admin/                        Admin-only API routes
      api-keys/, art-config/
    chat/, analyze-jd/,
    jd/extract/, demo/,
    biography/, ...               Interview engine routes

components/
  landing/                        Retro landing components + buttons
  admin/                          AdminLayout, sidebar nav
  blog/                           PostCard, ThumbnailImage

lib/
  art/                            Geometric art generation
    config.ts                     ArtConfig type + DEFAULT_CONFIG
    prng.ts                       Seeded PRNG helpers
    gif.ts                        Pure-JS LZW encoder + GIF builder
    compose.ts                    composePNG / composeGIF
  server/
    apiAuth.ts                    Bearer token validation
    apiKeyStore.ts                API key CRUD
    supabaseBlogStore.ts          Blog post CRUD
    supabaseOrgSettings.ts        Org settings
  openai/, jd/, persistence/,
  voice/, tools/                  Interview engine internals

docs/
  api-v1.md                       v1 API reference
```

---

## Browser compatibility

- **Voice input**: Chrome or Edge (Web Speech API).
- **Voice output**: All modern browsers.
- **Fallback**: Type responses if voice input is unavailable.

---

## Documentation

- **[docs/api-v1.md](docs/api-v1.md)** — Full v1 API reference with curl examples.
- **[docs/requirements.md](docs/requirements.md)** — Implemented and planned requirements.
- **[docs/interview-modes-and-templates.md](docs/interview-modes-and-templates.md)** — Interview modes and template design.
