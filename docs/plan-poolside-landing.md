# Poolside.ai style adoption plan (landing page only)

## Scope

- **In scope**: The **landing page** ([app/page.tsx](app/page.tsx)) only. Use as much of Poolside's style as we can (font, colors, layout, motion).
- **Out of scope**: No changes to Header, about, pricing, admin, or other routes. Rest of site unchanged for now.

---

## What we're taking from Poolside (maximize use)

- **Typography**: Same or very close—use a public font that matches (e.g. Inter, Geist, DM Sans). Strong hierarchy: large headlines, smaller body, clear section headings.
- **Colors**: Match their palette as closely as possible (high-contrast neutrals + one accent). Minimal, professional.
- **Layout**: Generous whitespace, clear sections, short paragraphs, bold headings. Poolside-style section structure and spacing.
- **Motion**: Smooth scroll, subtle hover/transition, optional light scroll-triggered fade for sections.
- **Graphics**: Simple shapes, rounded corners, subtle gradients or dividers—in the same spirit (we don't copy their art).

We use **public** fonts and **inspired** colors; layout and structure can closely mirror their landing feel.

---

## Landing page content (sample)

### Hero / banner

- **Headline**: Value proposition around augmenting HR—e.g. "Augment your HR. Screen candidates in minutes, not hours."
- **Subcopy**: Sort through candidates much more quickly; HR staff spend less time on early screening; save the company time and money.
- **CTA**: Get 2 screening interviews free. Setup takes 90 seconds.
- **Primary CTA button**: e.g. "Start free" or "Get 2 free screenings" linking to sign-up or a clear next step.

### Pricing section

Three tiers:

- **Free** — Entry: 2 screening interviews, 90-second setup, try the product.
- **Basic** — Small teams: more screenings per month, basic support, defined limits.
- **Premium** — Larger HR: higher volume, priority support, advanced features.

Exact copy and limits can be placeholders; structure is Free / Basic / Premium with short bullets and a CTA per tier (e.g. "Get started" for Free).

---

## Implementation steps (landing only)

1. **Font and colors (landing or minimal globals)**  
   Add one font via `next/font/google` (e.g. DM Sans, Geist, Inter). Apply on landing (wrapper with font class or in layout). Define CSS variables for landing: headline, body/muted, accent. Use in [app/page.tsx](app/page.tsx) only. Optional: extend [tailwind.config.ts](tailwind.config.ts) with landing palette.

2. **Hero / banner**  
   Replace current home content with a full-width hero: headline, subcopy (HR value prop, save time/money), CTA ("2 screening interviews free, setup in 90 seconds") with primary button. Poolside-like spacing and new font/colors.

3. **Pricing section**  
   Section below hero with three cards: **Free**, **Basic**, **Premium**. Each: name, short bullet list (placeholder features), optional price or "Contact" for Basic/Premium. CTA on Free = start free. Style: clean cards, rounded corners, whitespace.

4. **Layout, motion, graphics**  
   Single-column, sectioned layout; `scroll-behavior: smooth`. Subtle transitions on buttons/links; optional light scroll fade (respect `prefers-reduced-motion`). Optional: thin divider or soft gradient between hero and pricing.

5. **No changes elsewhere**  
   Do not modify Header, about, pricing, admin, or other pages.

---

## Files to touch

- [app/page.tsx](app/page.tsx) — Full rewrite of landing: hero + pricing + new content.
- [app/globals.css](app/globals.css) — Optional: `scroll-behavior: smooth`; optional CSS variables for landing.
- [app/layout.tsx](app/layout.tsx) — Optional: font import (or wrap landing in a div with font class).
- [tailwind.config.ts](tailwind.config.ts) — Optional: extend theme with landing palette.

Scope is strictly the landing page so we can test the Poolside-style look and content before rolling out to the rest of the site.
