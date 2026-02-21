'use client';

import Link from 'next/link';
import GenerateInterviews from '@/components/GenerateInterviews';

export default function AdminInterviewsNewPage() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <Link href="/admin/interviews" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to interviews
        </Link>
      </div>
      <GenerateInterviews />
    </div>
  );
}
