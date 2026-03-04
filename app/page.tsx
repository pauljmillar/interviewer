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
    <div className="font-landing min-h-screen bg-white text-gray-700">
      {/* Hero: Astroship two-column, image + text + two buttons */}
      <section className="relative border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <Image
                src="/images/landing/hero-candice.png"
                alt="Person relaxing while interviews run in the background — Candice handles screening so you can focus on what matters"
                width={500}
                height={400}
                className="w-full h-auto"
                priority
              />
            </div>
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl font-bold text-black tracking-tight">
                Hi, I&apos;m Candice.
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-xl">
                I&apos;ll conduct screening interviews with your candidates and pass the best ones to you.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <TryInterviewButton />
                <Link
                  href="/start"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white border-2 border-black text-black font-medium hover:bg-gray-100 transition-colors"
                >
                  Add job description
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos: Works with your technologies / Trusted by */}
      <section className="border-b border-gray-200 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm font-medium text-gray-500 mb-6">
            Works with your technologies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <Image
                key={i}
                src="/images/landing/logo-placeholder.svg"
                alt=""
                width={120}
                height={32}
                className="opacity-60 h-8 w-auto"
                aria-hidden
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-black text-center">
            Everything you need to screen candidates
          </h2>
          <p className="mt-4 text-gray-600 text-center max-w-2xl mx-auto">
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
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-black" aria-hidden>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black mb-1">{title}</h3>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-black">
                Build faster hiring.
              </h2>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto lg:mx-0">
                Pull in a job description and run screening interviews in minutes with Candice.
              </p>
              <div className="mt-8">
                <Link
                  href="/start"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 border-2 border-transparent transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <Image
                src="/images/landing/cta-interview-lines.png"
                alt="AI interviewers handling candidate lines"
                width={640}
                height={480}
                className="w-full h-auto max-w-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p>Copyright © {new Date().getFullYear()} Candice AI. All rights reserved.</p>
          <p className="mt-1">
            Made by <a href="https://web3templates.com" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black underline">Web3Templates</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
