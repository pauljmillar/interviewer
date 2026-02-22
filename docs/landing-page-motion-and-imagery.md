# Landing page motion and imagery

This document describes the motion graphics and visual elements on the **home/landing page** ([app/page.tsx](../app/page.tsx)). The design is inspired by [Poolside.ai](https://poolside.ai/): simple shapes, 1–2 colors, smooth CSS-only animation. More motion and imagery may be added over time.

---

## Overview

- **Scope:** The landing page hero (banner) only. Other pages are unchanged.
- **Tech:** Pure CSS (no JavaScript). All animation uses `transform` and `opacity` only so the browser can run it on the compositor (GPU-friendly).
- **Accessibility:** `@media (prefers-reduced-motion: reduce)` disables or simplifies motion; shapes remain static at low opacity.

---

## Current elements

### 1. Hero motion layer (circles + triangle)

**Location:** Inside the hero `<section>`, in a container with `hero-motion` (absolute, behind content, `overflow: hidden`).

**Behavior:**

- **12 circles** start in the **top-left** area of the hero (positions between 0–28% left, 2–42% top). They use two colors: `--landing-accent` (blue) and `--landing-muted` (gray), alternating.
- Each circle **migrates toward the bottom-right**: animation moves them with `translate(72vw, 48vh)` so they travel across the hero toward the corner. As they approach, they **shrink** (`scale` 1 → 0.2) and **fade** (opacity 0.2 → 0.04) to suggest being “sucked in.”
- **Staggered timing:** Durations 20–29s and delays 0–6s so circles don’t move in sync; the effect is a continuous stream from top-left toward bottom-right.
- **One triangle** sits at the **bottom-right** (right: 4%, bottom: 6%). It’s a CSS triangle (border trick) pointing up, so the “opening” faces the incoming circles, acting as a visual sink. It uses `--landing-accent` at 0.18 opacity.
- **Triangle pulse:** A very subtle scale animation (1 → 1.06 → 1) over 4s, infinite, so the triangle gently pulses.

**Implementation:**

- **Markup:** [app/page.tsx](../app/page.tsx) — `hero-motion` div containing 12 `hero-shape hero-shape--circle hero-shape--suck hero-shape--accent|muted` divs and one `hero-triangle` div.
- **Styles:** [app/globals.css](../app/globals.css) — `@keyframes hero-suck`, `@keyframes hero-triangle-pulse`, `.hero-motion`, `.hero-shape`, `.hero-shape--circle`, `.hero-shape--suck`, `.hero-shape--accent`, `.hero-shape--muted`, `.hero-triangle`, nth-child stagger rules, and `prefers-reduced-motion` overrides.

### 2. Soft gradient band

A very subtle vertical gradient behind the hero content: `--landing-accent` at 3% opacity at the top, fading to transparent by 60%. It sits above the motion layer in the stack so the shapes are still visible beneath it. Implemented as an absolute div with the gradient in `page.tsx`.

### 3. Roll-in hover (links and buttons)

Landing CTAs and header nav links use a **roll-in hover** effect: on hover, a background color sweeps in from the left (via a `::before` pseudo-element with `transform: scaleX(0)` → `scaleX(1)`). Text color switches to white. Implemented in [app/globals.css](../app/globals.css) as `.link-roll` and applied to the hero CTA, “Hover me” example, pricing tier buttons, and header nav links. Square corners (no border-radius on these elements).

### 4. Color tokens (landing)

In [app/globals.css](../app/globals.css) and [tailwind.config.ts](../tailwind.config.ts):

- `--landing-heading` — Headline/text (near black or light in dark mode).
- `--landing-muted` — Secondary text and muted shapes (gray).
- `--landing-accent` — Primary accent (blue, e.g. #1e40af light / #2563eb dark).
- `--landing-accent-hover` — Hover state for accent.

Used for motion shapes, gradient, roll-in hover, and typography on the landing page only.

---

## Stacking and performance

- The hero section uses `isolate` (stacking context) so the motion layer’s `z-index: -10` keeps shapes behind the text but visible within the section.
- Motion container order: gradient div first, then motion div (so shapes render on top of the gradient).
- All animation uses only `transform` and `opacity`; no `left`/`top` or layout-triggering properties, so the cost is low. Adding more circles (e.g. 20–30) with the same approach remains lightweight.

---

## Future additions

Plans may include:

- Additional motion patterns (e.g. different paths, other shapes).
- More imagery or illustration in the hero or elsewhere on the landing page.
- Further refinements to the “suck” effect (e.g. curve, speed, or density).

This doc can be updated as new motion and imagery are added.
