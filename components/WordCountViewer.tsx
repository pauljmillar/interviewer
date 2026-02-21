'use client';

import type { CategoryWordCount } from '@/lib/openai/wordCount';

interface WordCountViewerProps {
  wordCounts: {
    categories: CategoryWordCount[];
    totalWords: number;
  };
  onClose: () => void;
}

export default function WordCountViewer({ wordCounts, onClose }: WordCountViewerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Word Count Analysis</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-lg font-semibold text-blue-900">
                Total Words: {wordCounts.totalWords.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {wordCounts.categories.map((category) => (
              <div
                key={category.questionIndex}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {category.questionIndex + 1}. {category.mainQuestion}
                  </h3>
                  <div className="text-sm text-gray-600">
                    Total: {category.totalWords.toLocaleString()} words
                  </div>
                </div>

                {category.subTopics.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Sub-topics:</h4>
                    <div className="space-y-2">
                      {category.subTopics.map((subTopic) => (
                        <div
                          key={subTopic.subTopicIndex}
                          className="flex items-center justify-between bg-white p-2 rounded border"
                        >
                          <span className="text-sm text-gray-700">
                            {subTopic.name}
                          </span>
                          <span className="text-sm font-semibold text-blue-600">
                            {subTopic.wordCount.toLocaleString()} words
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {category.subTopics.length === 0 && (
                  <div className="text-sm text-gray-500 italic">
                    No sub-topics defined
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

