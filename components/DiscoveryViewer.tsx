'use client';

import { DiscoveryContext } from '@/types';

interface DiscoveryViewerProps {
  discoveryContext: DiscoveryContext;
  onClose: () => void;
}

export default function DiscoveryViewer({ discoveryContext, onClose }: DiscoveryViewerProps) {
  const { entities, timeline } = discoveryContext;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Discovered Information</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Entities Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">
              Discovered Entities ({entities.length})
            </h3>
            {entities.length === 0 ? (
              <p className="text-gray-500 text-sm">No entities discovered yet.</p>
            ) : (
              <div className="space-y-4">
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 capitalize">
                        {entity.entityType}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {new Date(entity.discoveredAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(entity.attributes)
                        .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                        .map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-gray-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>{' '}
                            <span className="text-gray-900">{String(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">
              Timeline Events ({timeline.length})
            </h3>
            {timeline.length === 0 ? (
              <p className="text-gray-500 text-sm">No timeline events yet.</p>
            ) : (
              <div className="space-y-3">
                {timeline
                  .sort((a, b) => {
                    // Sort by date if available, otherwise by discovery time
                    if (a.date && b.date) {
                      return new Date(a.date).getTime() - new Date(b.date).getTime();
                    }
                    return new Date(a.discoveredAt).getTime() - new Date(b.discoveredAt).getTime();
                  })
                  .map((event) => (
                    <div
                      key={event.id}
                      className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">
                            {event.description}
                          </div>
                          {event.date && (
                            <div className="text-sm text-gray-600 mt-1">
                              {event.date}
                            </div>
                          )}
                          {!event.date && (
                            <div className="text-sm text-gray-500 italic mt-1">
                              Date needed
                            </div>
                          )}
                          {event.context && (
                            <div className="text-sm text-gray-600 mt-1">
                              {event.context}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 ml-4">
                          {event.eventType}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
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

