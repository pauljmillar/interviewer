import Link from 'next/link';
import RetroTryButton from '@/components/landing/RetroTryButton';
import ThumbnailImage from '@/components/blog/ThumbnailImage';
import { createServerSupabase } from '@/lib/supabase/server';
import { listPosts } from '@/lib/server/supabaseBlogStore';
import type { BlogPost } from '@/lib/server/supabaseBlogStore';

export const revalidate = 3600;

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

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
      {items.map((item) => (
        <li key={item} style={{ fontFamily: font, fontSize: 13, color: textSecondary, display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.5 }}>
          <span style={{ color: teal, flexShrink: 0, fontSize: 11, marginTop: 1 }}>—</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function RetroPostCard({ post }: { post: BlogPost }) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  return (
    <Link href={`/blog/${post.slug}`} className="retro-pricing-card" style={{
      position: 'relative', height: 268, borderRadius: 8,
      overflow: 'hidden', display: 'block', textDecoration: 'none',
      border: borderCard, flexShrink: 0,
      background: '#1a1a2e',
    }}>
      {/* Full-bleed thumbnail */}
      {(post.thumbnailKey || post.coverImageUrl) ? (
        <ThumbnailImage thumbnailKey={post.thumbnailKey} src={post.coverImageUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(63,138,140,0.25) 0%, rgba(242,138,15,0.10) 100%)` }}>
          <svg width="36" height="36" fill="none" stroke={teal} strokeWidth="1.2" viewBox="0 0 24 24" aria-hidden
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.20 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
      {/* Gradient scrim */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 52%, rgba(0,0,0,0.10) 100%)',
      }} />
      {/* Text overlay */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 16px 16px' }}>
        {date && (
          <p style={{ fontFamily: font, fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase' as const, color: 'rgba(242,138,15,0.80)', marginBottom: 6 }}>
            {date}
          </p>
        )}
        <p className="line-clamp-3" style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: '#FFE7BD', lineHeight: 1.45, margin: 0 }}>
          {post.title}
        </p>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = createServerSupabase();
  const recentPosts = supabase ? (await listPosts(supabase, true)).slice(0, 4) : [];
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

            <div style={{ display: 'flex', gap: 48, alignItems: 'center', position: 'relative', zIndex: 1 }}>
              {/* Text */}
              <div style={{ flex: '0 0 auto', width: '50%' }}>
                <Eyebrow>AI Screening Platform</Eyebrow>
                <h1 style={{
                  fontFamily: font,
                  fontSize: 'clamp(40px, 5.5vw, 64px)',
                  fontWeight: 700,
                  color: textPrimary,
                  lineHeight: 1,
                  letterSpacing: -2,
                  margin: '0 0 20px',
                }}>
                  SCREEN MORE.<br />
                  HIRE <span style={{ color: red }}>SMARTER.</span>
                </h1>
                <p style={{ fontSize: 15, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase' as const, color: textSecondary, marginBottom: 36 }}>
                  Your AI agent meets every candidate&nbsp;·&nbsp;You review the shortlist
                </p>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 32, marginBottom: 40, flexWrap: 'wrap' }}>
                  <StatBlock value="10" accent="h" label="Saved per role" />
                  <StatBlock value="50" accent="+" label="Candidates screened" />
                  <StatBlock value="0" accent="h" label="Scheduling conflicts" />
                  <StatBlock value="1" suffix="day" label="Time to shortlist" />
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 36 }}>
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

              {/* Hero image */}
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <div style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: `0.8px solid rgba(242,138,15,0.25)`,
                  boxShadow: '0 0 60px rgba(242,138,15,0.12), 0 0 120px rgba(229,52,11,0.06)',
                  aspectRatio: '4/5',
                  position: 'relative',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/landing/interview_woman_1.png"
                    alt="Candidate completing an AI-powered screening interview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  />
                  {/* Subtle bottom gradient fade */}
                  <div aria-hidden style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
                    background: `linear-gradient(to top, ${bgBase}55, transparent)`,
                  }} />
                </div>
                {/* Decorative corner accent */}
                <div aria-hidden style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 40, height: 40,
                  borderTop: `1.5px solid ${amber}`,
                  borderRight: `1.5px solid ${amber}`,
                  borderRadius: '0 6px 0 0',
                  opacity: 0.6,
                }} />
                <div aria-hidden style={{
                  position: 'absolute', bottom: -8, left: -8,
                  width: 40, height: 40,
                  borderBottom: `1.5px solid ${teal}`,
                  borderLeft: `1.5px solid ${teal}`,
                  borderRadius: '0 0 0 6px',
                  opacity: 0.6,
                }} />
              </div>
            </div>
          </section>

          {/* ── RECENT POSTS ──────────────────────────────────────────────── */}
          {recentPosts.length > 0 && (
            <section style={{ padding: '60px 0', borderBottom: borderSubtle }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <p style={{ fontFamily: font, fontSize: 11, letterSpacing: 5, textTransform: 'uppercase' as const, color: amber, margin: 0 }}>From the blog</p>
                <Link href="/blog" style={{ fontFamily: font, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: textMuted, textDecoration: 'none', transition: 'color 220ms' }}>
                  All posts →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {recentPosts.map((post) => (
                  <RetroPostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {/* ── FEATURES ──────────────────────────────────────────────────── */}
          <section id="features" style={{ padding: '90px 0', borderBottom: borderSubtle }}>
            <SectionLabel n="01" title="Everything you need to screen at scale" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <Card label="Time Saved" title="10 hrs" body="Per open position. No scheduling, no prep, no debrief." />
              <Card label="Wider Net" title="50 screens" body="Not just the 10 you could manually reach in the same window." />
              <Card label="Output" title="Ranked list" body="Scored, with video replay and interview notes for every candidate." />
              <Card label="Availability" title="24 / 7" body="Candidates interview on their own schedule from any device." />
              <Card label="Consistency" title="Fair rubric" body="Standardised questions and scoring remove bias at the highest-volume stage." />
              <Card label="Setup time" title="60 sec" body="Paste your JD and Screen AI generates tailored interview questions automatically." />
            </div>
          </section>

          {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
          <section id="approach" style={{ padding: '90px 0', borderBottom: borderSubtle }}>
            <div style={{ display: 'flex', gap: 56, alignItems: 'flex-start' }}>

              {/* Left: image */}
              <div style={{ flex: '0 0 auto', width: '42%', position: 'relative' }}>
                <div style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: `0.8px solid rgba(63,138,140,0.30)`,
                  boxShadow: '0 0 60px rgba(63,138,140,0.10)',
                  aspectRatio: '3/4',
                  position: 'relative',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/landing/interview_man_1.png"
                    alt="Hiring manager reviewing AI interview results"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  />
                  <div aria-hidden style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%',
                    background: `linear-gradient(to top, ${bgBase}55, transparent)`,
                  }} />
                </div>
                <div aria-hidden style={{
                  position: 'absolute', top: -8, left: -8,
                  width: 40, height: 40,
                  borderTop: `1.5px solid ${teal}`,
                  borderLeft: `1.5px solid ${teal}`,
                  borderRadius: '6px 0 0 0',
                  opacity: 0.6,
                }} />
                <div aria-hidden style={{
                  position: 'absolute', bottom: -8, right: -8,
                  width: 40, height: 40,
                  borderBottom: `1.5px solid ${amber}`,
                  borderRight: `1.5px solid ${amber}`,
                  borderRadius: '0 0 6px 0',
                  opacity: 0.6,
                }} />
              </div>

              {/* Right: heading + steps */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <SectionLabel n="02" title="From JD to shortlist in four steps" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { n: '01', title: 'Upload your JD', body: 'Paste or upload your job description. Screen AI reads it and generates tailored screening questions automatically.' },
                    { n: '02', title: 'Send interview links', body: 'Share a unique link with each candidate. They complete the interview on their own time — no scheduling.' },
                    { n: '03', title: 'Screen AI interviews', body: 'Your AI interviewer leads a structured, consistent conversation with every candidate.' },
                    { n: '04', title: 'Review ranked results', body: 'Log in to find candidates scored and ranked, with notes from each interview ready to act on.' },
                  ].map(({ n, title, body }, i) => (
                    <div key={n} style={{
                      display: 'flex', gap: 24, alignItems: 'flex-start',
                      padding: '28px 0',
                      borderBottom: i < 3 ? borderSubtle : 'none',
                    }}>
                      <div style={{ flexShrink: 0, width: 36 }}>
                        <span style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: amber, lineHeight: 1 }}>{n}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 600, color: textPrimary, letterSpacing: -0.3, marginBottom: 6 }}>{title}</h3>
                        <p style={{ fontFamily: font, fontSize: 14, color: textMuted, lineHeight: 1.65, margin: 0 }}>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* ── PRICING ───────────────────────────────────────────────────── */}
          <section id="pricing" style={{ padding: '90px 0', borderBottom: borderSubtle }}>
            <SectionLabel n="03" title="Plans to fit your team" />

            {/* ─ No commitment ─────────────────────────────────────────────── */}
            <p style={{ fontFamily: font, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' as const, color: textMuted, marginBottom: 14 }}>No commitment</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>

              {/* Free */}
              <div className="retro-pricing-card" style={{ background: bgSurface, border: borderCard, borderRadius: 8, padding: '28px 28px 24px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(242,138,15,0.06)' }}>
                <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)' }} aria-hidden />
                <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: teal, opacity: 0.85, marginBottom: 8 }}>Plan</p>
                <p style={{ fontFamily: font, fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Free</p>
                <p style={{ fontFamily: font, fontSize: 32, fontWeight: 700, color: amber, letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}>Free</p>
                <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: textMuted, marginBottom: 20 }}>Forever · No card required</p>
                <FeatureList items={[
                  '1 demo interview instantly — no signup',
                  '5 real candidate interviews free',
                  'AI-generated questions',
                  'Candidate ranking',
                  'Basic summaries',
                  '7-day video retention',
                ]} />
                <Link href="/start" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', padding: '12px 20px', borderRadius: 8, background: 'rgba(242,138,15,0.10)', color: amber, border: borderCard, textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)' }}>
                  Start free
                </Link>
              </div>

              {/* Pay as you go */}
              <div className="retro-pricing-card" style={{ background: bgSurface, border: borderCard, borderRadius: 8, padding: '28px 28px 24px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(242,138,15,0.06)' }}>
                <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)' }} aria-hidden />
                <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: teal, opacity: 0.85, marginBottom: 8 }}>Plan</p>
                <p style={{ fontFamily: font, fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Pay as you go</p>
                <p style={{ fontFamily: font, fontSize: 32, fontWeight: 700, color: amber, letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}>$7</p>
                <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: textMuted, marginBottom: 20 }}>Per completed interview · No subscription</p>
                <FeatureList items={[
                  'Great for occasional hiring',
                  'AI-generated questions',
                  'Candidate ranking & summaries',
                  'Additional video retention optional',
                ]} />
                <Link href="/sign-up" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', padding: '12px 20px', borderRadius: 8, background: 'rgba(242,138,15,0.10)', color: amber, border: borderCard, textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)' }}>
                  Get started
                </Link>
              </div>
            </div>

            {/* ─ Monthly subscription ───────────────────────────────────────── */}
            <p style={{ fontFamily: font, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' as const, color: textMuted, marginBottom: 14 }}>Monthly subscription</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>

              {/* Starter */}
              <div className="retro-pricing-card" style={{ background: bgSurface, border: borderCard, borderRadius: 8, padding: '28px 22px 24px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(242,138,15,0.06)' }}>
                <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)' }} aria-hidden />
                <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: teal, opacity: 0.85, marginBottom: 8 }}>Plan</p>
                <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Starter</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 20 }}>
                  <span style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: amber, letterSpacing: -1, lineHeight: 1 }}>$49</span>
                  <span style={{ fontFamily: font, fontSize: 11, color: textMuted, letterSpacing: 1 }}>/mo</span>
                </div>
                <FeatureList items={[
                  '10 interviews included',
                  '$5 per additional interview',
                  '30-day video retention',
                  '1 hiring manager seat',
                  'Basic branded candidate emails',
                ]} />
                <Link href="/sign-up" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', padding: '11px 14px', borderRadius: 8, background: 'rgba(242,138,15,0.10)', color: amber, border: borderCard, textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)' }}>
                  Get started
                </Link>
              </div>

              {/* Growth — most popular */}
              <div className="retro-pricing-card retro-pricing-card-hot" style={{ background: bgRaised, border: `0.8px solid rgba(229,52,11,0.45)`, borderRadius: 8, padding: '28px 22px 24px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 28px rgba(229,52,11,0.15)' }}>
                <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(229,52,11,0.6), transparent)' }} aria-hidden />
                <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: red, opacity: 0.9, marginBottom: 8 }}>Most popular</p>
                <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Growth</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 20 }}>
                  <span style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: red, letterSpacing: -1, lineHeight: 1 }}>$149</span>
                  <span style={{ fontFamily: font, fontSize: 11, color: textMuted, letterSpacing: 1 }}>/mo</span>
                </div>
                <FeatureList items={[
                  '40 interviews included',
                  '$4 per additional interview',
                  '90-day video retention',
                  '5 team seats',
                  'Shareable candidate scorecards',
                  'CSV export / basic ATS export',
                ]} />
                <Link href="/sign-up" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', padding: '11px 14px', borderRadius: 8, background: red, color: '#FFE7BD', border: 'none', textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)' }}>
                  Get started
                </Link>
              </div>

              {/* Team */}
              <div className="retro-pricing-card" style={{ background: bgSurface, border: borderCard, borderRadius: 8, padding: '28px 22px 24px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(242,138,15,0.06)' }}>
                <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(242,138,15,0.5), transparent)' }} aria-hidden />
                <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: teal, opacity: 0.85, marginBottom: 8 }}>Plan</p>
                <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Team</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 20 }}>
                  <span style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: amber, letterSpacing: -1, lineHeight: 1 }}>$299</span>
                  <span style={{ fontFamily: font, fontSize: 11, color: textMuted, letterSpacing: 1 }}>/mo</span>
                </div>
                <FeatureList items={[
                  '100 interviews included',
                  '$3 per additional interview',
                  '180-day video retention',
                  'Unlimited team reviewers',
                  'Custom rubrics',
                  'Priority support',
                ]} />
                <Link href="/sign-up" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', padding: '11px 14px', borderRadius: 8, background: 'rgba(242,138,15,0.10)', color: amber, border: borderCard, textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)' }}>
                  Get started
                </Link>
              </div>

              {/* Enterprise */}
              <div className="retro-pricing-card" style={{ background: bgSurface, border: borderTeal, borderRadius: 8, padding: '28px 22px 24px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(63,138,140,0.06)' }}>
                <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(63,138,140,0.5), transparent)' }} aria-hidden />
                <p style={{ fontFamily: font, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: teal, opacity: 0.85, marginBottom: 8 }}>Plan</p>
                <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Enterprise</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 20 }}>
                  <span style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: teal, letterSpacing: -1, lineHeight: 1 }}>Custom</span>
                </div>
                <FeatureList items={[
                  'SSO',
                  'ATS integrations',
                  'Custom data retention / deletion',
                  'Dedicated onboarding',
                  'Compliance / audit exports',
                  'API',
                ]} />
                <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', padding: '11px 14px', borderRadius: 8, background: 'rgba(63,138,140,0.10)', color: teal, border: borderTeal, textDecoration: 'none', transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)' }}>
                  Contact us
                </Link>
              </div>

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
              © {new Date().getFullYear()} Screen AI
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
