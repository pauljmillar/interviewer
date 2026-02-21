'use client';

interface BiographyViewerProps {
  biography: string;
  onClose: () => void;
}

export default function BiographyViewer({ biography, onClose }: BiographyViewerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Generated Biography</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {biography}
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-4">
          <button
            onClick={() => {
              const blob = new Blob([biography], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'biography.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download as Text
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

