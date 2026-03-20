import Link from 'next/link';
import TryInterviewButton from '@/components/landing/TryInterviewButton';

function IconStructured({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}
function IconCustom({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconRank({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  );
}
function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconScale({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  );
}

const features = [
  {
    title: 'Structured interviews',
    description: 'Every candidate gets the same questions scored against the same rubric — no inconsistency, no improvisation.',
    Icon: IconStructured,
  },
  {
    title: 'Customisable questions',
    description: 'Questions are auto-generated from your job description, then fully editable by your team before you launch.',
    Icon: IconCustom,
  },
  {
    title: '24/7 availability',
    description: 'No scheduling coordination needed. Candidates complete their interview whenever it suits them.',
    Icon: IconClock,
  },
  {
    title: 'Instant ranking',
    description: 'Candice scores every response and surfaces a prioritised shortlist — ready in your dashboard by morning.',
    Icon: IconRank,
  },
  {
    title: 'Fair & consistent',
    description: 'Standardised questions and rubrics reduce unconscious bias at the earliest, highest-volume stage of hiring.',
    Icon: IconShield,
  },
  {
    title: 'Scales with volume',
    description: 'Screen 10 or 10,000 candidates with exactly the same effort. Your time stays constant as your pipeline grows.',
    Icon: IconScale,
  },
];

const steps = [
  {
    number: '01',
    title: 'Upload your job description',
    description: 'Paste or upload your JD. Candice reads it and automatically generates a tailored set of screening questions and scoring rubrics.',
  },
  {
    number: '02',
    title: 'Send interview links',
    description: 'Share a unique link with each candidate. They can complete the interview on their own schedule — no calendar coordination, no no-shows.',
  },
  {
    number: '03',
    title: 'Candice conducts the interview',
    description: 'Your AI interviewer leads a structured, conversational screening. Every candidate gets the same questions, asked the same way.',
  },
  {
    number: '04',
    title: 'Review ranked results',
    description: 'Log in to find candidates ranked by score, with notes and highlights from each interview. Move the best straight to the next round.',
  },
];

export default function AIInterviewerPage() {
  return (
    <div className="font-landing min-h-screen bg-landing-bg text-landing-text">

      {/* Hero */}
      <section className="border-b border-landing-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
          <p className="text-sm font-medium text-[#3ECF8E] uppercase tracking-widest mb-4">AI Interviewer</p>
          <h1 className="text-5xl sm:text-6xl font-medium tracking-tight leading-tight">
            <span className="text-landing-heading block">Meet Candice,</span>
            <span className="text-[#3ECF8E] block">your AI interviewer</span>
          </h1>
          <p className="mt-6 text-lg text-landing-muted max-w-2xl mx-auto">
            Candice conducts structured, consistent screening interviews with every candidate — so you spend your time on the people who actually make the shortlist, not the logistics of getting there.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <TryInterviewButton />
            <Link
              href="/start"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-landing-bg border-2 border-landing-heading text-landing-heading font-medium hover:opacity-80 transition-opacity"
            >
              Upload your JD
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-landing-border bg-landing-bg-section-alt">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { stat: '10+ hours', label: 'saved per open role' },
              { stat: '5×', label: 'more candidates screened' },
              { stat: '100%', label: 'consistent bar for everyone' },
            ].map(({ stat, label }) => (
              <div key={label}>
                <p className="text-4xl font-semibold text-[#3ECF8E]">{stat}</p>
                <p className="mt-1 text-sm text-landing-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-landing-border py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-semibold text-landing-heading text-center">How it works</h2>
          <p className="mt-4 text-landing-muted text-center max-w-xl mx-auto">
            From job description to ranked shortlist — in four steps.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 gap-8">
            {steps.map(({ number, title, description }) => (
              <div key={number} className="flex gap-5">
                <span className="text-3xl font-bold text-[#3ECF8E] leading-none flex-shrink-0 w-10">{number}</span>
                <div>
                  <h3 className="text-base font-semibold text-landing-heading mb-1">{title}</h3>
                  <p className="text-sm text-landing-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-b border-landing-border bg-landing-bg-section-alt py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-semibold text-landing-heading text-center">Everything you need from a first-round interview</h2>
          <p className="mt-4 text-landing-muted text-center max-w-xl mx-auto">
            Candice handles the volume. You handle the decisions.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ title, description, Icon }) => (
              <div key={title} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-landing-bg flex items-center justify-center text-[#3ECF8E]" aria-hidden>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-landing-heading mb-1">{title}</h3>
                  <p className="text-sm text-landing-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-semibold text-landing-heading">Ready to reclaim your time?</h2>
          <p className="mt-4 text-landing-muted">
            Upload your job description and have your first AI screening interview running in minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/start"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#3ECF8E] hover:bg-[#2dbe7e] text-white font-medium transition-colors"
            >
              Upload your JD
            </Link>
            <Link
              href="/integrations"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-landing-bg border-2 border-landing-border text-landing-heading font-medium hover:opacity-80 transition-opacity"
            >
              View integrations
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
