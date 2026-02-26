import Link from 'next/link';
import { GeistSans } from 'geist/font/sans';
import LeftNav from '@/components/landing/LeftNav';
import HeroInput from '@/components/landing/HeroInput';

export default function HomePage() {
  return (
    <div className={`${GeistSans.className} min-h-screen bg-black`}>
      <LeftNav />
      <div className="pl-56 bg-black min-h-full text-gray-100">
        {/* Hero: ChatGPT-like — instruction + chat block, no motion */}
        <section className="px-6 py-20 sm:py-28 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight mb-10">
            Share your job description and I&apos;ll plan my interview
          </h1>
          <HeroInput />
        </section>

        {/* Approach — includes motion graphics */}
        <section
          id="approach"
          className="relative isolate min-h-[420px] px-6 py-16 sm:py-20 max-w-5xl mx-auto"
        >
          <div
            className="absolute inset-0 -z-10 opacity-[0.03]"
            style={{
              background: 'linear-gradient(180deg, var(--landing-primary) 0%, transparent 60%)',
            }}
            aria-hidden
          />
          <div
            className="hero-motion absolute inset-0 -z-10 overflow-hidden pointer-events-none"
            aria-hidden
          >
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: '2%', top: '5%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: '8%', top: '12%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: '0%', top: '22%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: '15%', top: '3%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: '5%', top: '30%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: '22%', top: '8%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: '12%', top: '18%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: '3%', top: '38%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: '18%', top: '25%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: '25%', top: '2%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: '28%', top: '15%' }} />
            <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: '10%', top: '42%' }} />
            <div className="hero-triangle" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center mb-8">
            Approach
          </h2>
          <p className="text-gray-300 text-center max-w-2xl mx-auto mb-10">
            How we build interview plans: structured questions, clear rubrics, and fast setup so you can screen candidates in minutes.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-xl border border-landing-secondary/30 bg-background/80 p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Structured interviews</h3>
              <p className="text-sm text-gray-300">Consistent questions and scoring so you compare candidates fairly.</p>
            </div>
            <div className="rounded-xl border border-landing-secondary/30 bg-background/80 p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Job description first</h3>
              <p className="text-sm text-gray-300">Share a JD and we generate a tailored interview plan.</p>
            </div>
          </div>
        </section>

        {/* Products */}
        <section id="products" className="px-6 py-16 sm:py-20 max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center mb-8">
            Products
          </h2>
          <p className="text-gray-300 text-center max-w-2xl mx-auto mb-10">
            Screening and more: from one-off interviews to team workflows.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-landing-secondary/30 bg-background p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Screening</h3>
              <p className="text-sm text-gray-300">Early-stage candidate screening with AI-led questions.</p>
            </div>
            <div className="rounded-xl border border-landing-secondary/30 bg-background p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Templates</h3>
              <p className="text-sm text-gray-300">Reusable interview templates for roles and teams.</p>
            </div>
            <div className="rounded-xl border border-landing-secondary/30 bg-background p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Admin</h3>
              <p className="text-sm text-gray-300">Manage positions, instances, and responses in one place.</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-6 py-16 sm:py-20 max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center mb-12">
            Pricing
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="rounded-2xl border border-landing-secondary/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
              <h3 className="text-lg font-semibold text-white mb-1">Free</h3>
              <p className="text-gray-300 text-sm mb-6">Try the product</p>
              <ul className="text-sm text-gray-300 space-y-3 mb-8 flex-1">
                <li>2 screening interviews</li>
                <li>90-second setup</li>
                <li>No credit card required</li>
              </ul>
              <Link href="/sign-up" className="link-roll block w-full text-center px-4 py-2.5 font-medium text-landing-primary">
                Get started
              </Link>
            </div>
            <div className="rounded-2xl border border-landing-secondary/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
              <h3 className="text-lg font-semibold text-white mb-1">Basic</h3>
              <p className="text-gray-300 text-sm mb-6">For small teams</p>
              <ul className="text-sm text-gray-300 space-y-3 mb-8 flex-1">
                <li>More screenings per month</li>
                <li>Basic support</li>
                <li>Defined limits</li>
              </ul>
              <Link href="/sign-up" className="link-roll block w-full text-center px-4 py-2.5 font-medium text-white border border-landing-secondary/50">
                Contact
              </Link>
            </div>
            <div className="rounded-2xl border border-landing-secondary/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
              <h3 className="text-lg font-semibold text-white mb-1">Premium</h3>
              <p className="text-gray-300 text-sm mb-6">For larger HR</p>
              <ul className="text-sm text-gray-300 space-y-3 mb-8 flex-1">
                <li>Higher volume</li>
                <li>Priority support</li>
                <li>Advanced features</li>
              </ul>
              <Link href="/sign-up" className="link-roll block w-full text-center px-4 py-2.5 font-medium text-white border border-landing-secondary/50">
                Contact
              </Link>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="px-6 py-16 sm:py-20 max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center mb-8">
            About
          </h2>
          <p className="text-gray-300 text-center max-w-2xl mx-auto mb-10">
            Candice AI helps you screen candidates faster with structured, AI-led interviews. Less time on early rounds, more time on the right fit.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-xl border border-landing-secondary/30 bg-background p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Mission</h3>
              <p className="text-sm text-gray-300">Make hiring more efficient and fair through consistent, role-based interviews.</p>
            </div>
            <div className="rounded-xl border border-landing-secondary/30 bg-background p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Contact</h3>
              <p className="text-sm text-gray-300">Questions or enterprise inquiries? Get in touch.</p>
            </div>
          </div>
        </section>

        {/* Get Started */}
        <section id="get-started" className="px-6 py-16 sm:py-20 max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center mb-8">
            Get Started
          </h2>
          <p className="text-gray-300 text-center max-w-2xl mx-auto mb-10">
            Get 2 screening interviews free. Setup takes 90 seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/sign-up" className="link-roll inline-block px-6 py-3 font-medium text-landing-primary">
              Get 2 free screenings
            </Link>
            <Link href="/sign-in" className="px-6 py-3 font-medium text-white border border-neutral-600 rounded hover:bg-neutral-800 transition-colors">
              Sign in
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
