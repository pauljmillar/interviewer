import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Interviewer</h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        A conversational AI interviewer for screening, behavioral, biography, and more.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/admin"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Admin
        </Link>
      </div>
    </div>
  );
}
