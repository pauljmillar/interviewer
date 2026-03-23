import Link from 'next/link';

// ── Palette (matches landing page) ───────────────────────────────────────────
const bgBase    = 'var(--retro-bg-base)';
const bgSurface = 'var(--retro-bg-surface)';
const amber     = '#F28A0F';
const red       = '#E5340B';
const teal      = '#3F8A8C';

const textPrimary = 'var(--retro-text-primary)';
const textMuted   = 'var(--retro-text-muted)';
const textSecondary = 'var(--retro-text-secondary)';

const borderSubtle = 'var(--retro-border-subtle)';
const borderCard   = 'var(--retro-border-card)';
const borderTeal   = 'var(--retro-border-teal)';
const borderRed    = 'var(--retro-border-red)';

const gridBg = `linear-gradient(var(--retro-grid-color) 1px, transparent 1px),
                linear-gradient(90deg, var(--retro-grid-color) 1px, transparent 1px)`;

const grainUri = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ── Types & data ─────────────────────────────────────────────────────────────

type Badge = 'available' | 'coming-soon';

interface Integration {
  name: string;
  description: string;
  badge: Badge;
  icon: React.ReactNode;
}

interface Category {
  n: string;
  title: string;
  subtitle: string;
  integrations: Integration[];
}

function IconATS() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
    </svg>
  );
}
function IconComm() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IconWebhook() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

const categories: Category[] = [
  {
    n: '01',
    title: 'Applicant Tracking Systems',
    subtitle: 'Sync candidates directly from your ATS and push completed interview results back automatically.',
    integrations: [
      { name: 'Greenhouse', description: 'Pull candidates into Candice and push scores back to Greenhouse automatically.', badge: 'coming-soon', icon: <IconATS /> },
      { name: 'Lever', description: 'Trigger screening interviews from Lever stages and receive ranked results instantly.', badge: 'coming-soon', icon: <IconATS /> },
      { name: 'Workday', description: 'Enterprise-grade sync with Workday Recruiting for large hiring teams.', badge: 'coming-soon', icon: <IconATS /> },
      { name: 'BambooHR', description: 'Lightweight integration for SMBs using BambooHR as their people platform.', badge: 'coming-soon', icon: <IconATS /> },
    ],
  },
  {
    n: '02',
    title: 'Communication',
    subtitle: 'Get notified the moment interviews are complete — right where your team already lives.',
    integrations: [
      { name: 'Slack', description: 'Receive a Slack message when a candidate finishes their interview, including their score and a link to review.', badge: 'coming-soon', icon: <IconComm /> },
      { name: 'Email', description: 'Automatic email summaries delivered to hiring managers when results are ready.', badge: 'available', icon: <IconComm /> },
    ],
  },
  {
    n: '03',
    title: 'Scheduling & Calendar',
    subtitle: 'Remove the back-and-forth of booking next-round interviews after the screen.',
    integrations: [
      { name: 'Google Calendar', description: 'Send calendar invites for next-round interviews directly from Candice.', badge: 'coming-soon', icon: <IconCalendar /> },
      { name: 'Outlook / Microsoft 365', description: 'Full Microsoft calendar support for enterprise teams.', badge: 'coming-soon', icon: <IconCalendar /> },
    ],
  },
  {
    n: '04',
    title: 'Developer & API',
    subtitle: 'Build your own integrations or trigger Candice from any workflow.',
    integrations: [
      { name: 'REST API', description: 'Create positions, generate interview links, and pull results programmatically via our REST API.', badge: 'available', icon: <IconWebhook /> },
      { name: 'Webhooks', description: 'Receive real-time events when interviews start, complete, or when scores are ready.', badge: 'coming-soon', icon: <IconWebhook /> },
    ],
  },
];

