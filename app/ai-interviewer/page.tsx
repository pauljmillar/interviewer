import Link from 'next/link';
import RetroTryButton from '@/components/landing/RetroTryButton';

// ── Palette (matches landing page) ───────────────────────────────────────────
const bgBase    = 'var(--retro-bg-base)';
const bgSurface = 'var(--retro-bg-surface)';
const amber     = '#F28A0F';
const red       = '#E5340B';
const teal      = '#3F8A8C';

const textPrimary   = 'var(--retro-text-primary)';
const textSecondary = 'var(--retro-text-secondary)';
const textMuted     = 'var(--retro-text-muted)';

const borderSubtle = 'var(--retro-border-subtle)';
const borderCard   = 'var(--retro-border-card)';
const borderTeal   = 'var(--retro-border-teal)';

const gridBg = `linear-gradient(var(--retro-grid-color) 1px, transparent 1px),
                linear-gradient(90deg, var(--retro-grid-color) 1px, transparent 1px)`;

const grainUri = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ── Shared small components ───────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: font, fontSize: 13, fontWeight: 400, letterSpacing: 5, textTransform: 'uppercase' as const, color: teal, opacity: 0.9, marginBottom: 14 }}>
      {children}
    </p>
  );
}

function SectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <p style={{ fontFamily: font, fontSize: 13, letterSpacing: 5, textTransform: 'uppercase' as const, color: amber, opacity: 0.9, marginBottom: 14 }}>{n}</p>
      <h2 style={{ fontFamily: font, fontSize: 32, fontWeight: 700, color: textPrimary, letterSpacing: -0.5, margin: 0 }}>{title}</h2>
    </div>
  );
}

function GhostNumber({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: font, fontSize: 96, fontWeight: 800,
      color: 'var(--retro-cream)', opacity: 0.07, lineHeight: 1,
      letterSpacing: -4, pointerEvents: 'none', userSelect: 'none',
    }} aria-hidden>
      {children}
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    label: 'Structured',
    title: 'Structured interviews',
    body: 'Every candidate gets the same questions scored against the same rubric — no inconsistency, no improvisation.',
    accent: teal,
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Customisable',
    title: 'Customisable questions',
    body: 'Questions are auto-generated from your job description, then fully editable by your team before you launch.',
    accent: amber,
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    label: 'Availability',
    title: '24/7 availability',
    body: 'No scheduling coordination needed. Candidates complete their interview whenever it suits them.',
    accent: teal,
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Output',
    title: 'Instant ranking',
    body: 'Screen AI scores every response and surfaces a prioritised shortlist — ready in your dashboard by morning.',
    accent: amber,
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ),
  },
  {
    label: 'Fairness',
    title: 'Fair & consistent',
    body: 'Standardised questions and rubrics reduce unconscious bias at the earliest, highest-volume stage of hiring.',
    accent: teal,
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    label: 'Scale',
    title: 'Scales with volume',
    body: 'Screen 10 or 10,000 candidates with exactly the same effort. Your time stays constant as your pipeline grows.',
    accent: amber,
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
];

