import JobDescriptionInput from '@/components/landing/JobDescriptionInput';

export const metadata = {
  title: 'Add job description | Screen AI',
  description: 'Paste, upload, or share a link to your job description to generate screening interviews.',
};

const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const teal = '#3F8A8C';

const grainUri = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const gridBg = `linear-gradient(var(--retro-grid-color) 1px, transparent 1px),
                linear-gradient(90deg, var(--retro-grid-color) 1px, transparent 1px)`;

export default function StartPage() {
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
        backgroundColor: 'var(--retro-bg-base)',
        backgroundImage: gridBg,
        backgroundSize: '50px 50px',
        minHeight: '100vh',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 32px 120px' }}>

          {/* Eyebrow */}
          <p style={{
            fontFamily: font,
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: 5,
            textTransform: 'uppercase' as const,
            color: teal,
            opacity: 0.9,
            marginBottom: 14,
            textAlign: 'center',
          }}>
            New Position
          </p>

          <h1 style={{
            fontFamily: font,
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 700,
            color: 'var(--retro-text-primary)',
            letterSpacing: -1,
            lineHeight: 1.1,
            margin: '0 0 16px',
            textAlign: 'center',
          }}>
            Add a job description
          </h1>

          <p style={{
            fontFamily: font,
            fontSize: 13,
            letterSpacing: 3,
            textTransform: 'uppercase' as const,
            color: 'var(--retro-text-secondary)',
            marginBottom: 52,
            textAlign: 'center',
          }}>
            Paste text, upload a file, or share a link&nbsp;—&nbsp;we&apos;ll generate a tailored screening interview
          </p>

          <JobDescriptionInput />

        </div>
      </div>
    </>
  );
}
