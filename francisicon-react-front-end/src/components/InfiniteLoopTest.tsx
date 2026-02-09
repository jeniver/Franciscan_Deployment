import { useState } from 'react';
import { GlobalSearchModal } from './EnhancedGlobalSearchModal';

export function InfiniteLoopTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  // Track render count
  setRenderCount(prev => prev + 1);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Infinite Loop Test</h1>
          
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Test Status</h2>
            <p className="text-yellow-700">
              Render Count: <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{renderCount}</span>
            </p>
            <p className="text-yellow-700 mt-2">
              If this number keeps increasing rapidly, there's still an infinite loop.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              Open Global Search Modal
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Main Application
            </button>
          </div>

          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">Expected Behavior:</h3>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Render count should stabilize after initial renders</li>
              <li>• Modal should open without causing infinite re-renders</li>
              <li>• Search functionality should work normally</li>
              <li>• No console errors about maximum update depth</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}