const steps = [
  { n: '01', title: 'Upload your job description', body: 'Paste or upload your JD. Screen AI reads it and automatically generates a tailored set of screening questions and scoring rubrics.' },
  { n: '02', title: 'Send interview links', body: 'Share a unique link with each candidate. They can complete the interview on their own schedule — no calendar coordination, no no-shows.' },
  { n: '03', title: 'Screen AI conducts the interview', body: 'Your AI interviewer leads a structured, conversational screening. Every candidate gets the same questions, asked the same way.' },
  { n: '04', title: 'Review ranked results', body: 'Log in to find candidates ranked by score, with notes and highlights from each interview. Move the best straight to the next round.' },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AIInterviewerPage() {
  return (
    <>
      {/* Grain overlay */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: grainUri, backgroundSize: '180px 180px',
        opacity: 0.032, mixBlendMode: 'overlay' as const,
      }} />

      {/* Scanlines */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 3px)',
      }} />

      {/* Page */}
      <div style={{
        position: 'relative', zIndex: 2, fontFamily: font, fontSize: 16,
        color: textSecondary, backgroundColor: bgBase,
        backgroundImage: gridBg, backgroundSize: '50px 50px',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 52px' }}>

          {/* ── HERO ──────────────────────────────────────────────────────── */}
          <section style={{ padding: '80px 0 90px', borderBottom: borderSubtle, position: 'relative' }}>
            {/* Amber glow */}
            <div aria-hidden style={{
              position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(242,138,15,0.22) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            {/* Red glow */}
            <div aria-hidden style={{
              position: 'absolute', bottom: -70, left: -70, width: 300, height: 300, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(229,52,11,0.28) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div style={{ maxWidth: 680 }}>
                <Eyebrow>AI Interviewer</Eyebrow>
                <h1 style={{
                  fontFamily: font, fontSize: 'clamp(48px, 7vw, 72px)', fontWeight: 700,
                  color: textPrimary, lineHeight: 1, letterSpacing: -2, margin: '0 0 20px',
                }}>
                  MEET YOUR<br />
                  <span style={{ color: red }}>AI INTERVIEWER.</span>
                </h1>
                <p style={{ fontSize: 16, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase' as const, color: textSecondary, marginBottom: 40 }}>
                  Every candidate screened&nbsp;·&nbsp;You review the shortlist
                </p>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 48, marginBottom: 48, flexWrap: 'wrap' as const }}>
                  {[
                    { value: '10', accent: 'h', label: 'Saved per open role' },
                    { value: '5', accent: '×', label: 'More candidates screened' },
                    { value: '100', accent: '%', label: 'Consistent bar for all' },
                  ].map(({ value, accent, label }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      <span style={{ fontFamily: font, fontSize: 48, fontWeight: 700, color: textPrimary, letterSpacing: -2, lineHeight: 1 }}>
                        {value}<span style={{ color: amber }}>{accent}</span>
                      </span>
                      <span style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: textMuted }}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'flex-start' }}>
                  <RetroTryButton />
                  <Link href="/start" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontFamily: font, fontSize: 13, fontWeight: 600,
                    letterSpacing: 3, textTransform: 'uppercase',
                    padding: '14px 29px', borderRadius: 8,
                    background: 'rgba(63,138,140,0.10)', color: teal, border: borderTeal,
                    textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)', whiteSpace: 'nowrap',
                  }}>
                    Upload your JD
                  </Link>
                </div>
              </div>

              {/* Ghost badge */}
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <GhostNumber>02</GhostNumber>
                <p style={{ fontFamily: font, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' as const, color: 'var(--retro-text-accent-dim)', marginTop: 4 }}>
                  Screen AI
                </p>
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
          <section style={{ padding: '90px 0', borderBottom: borderSubtle }}>
            <SectionLabel n="01" title="From JD to shortlist in four steps" />
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
              {steps.map(({ n, title, body }, i) => (
                <div key={n} style={{
                  display: 'flex', gap: 40, alignItems: 'flex-start',
                  padding: '40px 0',
                  borderBottom: i < steps.length - 1 ? borderSubtle : 'none',
                  position: 'relative',
                }}>
                  <div style={{ flexShrink: 0, width: 80 }}>
                    <span style={{ fontFamily: font, fontSize: 22, fontWeight: 700, color: amber, lineHeight: 1 }}>{n}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: font, fontSize: 22, fontWeight: 600, color: textPrimary, letterSpacing: -0.5, marginBottom: 10 }}>{title}</h3>
                    <p style={{ fontFamily: font, fontSize: 16, color: textMuted, lineHeight: 1.7, margin: 0 }}>{body}</p>
                  </div>
                  <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                    <GhostNumber>{n}</GhostNumber>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FEATURES GRID ─────────────────────────────────────────────── */}
          <section style={{ padding: '90px 0', borderBottom: borderSubtle }}>
            <SectionLabel n="02" title="Everything you need from a first-round interview" />
            <p style={{ fontFamily: font, fontSize: 16, color: textMuted, marginBottom: 48, marginTop: -24 }}>
              Screen AI handles the volume. You handle the decisions.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {features.map(({ label, title, body, accent, icon }) => (
                <div key={title} style={{
                  background: bgSurface, border: borderCard, borderRadius: 8,
                  padding: '28px 26px 24px', position: 'relative',
                  boxShadow: '0 0 40px rgba(242,138,15,0.06)',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 20, right: 20, height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)',
                  }} aria-hidden />
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: accent === teal ? 'rgba(63,138,140,0.12)' : 'rgba(242,138,15,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: accent, marginBottom: 14,
                  }}>
                    {icon}
                  </div>
                  <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: teal, opacity: 0.85, marginBottom: 6 }}>{label}</p>
                  <p style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: textPrimary, letterSpacing: -0.3, marginBottom: 8 }}>{title}</p>
                  <p style={{ fontFamily: font, fontSize: 14, color: textMuted, lineHeight: 1.7, margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── BOTTOM CTA ────────────────────────────────────────────────── */}
          <section style={{ padding: '90px 0', borderBottom: borderSubtle, position: 'relative' }}>
            <div aria-hidden style={{
              position: 'absolute', top: -60, right: -80, width: 400, height: 400, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(242,138,15,0.16) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
              <Eyebrow>Ready to start</Eyebrow>
              <h2 style={{ fontFamily: font, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 700, color: textPrimary, lineHeight: 1, letterSpacing: -2, marginBottom: 24 }}>
                RECLAIM YOUR <span style={{ color: amber }}>TIME.</span>
              </h2>
              <p style={{ fontSize: 16, fontWeight: 300, letterSpacing: 2, textTransform: 'uppercase' as const, color: textMuted, marginBottom: 40 }}>
                Upload your JD&nbsp;·&nbsp;First interview running in minutes
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                <RetroTryButton />
                <Link href="/integrations" style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontFamily: font, fontSize: 13, fontWeight: 600,
                  letterSpacing: 3, textTransform: 'uppercase',
                  padding: '14px 29px', borderRadius: 8,
                  background: 'rgba(242,138,15,0.10)', color: amber, border: borderCard,
                  textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)', whiteSpace: 'nowrap',
                }}>
                  View integrations →
                </Link>
              </div>
            </div>
          </section>

          {/* ── FOOTER ────────────────────────────────────────────────────── */}
          <footer style={{ padding: '40px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 16 }}>
            <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: textMuted }}>
              © {new Date().getFullYear()} Screen AI
            </p>
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Privacy', href: '/privacy' },
                { label: 'Sign in', href: '/sign-in' },
                { label: 'Get started', href: '/start' },
              ].map(({ label, href }) => (
                <Link key={href} href={href} style={{
                  fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
                  color: textMuted, textDecoration: 'none', transition: 'color 220ms',
                }}>
                  {label}
                </Link>
              ))}
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}
