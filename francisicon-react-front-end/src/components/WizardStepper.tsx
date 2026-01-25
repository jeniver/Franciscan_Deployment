import React, { Component } from 'react';
import { CheckIcon } from 'lucide-react';
interface Step {
  id: number;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
}
interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}
export function WizardStepper({
  steps,
  currentStep,
  onStepClick
}: WizardStepperProps) {
  return <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <div className="space-y-2">
        {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        return <button key={step.id} onClick={() => onStepClick(step.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${isCurrent ? 'bg-blue-50 border-2 border-blue-600' : isCompleted ? 'bg-blue-50 border-2 border-blue-600' : 'border-2 border-transparent hover:bg-gray-50'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-blue-600 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {isCompleted ? <CheckIcon className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isCurrent || isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </div>
            </button>;
      })}
      </div>
    </aside>;
}