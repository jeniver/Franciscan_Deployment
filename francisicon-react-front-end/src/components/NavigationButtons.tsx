import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  showPrevious?: boolean;
  showNext?: boolean;
}
export function NavigationButtons({
  onPrevious,
  onNext,
  showPrevious = true,
  showNext = true
}: NavigationButtonsProps) {
  return <div className="flex justify-between mt-8">
      {showPrevious ? <button onClick={onPrevious} className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
          <ChevronLeftIcon className="w-4 h-4" />
          Previous Step
        </button> : <div />}
      {showNext && <button onClick={onNext} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Next Step
          <ChevronRightIcon className="w-4 h-4" />
        </button>}
    </div>;
}