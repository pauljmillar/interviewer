import JobDescriptionInput from '@/components/landing/JobDescriptionInput';

export const metadata = {
  title: 'Add job description | Candice AI',
  description: 'Paste, upload, or share a link to your job description to generate screening interviews.',
};

export default function StartPage() {
  return (
    <div className="font-landing min-h-screen bg-landing-bg text-landing-text">
      <div className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <h1 className="text-2xl sm:text-3xl font-semibold text-landing-heading text-center mb-2">
          Add a job description
        </h1>
        <p className="text-landing-muted text-center mb-10">
          Paste text, upload a file, or share a link. We&apos;ll generate a tailored screening interview.
        </p>
        <JobDescriptionInput />
      </div>
    </div>
  );
}