function BadgePill({ type }: { type: Badge }) {
  if (type === 'available') {
    return (
      <span style={{
        display: 'inline-block', fontFamily: font, fontSize: 9, fontWeight: 600,
        letterSpacing: 2, textTransform: 'uppercase' as const,
        padding: '4px 10px', borderRadius: 9999,
        border: 'none',
        background: 'rgba(63,138,140,0.15)', color: teal,
      }}>
        Available
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-block', fontFamily: font, fontSize: 9, fontWeight: 600,
      letterSpacing: 2, textTransform: 'uppercase' as const,
      padding: '4px 10px', borderRadius: 9999,
      border: borderSubtle, color: textMuted,
    }}>
      Coming soon
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
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
            <div aria-hidden style={{
              position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(242,138,15,0.22) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div style={{ maxWidth: 680 }}>
                <p style={{ fontFamily: font, fontSize: 13, fontWeight: 400, letterSpacing: 5, textTransform: 'uppercase' as const, color: teal, opacity: 0.9, marginBottom: 14 }}>
                  Integrations
                </p>
                <h1 style={{
                  fontFamily: font, fontSize: 'clamp(48px, 7vw, 72px)', fontWeight: 700,
                  color: textPrimary, lineHeight: 1, letterSpacing: -2, margin: '0 0 20px',
                }}>
                  WORKS WITH YOUR<br />
                  <span style={{ color: amber }}>EXISTING STACK.</span>
                </h1>
                <p style={{ fontSize: 16, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase' as const, color: textSecondary, marginBottom: 0 }}>
                  Connect your ATS · Slack notifications · API access
                </p>
              </div>

              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{
                  fontFamily: font, fontSize: 96, fontWeight: 800,
                  color: 'var(--retro-cream)', opacity: 0.07, lineHeight: 1,
                  letterSpacing: -4, pointerEvents: 'none', userSelect: 'none',
                }} aria-hidden>03</div>
                <p style={{ fontFamily: font, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' as const, color: 'var(--retro-text-accent-dim)', marginTop: 4 }}>
                  Candice AI
                </p>
              </div>
            </div>
          </section>

          {/* ── INTEGRATION CATEGORIES ────────────────────────────────────── */}
          {categories.map(({ n, title, subtitle, integrations }) => (
            <section key={n} style={{ padding: '72px 0', borderBottom: borderSubtle }}>
              <div style={{ marginBottom: 36 }}>
                <p style={{ fontFamily: font, fontSize: 13, letterSpacing: 5, textTransform: 'uppercase' as const, color: amber, opacity: 0.9, marginBottom: 14 }}>{n}</p>
                <h2 style={{ fontFamily: font, fontSize: 26, fontWeight: 700, color: textPrimary, letterSpacing: -0.5, marginBottom: 10 }}>{title}</h2>
                <p style={{ fontFamily: font, fontSize: 15, color: textMuted, maxWidth: 560, margin: 0 }}>{subtitle}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {integrations.map(({ name, description, badge, icon }) => (
                  <div key={name} className="retro-pricing-card" style={{
                    background: bgSurface, borderRadius: 8,
                    border: badge === 'available' ? borderTeal : borderCard,
                    padding: '24px 24px 22px', position: 'relative',
                    display: 'flex', gap: 18, alignItems: 'flex-start',
                    boxShadow: badge === 'available' ? '0 0 24px rgba(63,138,140,0.08)' : '0 0 40px rgba(242,138,15,0.05)',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 20, right: 20, height: 1,
                      background: badge === 'available'
                        ? 'linear-gradient(90deg, transparent, rgba(63,138,140,0.5), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(242,138,15,0.4), transparent)',
                    }} aria-hidden />
                    <div style={{
                      flexShrink: 0, width: 40, height: 40, borderRadius: 8,
                      background: badge === 'available' ? 'rgba(63,138,140,0.12)' : 'rgba(242,138,15,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: badge === 'available' ? teal : textMuted,
                    }}>
                      {icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: textPrimary }}>{name}</span>
                        <BadgePill type={badge} />
                      </div>
                      <p style={{ fontFamily: font, fontSize: 13, color: textMuted, lineHeight: 1.7, margin: 0 }}>{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* ── BOTTOM CTA ────────────────────────────────────────────────── */}
          <section style={{ padding: '90px 0', borderBottom: borderSubtle, position: 'relative' }}>
            <div aria-hidden style={{
              position: 'absolute', bottom: -60, left: -80, width: 360, height: 360, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(229,52,11,0.14) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
              <p style={{ fontFamily: font, fontSize: 13, fontWeight: 400, letterSpacing: 5, textTransform: 'uppercase' as const, color: teal, opacity: 0.9, marginBottom: 14 }}>
                Don&apos;t see your tool?
              </p>
              <h2 style={{ fontFamily: font, fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 700, color: textPrimary, lineHeight: 1, letterSpacing: -2, marginBottom: 20 }}>
                WE&apos;RE ADDING <span style={{ color: red }}>MORE.</span>
              </h2>
              <p style={{ fontSize: 16, fontWeight: 300, letterSpacing: 2, textTransform: 'uppercase' as const, color: textMuted, marginBottom: 40 }}>
                We prioritise integrations based on what our users need
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                <Link href="/start" style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontFamily: font, fontSize: 13, fontWeight: 600,
                  letterSpacing: 3, textTransform: 'uppercase',
                  padding: '15px 30px', borderRadius: 8, border: 'none',
                  background: red, color: '#FFE7BD',
                  textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)', whiteSpace: 'nowrap',
                }}>
                  Get started free
                </Link>
                <a href="mailto:hello@candice.ai" style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontFamily: font, fontSize: 13, fontWeight: 600,
                  letterSpacing: 3, textTransform: 'uppercase',
                  padding: '14px 29px', borderRadius: 8,
                  background: 'rgba(63,138,140,0.10)', color: teal, border: borderTeal,
                  textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)', whiteSpace: 'nowrap',
                }}>
                  Request an integration
                </a>
              </div>
            </div>
          </section>

          {/* ── FOOTER ────────────────────────────────────────────────────── */}
          <footer style={{ padding: '40px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 16 }}>
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
