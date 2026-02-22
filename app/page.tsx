import Link from 'next/link';
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'] });

export default function HomePage() {
  return (
    <div className={`${dmSans.className} min-h-full`}>
      {/* Hero – motion layer + soft gradient band */}
      <section className="relative isolate px-6 py-20 sm:py-28 max-w-4xl mx-auto text-center">
        {/* Gradient band (behind motion so shapes sit on top and stay visible) */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            background: 'linear-gradient(180deg, var(--landing-primary) 0%, transparent 60%)',
          }}
          aria-hidden
        />
        {/* Motion graphics: circles migrate from top-left toward triangle at bottom-right */}
        <div
          className="hero-motion absolute inset-0 -z-10 overflow-hidden pointer-events-none"
          aria-hidden
        >
          {/* Circles start in top-left, animate toward bottom-right */}
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: "2%", top: "5%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: "8%", top: "12%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: "0%", top: "22%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: "15%", top: "3%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: "5%", top: "30%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: "22%", top: "8%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: "12%", top: "18%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: "3%", top: "38%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: "18%", top: "25%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: "25%", top: "2%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--accent" style={{ left: "28%", top: "15%" }} />
          <div className="hero-shape hero-shape--circle hero-shape--suck hero-shape--muted" style={{ left: "10%", top: "42%" }} />
          {/* Triangle at bottom-right (sink) with subtle pulse */}
          <div className="hero-triangle" />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-landing-heading tracking-tight mb-6">
          Your AI Agent for candidate interviews
        </h1>
        <p className="text-base sm:text-lg text-landing-secondary max-w-2xl mx-auto mb-4">
          Sort through candidates much more quickly. Your HR staff spend less time on early screening—saving your company time and money.
        </p>
        <p className="text-sm sm:text-base text-landing-secondary max-w-xl mx-auto mb-10">
          Get 2 screening interviews free. Setup takes 90 seconds.
        </p>
        <Link
          href="/sign-up"
          className="link-roll inline-block px-6 py-3 font-medium text-landing-primary"
        >
          Get 2 free screenings
        </Link>

        {/* Roll-in hover example – background sweeps left to right on hover */}
        <p className="mt-16 text-sm text-landing-secondary">
          See the roll-in hover:{" "}
          <Link
            href="#pricing"
            className="link-roll px-2 py-1 text-landing-primary font-medium"
          >
            Hover me
          </Link>
          {" "}(background rolls in from the left).
        </p>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-landing-secondary/30" aria-hidden />
      </div>

      {/* Pricing */}
      <section className="px-6 py-16 sm:py-20 max-w-5xl mx-auto" id="pricing">
        <h2 className="text-2xl sm:text-3xl font-semibold text-landing-heading text-center mb-12">
          Simple pricing
        </h2>
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {/* Free */}
          <div className="rounded-2xl border border-landing-secondary/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
            <h3 className="text-lg font-semibold text-landing-heading mb-1">Free</h3>
            <p className="text-landing-secondary text-sm mb-6">Try the product</p>
            <ul className="text-sm text-landing-secondary space-y-3 mb-8 flex-1">
              <li>2 screening interviews</li>
              <li>90-second setup</li>
              <li>No credit card required</li>
            </ul>
            <Link
              href="/sign-up"
              className="link-roll block w-full text-center px-4 py-2.5 font-medium text-landing-primary"
            >
              Get started
            </Link>
          </div>

          {/* Basic */}
          <div className="rounded-2xl border border-landing-secondary/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
            <h3 className="text-lg font-semibold text-landing-heading mb-1">Basic</h3>
            <p className="text-landing-secondary text-sm mb-6">For small teams</p>
            <ul className="text-sm text-landing-secondary space-y-3 mb-8 flex-1">
              <li>More screenings per month</li>
              <li>Basic support</li>
              <li>Defined limits</li>
            </ul>
            <Link
              href="/sign-up"
              className="link-roll block w-full text-center px-4 py-2.5 font-medium text-landing-heading border border-landing-secondary/50"
            >
              Contact
            </Link>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border border-landing-secondary/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
            <h3 className="text-lg font-semibold text-landing-heading mb-1">Premium</h3>
            <p className="text-landing-secondary text-sm mb-6">For larger HR</p>
            <ul className="text-sm text-landing-secondary space-y-3 mb-8 flex-1">
              <li>Higher volume</li>
              <li>Priority support</li>
              <li>Advanced features</li>
            </ul>
            <Link
              href="/sign-up"
              className="link-roll block w-full text-center px-4 py-2.5 font-medium text-landing-heading border border-landing-secondary/50"
            >
              Contact
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
