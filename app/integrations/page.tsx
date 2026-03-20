import Link from 'next/link';

type Badge = 'available' | 'coming-soon';

interface Integration {
  name: string;
  description: string;
  badge: Badge;
  icon: React.ReactNode;
}

interface Category {
  title: string;
  subtitle: string;
  integrations: Integration[];
}

function IconATS() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
    </svg>
  );
}
function IconSlack() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IconWebhook() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

const Badge = ({ type }: { type: Badge }) =>
  type === 'available' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#3ECF8E]/15 text-[#2dbe7e] dark:text-[#3ECF8E]">
      Available
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-landing-bg-section-alt text-landing-muted border border-landing-border">
      Coming soon
    </span>
  );

const categories: Category[] = [
  {
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
    title: 'Communication',
    subtitle: 'Get notified the moment interviews are complete — right where your team already lives.',
    integrations: [
      { name: 'Slack', description: 'Receive a Slack message when a candidate finishes their interview, including their score and a link to review.', badge: 'coming-soon', icon: <IconSlack /> },
      { name: 'Email', description: 'Automatic email summaries delivered to hiring managers when results are ready.', badge: 'available', icon: <IconSlack /> },
    ],
  },
  {
    title: 'Video & Recording',
    subtitle: 'Optionally capture video alongside the AI conversation for richer candidate review.',
    integrations: [
      { name: 'Zoom', description: 'Conduct async video interviews via Zoom, with recordings stored and linked to each candidate profile.', badge: 'coming-soon', icon: <IconVideo /> },
      { name: 'Loom', description: 'Candidates can record a short Loom intro that sits alongside their Candice interview results.', badge: 'coming-soon', icon: <IconVideo /> },
    ],
  },
  {
    title: 'Scheduling & Calendar',
    subtitle: 'Remove the back-and-forth of booking next-round interviews after the screen.',
    integrations: [
      { name: 'Google Calendar', description: 'Send calendar invites for next-round interviews directly from Candice.', badge: 'coming-soon', icon: <IconCalendar /> },
      { name: 'Outlook / Microsoft 365', description: 'Full Microsoft calendar support for enterprise teams.', badge: 'coming-soon', icon: <IconCalendar /> },
    ],
  },
  {
    title: 'Developer & API',
    subtitle: 'Build your own integrations or trigger Candice from any workflow.',
    integrations: [
      { name: 'REST API', description: 'Create positions, generate interview links, and pull results programmatically via our REST API.', badge: 'available', icon: <IconWebhook /> },
      { name: 'Webhooks', description: 'Receive real-time events when interviews start, complete, or when scores are ready.', badge: 'coming-soon', icon: <IconWebhook /> },
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <div className="font-landing min-h-screen bg-landing-bg text-landing-text">

      {/* Hero */}
      <section className="border-b border-landing-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
          <p className="text-sm font-medium text-[#3ECF8E] uppercase tracking-widest mb-4">Integrations</p>
          <h1 className="text-5xl sm:text-6xl font-medium tracking-tight leading-tight text-landing-heading">
            Works with the tools<br />
            <span className="text-[#3ECF8E]">your team already uses</span>
          </h1>
          <p className="mt-6 text-lg text-landing-muted max-w-2xl mx-auto">
            Candice fits into your existing hiring workflow — not the other way around. Connect your ATS, get Slack notifications, and trigger interviews from the tools you use every day.
          </p>
        </div>
      </section>

      {/* Integration categories */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          {categories.map(({ title, subtitle, integrations }) => (
            <div key={title}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-landing-heading">{title}</h2>
                <p className="mt-1 text-sm text-landing-muted max-w-xl">{subtitle}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {integrations.map(({ name, description, badge, icon }) => (
                  <div
                    key={name}
                    className="flex gap-4 p-5 rounded-xl border border-landing-border bg-landing-card-bg hover:border-[#3ECF8E]/40 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-landing-bg-section-alt flex items-center justify-center text-landing-muted">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-landing-heading">{name}</span>
                        <Badge type={badge} />
                      </div>
                      <p className="text-xs text-landing-muted leading-relaxed">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-landing-border bg-landing-bg-section-alt py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-semibold text-landing-heading">Don&apos;t see your tool?</h2>
          <p className="mt-3 text-landing-muted">
            We&apos;re adding integrations regularly based on what our users need. Let us know what you&apos;re using and we&apos;ll prioritise it.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/start"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#3ECF8E] hover:bg-[#2dbe7e] text-white font-medium transition-colors"
            >
              Get started free
            </Link>
            <a
              href="mailto:hello@candice.ai"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-landing-bg border-2 border-landing-border text-landing-heading font-medium hover:opacity-80 transition-opacity"
            >
              Request an integration
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
