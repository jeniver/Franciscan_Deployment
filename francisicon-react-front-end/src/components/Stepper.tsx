import React, { Component } from 'react';
import { FileTextIcon, HomeIcon, UserIcon, UsersIcon, UserCheckIcon, ReceiptIcon, CheckIcon } from 'lucide-react';
interface Step {
  id: number;
  label: string;
  icon: string;
}
interface StepperProps {
  steps: Step[];
  currentStep: number;
}
const iconMap: Record<string, ComponentType<{
  className?: string;
}>> = {
  'file-text': FileTextIcon,
  home: HomeIcon,
  user: UserIcon,
  users: UsersIcon,
  'user-check': UserCheckIcon,
  receipt: ReceiptIcon
};
export function Stepper({
  steps,
  currentStep
}: StepperProps) {
  return <div className="relative">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
        const Icon = iconMap[step.icon];
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isUpcoming = currentStep < step.id;
        return <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="relative flex items-center justify-center w-full">
                {index > 0 && <div className={`absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2 ${isCompleted ? 'bg-blue-600' : 'bg-gray-300'}`} />}
                <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 ${isCompleted ? 'border-green-600 bg-green-600 text-white' : isCurrent ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-400'}`}>
                  {isCompleted ? <CheckIcon className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                {index < steps.length - 1 && <div className={`absolute left-1/2 top-1/2 h-0.5 w-full -translate-y-1/2 ${isCompleted ? 'bg-blue-600' : 'bg-gray-300'}`} />}
              </div>
              <div className="mt-3 text-center">
                <p className={`text-xs font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </div>
            </div>;
      })}
      </div>
    </div>;
}