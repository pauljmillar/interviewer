import Link from 'next/link';
import Image from 'next/image';
import TryInterviewButton from '@/components/landing/TryInterviewButton';

function FeatureIconBriefcase({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function FeatureIconFile({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function FeatureIconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function FeatureIconTemplate({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}
function FeatureIconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function FeatureIconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="font-landing min-h-screen bg-landing-bg text-landing-text">
      {/* Hero: Astroship two-column, image + text + two buttons */}
      <section className="relative border-b border-landing-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <Image
                src="/images/landing/cta-interview-lines.png"
                alt="AI interviewers screening candidates"
                width={500}
                height={400}
                className="w-full h-auto dark:invert"
                priority
              />
            </div>
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl font-bold text-landing-heading tracking-tight">
                Candice can interview your candidates
              </h1>
              <h3 className="mt-4 text-lg font-normal text-landing-muted max-w-xl">
                Our AI agents will meet with your candidates, conduct a customizable screening interview, and rank them for you to take the next steps
              </h3>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <TryInterviewButton />
                <Link
                  href="/start"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-landing-bg border-2 border-landing-heading text-landing-heading font-medium hover:opacity-80 transition-opacity"
                >
                  Add job description
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20 bg-landing-bg-section-alt border-t border-landing-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-landing-heading text-center">
            Everything you need to screen candidates
          </h2>
          <p className="mt-4 text-landing-muted text-center max-w-2xl mx-auto">
            Structured interviews, job-description-first setup, and tools that scale with your team.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Structured interviews', description: 'Consistent questions and scoring so you compare candidates fairly.', Icon: FeatureIconBriefcase },
              { title: 'Job description first', description: 'Share a JD and we generate a tailored interview plan.', Icon: FeatureIconFile },
              { title: 'Screening', description: 'Early-stage candidate screening with AI-led questions.', Icon: FeatureIconUsers },
              { title: 'Templates', description: 'Reusable interview templates for roles and teams.', Icon: FeatureIconTemplate },
              { title: 'Admin', description: 'Manage positions, instances, and responses in one place.', Icon: FeatureIconSettings },
              { title: 'Fair & consistent', description: 'Role-based interviews so every candidate gets the same bar.', Icon: FeatureIconCheck },
            ].map(({ title, description, Icon }) => (
              <div key={title} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-landing-bg-section flex items-center justify-center text-landing-heading" aria-hidden>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-landing-heading mb-1">{title}</h3>
                  <p className="text-sm text-landing-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approach */}
      <section id="approach" className="py-16 sm:py-20 bg-landing-bg border-t border-landing-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-landing-heading text-center">
            Approach
          </h2>
          <p className="mt-4 text-landing-muted text-center max-w-2xl mx-auto">
            We run job-description-first: you share a JD, we generate a tailored interview plan. Every candidate gets the same questions and rubrics so you can compare fairly and move quickly to the next step.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-20 bg-landing-bg-section-alt border-t border-landing-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-landing-heading text-center">
            Pricing
          </h2>
          <p className="mt-4 text-landing-muted text-center max-w-2xl mx-auto mb-12">
            Plans to fit your team. Start with free screenings, then scale as you grow.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-landing-border bg-landing-card-bg p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-landing-heading">Free</h3>
              <p className="mt-1 text-landing-muted text-sm">3 free interviews</p>
              <p className="mt-3 text-sm text-landing-muted flex-1">Try it now!</p>
              <Link
                href="/start"
                className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-landing-primary text-white text-sm font-medium hover:bg-landing-primary-hover transition-colors"
              >
                Get started
              </Link>
            </div>
            <div className="rounded-xl border border-landing-border bg-landing-card-bg p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-landing-heading">Ad Hoc</h3>
              <p className="mt-1 text-landing-muted text-sm">$3 per interview</p>
              <p className="mt-3 text-sm text-landing-muted flex-1">Up to 10 customizable questions and AI ranking/recommendation.</p>
              <Link
                href="/sign-up"
                className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-landing-primary text-white text-sm font-medium hover:bg-landing-primary-hover transition-colors"
              >
                Get started
              </Link>
            </div>
            <div className="rounded-xl border border-landing-border bg-landing-card-bg p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-landing-heading">Pro</h3>
              <p className="mt-1 text-landing-muted text-sm">$60/month</p>
              <p className="mt-3 text-sm text-landing-muted flex-1">Up to 75 interviews, intelligent next round scheduling.</p>
              <Link
                href="/sign-up"
                className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-landing-primary text-white text-sm font-medium hover:bg-landing-primary-hover transition-colors"
              >
                Get started
              </Link>
            </div>
            <div className="rounded-xl border border-landing-border bg-landing-card-bg p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-landing-heading">Enterprise</h3>
              <p className="mt-1 text-landing-muted text-sm">$120/month</p>
              <p className="mt-3 text-sm text-landing-muted flex-1">200 interviews, HR Chatbot of candidate skills, next round scheduling and follow-up template.</p>
              <Link
                href="/sign-up"
                className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-landing-primary text-white text-sm font-medium hover:bg-landing-primary-hover transition-colors"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-landing-bg border-t border-landing-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-right lg:order-1">
              <h2 className="text-3xl font-bold text-landing-heading">
                Hire faster.
              </h2>
              <p className="mt-4 text-landing-muted max-w-xl mx-auto lg:ml-auto lg:mr-0">
                Send interview links to your candidates in seconds. Get a prioritized list from our AI agents the next day.
              </p>
              <div className="mt-8 flex justify-center lg:justify-end">
                <Link
                  href="/start"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-landing-primary text-white font-medium hover:bg-landing-primary-hover border-2 border-transparent transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-start lg:order-2">
              <Image
                src="/images/landing/hero-candice.png"
                alt="Person relaxing while interviews run in the background — Candice handles screening so you can focus on what matters"
                width={640}
                height={480}
                className="w-full h-auto max-w-xl dark:invert"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-landing-border text-center text-sm text-landing-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p>Copyright © {new Date().getFullYear()} Candice AI. All rights reserved.</p>
          <p className="mt-1">
            Made by <a href="https://web3templates.com" target="_blank" rel="noopener noreferrer" className="text-landing-text hover:text-landing-heading underline">Web3Templates</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
