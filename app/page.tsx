import Link from 'next/link';
import RetroTryButton from '@/components/landing/RetroTryButton';

// ─── Palette (CSS-variable-driven — responds to light/dark mode) ─────────────
const bgVoid    = 'var(--retro-bg-void)';
const bgBase    = 'var(--retro-bg-base)';
const bgSurface = 'var(--retro-bg-surface)';
const bgRaised  = 'var(--retro-bg-raised)';
const amber     = '#F28A0F';
const red       = '#E5340B';
const teal      = '#3F8A8C';
const cream     = 'var(--retro-cream)';

const textPrimary   = 'var(--retro-text-primary)';
const textSecondary = 'var(--retro-text-secondary)';
const textMuted     = 'var(--retro-text-muted)';
const textAccentDim = 'var(--retro-text-accent-dim)';

const borderSubtle = 'var(--retro-border-subtle)';
const borderCard   = 'var(--retro-border-card)';
const borderTeal   = 'var(--retro-border-teal)';
const borderRed    = 'var(--retro-border-red)';

const gridBg = `linear-gradient(var(--retro-grid-color) 1px, transparent 1px),
                linear-gradient(90deg, var(--retro-grid-color) 1px, transparent 1px)`;

const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Grain SVG URI (subtle film grain)
const grainUri = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// ─── Small inline components ──────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: font,
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: 5,
      textTransform: 'uppercase' as const,
      color: teal,
      opacity: 0.9,
      marginBottom: 14,
    }}>
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

type TagVariant = 'red' | 'amber' | 'teal' | 'default';
function Tag({ children, variant = 'default' }: { children: React.ReactNode; variant?: TagVariant }) {
  const styles: Record<TagVariant, { color: string; borderColor: string; background: string }> = {
    red:     { color: red,   borderColor: 'rgba(229,52,11,0.45)',  background: 'rgba(229,52,11,0.10)' },
    amber:   { color: amber, borderColor: 'rgba(242,138,15,0.40)', background: 'rgba(242,138,15,0.10)' },
    teal:    { color: teal,  borderColor: 'rgba(63,138,140,0.40)', background: 'rgba(63,138,140,0.10)' },
    default: { color: textMuted, borderColor: 'rgba(242,138,15,0.22)', background: 'rgba(242,138,15,0.05)' },
  };
  const s = styles[variant];
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: font,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: 2,
      textTransform: 'uppercase' as const,
      padding: '6px 12px',
      borderRadius: 9999,
      border: `0.8px solid ${s.borderColor}`,
      color: s.color,
      background: s.background,
    }}>
      {children}
    </span>
  );
}

