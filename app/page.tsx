import Link from 'next/link';
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'] });

export default function HomePage() {
  return (
    <div className={`${dmSans.className} min-h-full`}>
      {/* Hero – soft gradient band */}
      <section className="relative px-6 py-20 sm:py-28 max-w-4xl mx-auto text-center">
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            background: 'linear-gradient(180deg, var(--landing-accent) 0%, transparent 60%)',
          }}
          aria-hidden
        />
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-landing-heading tracking-tight mb-6">
          Augment your HR. Screen candidates in minutes, not hours.
        </h1>
        <p className="text-base sm:text-lg text-landing-muted max-w-2xl mx-auto mb-4">
          Sort through candidates much more quickly. Your HR staff spend less time on early screening—saving your company time and money.
        </p>
        <p className="text-sm sm:text-base text-landing-muted max-w-xl mx-auto mb-10">
          Get 2 screening interviews free. Setup takes 90 seconds.
        </p>
        <Link
          href="/sign-up"
          className="link-roll inline-block px-6 py-3 font-medium text-landing-accent"
        >
          Get 2 free screenings
        </Link>

        {/* Roll-in hover example – background sweeps left to right on hover */}
        <p className="mt-16 text-sm text-landing-muted">
          See the roll-in hover:{" "}
          <Link
            href="#pricing"
            className="link-roll px-2 py-1 text-landing-accent font-medium"
          >
            Hover me
          </Link>
          {" "}(background rolls in from the left).
        </p>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-landing-muted/30" aria-hidden />
      </div>

      {/* Pricing */}
      <section className="px-6 py-16 sm:py-20 max-w-5xl mx-auto" id="pricing">
        <h2 className="text-2xl sm:text-3xl font-semibold text-landing-heading text-center mb-12">
          Simple pricing
        </h2>
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {/* Free */}
          <div className="rounded-2xl border border-landing-muted/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
            <h3 className="text-lg font-semibold text-landing-heading mb-1">Free</h3>
            <p className="text-landing-muted text-sm mb-6">Try the product</p>
            <ul className="text-sm text-landing-muted space-y-3 mb-8 flex-1">
              <li>2 screening interviews</li>
              <li>90-second setup</li>
              <li>No credit card required</li>
            </ul>
            <Link
              href="/sign-up"
              className="link-roll block w-full text-center px-4 py-2.5 font-medium text-landing-accent"
            >
              Get started
            </Link>
          </div>

          {/* Basic */}
          <div className="rounded-2xl border border-landing-muted/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
            <h3 className="text-lg font-semibold text-landing-heading mb-1">Basic</h3>
            <p className="text-landing-muted text-sm mb-6">For small teams</p>
            <ul className="text-sm text-landing-muted space-y-3 mb-8 flex-1">
              <li>More screenings per month</li>
              <li>Basic support</li>
              <li>Defined limits</li>
            </ul>
            <Link
              href="/sign-up"
              className="link-roll block w-full text-center px-4 py-2.5 font-medium text-landing-heading border border-landing-muted/50"
            >
              Contact
            </Link>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border border-landing-muted/30 bg-background p-6 sm:p-8 flex flex-col transition-shadow duration-200 hover:shadow-md">
            <h3 className="text-lg font-semibold text-landing-heading mb-1">Premium</h3>
            <p className="text-landing-muted text-sm mb-6">For larger HR</p>
            <ul className="text-sm text-landing-muted space-y-3 mb-8 flex-1">
              <li>Higher volume</li>
              <li>Priority support</li>
              <li>Advanced features</li>
            </ul>
            <Link
              href="/sign-up"
              className="link-roll block w-full text-center px-4 py-2.5 font-medium text-landing-heading border border-landing-muted/50"
            >
              Contact
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
