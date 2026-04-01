import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: March 2026</p>

      <div className="prose prose-sm dark:prose-invert space-y-6 text-gray-700 dark:text-gray-300">

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">What we collect</h2>
          <p>
            When you participate in an interview conducted through Screen AI, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Your written responses to interview questions.</li>
            <li>Video and audio recordings of your interview session, if recording is enabled.</li>
            <li>Basic session metadata (start time, duration, completion status).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">How it is used</h2>
          <p>
            Your interview responses and recording are shared only with the organisation that invited you
            to the interview. They are used solely to evaluate your application or participation. Screen AI
            does not use your responses to train AI models or share them with third parties.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Data retention</h2>
          <p>
            Interview data is retained for as long as the hiring organisation requires it for their
            evaluation process, typically no longer than 12 months. You may request deletion by contacting
            the organisation that invited you.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Your rights</h2>
          <p>
            Depending on your location you may have rights to access, correct, or delete personal data
            held about you. To exercise these rights, contact the organisation that sent you the interview
            link. For questions about how Screen AI handles data, contact{' '}
            <a href="mailto:privacy@candice.ai" className="text-[#3ECF8E] hover:underline">
              privacy@candice.ai
            </a>
            .
          </p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-gray-200 dark:border-[#2a2a2a]">
        <Link href="/" className="text-sm text-[#3ECF8E] hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