function Card({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div style={{
      background: bgSurface,
      border: borderCard,
      borderRadius: 8,
      padding: '30px 30px 26px',
      position: 'relative',
      boxShadow: '0 0 40px rgba(242,138,15,0.08)',
    }}>
      {/* Top amber accent bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 24, right: 24, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)',
      }} aria-hidden />
      <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: teal, opacity: 0.85, marginBottom: 10 }}>{label}</p>
      <p style={{ fontFamily: font, fontSize: 32, fontWeight: 700, color: textPrimary, letterSpacing: -0.5, marginBottom: 8 }}>{title}</p>
      <p style={{ fontFamily: font, fontSize: 15, color: textMuted, lineHeight: 1.7, margin: 0 }}>{body}</p>
    </div>
  );
}

function StatBlock({ value, accent, suffix, label }: { value: string; accent?: string; suffix?: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: font, fontSize: 48, fontWeight: 700, color: textPrimary, letterSpacing: -2, lineHeight: 1 }}>
        {value}<span style={{ color: amber }}>{accent}</span>{suffix}
      </span>
      <span style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: textMuted }}>{label}</span>
    </div>
  );
}

function GhostNumber({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: font,
      fontSize: 96,
      fontWeight: 800,
      color: cream,
      opacity: 0.07,
      lineHeight: 1,
      letterSpacing: -4,
      pointerEvents: 'none',
      userSelect: 'none',
    }} aria-hidden>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* Fixed grain overlay */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: grainUri,
        backgroundSize: '180px 180px',
        opacity: 0.032,
        mixBlendMode: 'overlay' as const,
      }} />

      {/* Fixed scanlines */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 3px)',
      }} />

      {/* Page wrapper */}
      <div style={{
        position: 'relative', zIndex: 2,
        fontFamily: font,
        fontSize: 16,
        color: textSecondary,
        backgroundColor: bgBase,
        backgroundImage: gridBg,
        backgroundSize: '50px 50px',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 52px' }}>

          {/* ── HERO ──────────────────────────────────────────────────────── */}
          <section style={{ padding: '80px 0 90px', borderBottom: borderSubtle, position: 'relative' }}>
            {/* Amber glow — top right */}
            <div aria-hidden style={{
              position: 'absolute', top: -80, right: -80,
              width: 320, height: 320, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(242,138,15,0.22) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            {/* Red glow — bottom left */}
            <div aria-hidden style={{
              position: 'absolute', bottom: -70, left: -70,
              width: 300, height: 300, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(229,52,11,0.28) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div style={{ maxWidth: 680 }}>
                <Eyebrow>AI Screening Platform</Eyebrow>
                <h1 style={{
                  fontFamily: font,
                  fontSize: 'clamp(48px, 7vw, 72px)',
                  fontWeight: 700,
                  color: textPrimary,
                  lineHeight: 1,
                  letterSpacing: -2,
                  margin: '0 0 20px',
                }}>
                  SCREEN MORE.<br />
                  HIRE <span style={{ color: red }}>SMARTER.</span>
                </h1>
                <p style={{ fontSize: 16, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase' as const, color: textSecondary, marginBottom: 40 }}>
                  Your AI agent meets every candidate&nbsp;·&nbsp;You review the shortlist
                </p>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 48, marginBottom: 48, flexWrap: 'wrap' }}>
                  <StatBlock value="10" accent="h" label="Saved per role" />
                  <StatBlock value="50" accent="+" label="Candidates screened" />
                  <StatBlock value="0" accent="h" label="Scheduling conflicts" />
                  <StatBlock value="1" suffix="day" label="Time to shortlist" />
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 40 }}>
                  <RetroTryButton />
                  <Link
                    href="/start"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      fontFamily: font, fontSize: 13, fontWeight: 600,
                      letterSpacing: 3, textTransform: 'uppercase',
                      padding: '14px 29px', borderRadius: 8,
                      background: 'rgba(63,138,140,0.10)',
                      color: teal,
                      border: borderTeal,
                      textDecoration: 'none',
                      transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Upload your JD
                  </Link>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Tag variant="red">AI-Screened</Tag>
                  <Tag variant="amber">Free Trial</Tag>
                  <Tag variant="teal">No Scheduling</Tag>
                  <Tag>Async · 24/7</Tag>
                </div>
              </div>

              {/* Ghost badge */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <GhostNumber>01</GhostNumber>
                <p style={{ fontFamily: font, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' as const, color: textAccentDim, marginTop: 4 }}>
                  Candice AI
                </p>
              </div>
            </div>
          </section>

          {/* ── FEATURES ──────────────────────────────────────────────────── */}
          <section id="features" style={{ padding: '90px 0', borderBottom: borderSubtle }}>
            <SectionLabel n="01" title="Everything you need to screen at scale" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <Card label="Time Saved" title="10 hrs" body="Per open position. No scheduling, no prep, no debrief." />
              <Card label="Wider Net" title="50 screens" body="Not just the 10 you could manually reach in the same window." />
              <Card label="Output" title="Ranked list" body="Scored, with video replay and interview notes for every candidate." />
              <Card label="Availability" title="24 / 7" body="Candidates interview on their own schedule from any device." />
              <Card label="Consistency" title="Fair rubric" body="Standardised questions and scoring remove bias at the highest-volume stage." />
              <Card label="Setup time" title="60 sec" body="Paste your JD and Candice generates tailored interview questions automatically." />
            </div>
          </section>

          {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
          <section id="approach" style={{ padding: '90px 0', borderBottom: borderSubtle }}>
            <SectionLabel n="02" title="From JD to shortlist in four steps" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { n: '01', title: 'Upload your JD', body: 'Paste or upload your job description. Candice reads it and generates tailored screening questions automatically.' },
                { n: '02', title: 'Send interview links', body: 'Share a unique link with each candidate. They complete the interview on their own time — no scheduling.' },
                { n: '03', title: 'Candice interviews', body: 'Your AI interviewer leads a structured, consistent conversation with every candidate.' },
                { n: '04', title: 'Review ranked results', body: 'Log in to find candidates scored and ranked, with notes from each interview ready to act on.' },
              ].map(({ n, title, body }, i) => (
                <div key={n} style={{
                  display: 'flex', gap: 40, alignItems: 'flex-start',
                  padding: '40px 0',
                  borderBottom: i < 3 ? borderSubtle : 'none',
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

          {/* ── PRICING ───────────────────────────────────────────────────── */}
          <section id="pricing" style={{ padding: '90px 0', borderBottom: borderSubtle }}>
            <SectionLabel n="03" title="Plans to fit your team" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { plan: 'Free', price: '—', note: '3 free interviews', features: 'Try it now — no card required.', href: '/start', cta: 'Get started', hot: false },
                { plan: 'Ad Hoc', price: '$3', note: 'per interview', features: 'Up to 10 customisable questions and AI ranking.', href: '/sign-up', cta: 'Get started', hot: false },
                { plan: 'Pro', price: '$60', note: 'per month', features: 'Up to 75 interviews, intelligent next-round scheduling.', href: '/sign-up', cta: 'Get started', hot: true },
                { plan: 'Enterprise', price: '$120', note: 'per month', features: '200 interviews, HR chatbot, next-round scheduling and follow-up templates.', href: '/sign-up', cta: 'Contact us', hot: false },
              ].map(({ plan, price, note, features, href, cta, hot }) => (
                <div key={plan} style={{
                  background: hot ? bgRaised : bgSurface,
                  border: hot ? `0.8px solid rgba(229,52,11,0.45)` : borderCard,
                  borderRadius: 8,
                  padding: '30px 24px 26px',
                  position: 'relative',
                  boxShadow: hot ? '0 0 28px rgba(229,52,11,0.15)' : '0 0 40px rgba(242,138,15,0.08)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 24, right: 24, height: 1,
                    background: hot
                      ? 'linear-gradient(90deg, transparent, rgba(229,52,11,0.6), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)',
                  }} aria-hidden />
                  <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: hot ? red : teal, opacity: 0.85, marginBottom: 8 }}>
                    {hot ? 'Most popular' : 'Plan'}
                  </p>
                  <p style={{ fontFamily: font, fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>{plan}</p>
                  <p style={{ fontFamily: font, fontSize: 32, fontWeight: 700, color: hot ? red : amber, letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}>{price}</p>
                  <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: textMuted, marginBottom: 16 }}>{note}</p>
                  <p style={{ fontFamily: font, fontSize: 15, color: textMuted, lineHeight: 1.7, flex: 1, marginBottom: 24 }}>{features}</p>
                  <Link href={href} style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: font, fontSize: 13, fontWeight: 600,
                    letterSpacing: 3, textTransform: 'uppercase',
                    padding: '12px 20px', borderRadius: 8,
                    background: hot ? red : 'rgba(242,138,15,0.10)',
                    color: hot ? cream : amber,
                    border: hot ? 'none' : borderCard,
                    textDecoration: 'none',
                    transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    {cta}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────────────────────────── */}
          <section style={{ padding: '90px 0', borderBottom: borderSubtle, position: 'relative' }}>
            <div aria-hidden style={{
              position: 'absolute', top: -60, right: -80,
              width: 400, height: 400, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(242,138,15,0.16) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
              <Eyebrow>Ready to start</Eyebrow>
              <h2 style={{ fontFamily: font, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 700, color: textPrimary, lineHeight: 1, letterSpacing: -2, marginBottom: 24 }}>
                HIRE <span style={{ color: amber }}>FASTER.</span>
              </h2>
              <p style={{ fontSize: 16, fontWeight: 300, letterSpacing: 2, textTransform: 'uppercase' as const, color: textMuted, marginBottom: 40 }}>
                Send interview links in seconds&nbsp;·&nbsp;Get a ranked list the next day
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <RetroTryButton />
                <Link href="/sign-up" style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontFamily: font, fontSize: 13, fontWeight: 600,
                  letterSpacing: 3, textTransform: 'uppercase',
                  padding: '14px 29px', borderRadius: 8,
                  background: 'rgba(242,138,15,0.10)',
                  color: amber,
                  border: borderCard,
                  textDecoration: 'none',
                  transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
                  whiteSpace: 'nowrap',
                }}>
                  See rankings →
                </Link>
              </div>
            </div>
          </section>

          {/* ── FOOTER ────────────────────────────────────────────────────── */}
          <footer style={{ padding: '40px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: textMuted }}>
              © {new Date().getFullYear()} Candice AI
            </p>
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Privacy', href: '/privacy' },
                { label: 'Sign in', href: '/sign-in' },
                { label: 'Get started', href: '/start' },
              ].map(({ label, href }) => (
                <Link key={href} href={href} style={{
                  fontFamily: font, fontSize: 10, letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: textMuted, textDecoration: 'none',
                  transition: 'color 220ms',
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
