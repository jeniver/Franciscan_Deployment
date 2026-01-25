import React from 'react';
interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}
export function FormSelect({
  label,
  value,
  onChange,
  options,
  required = false,
  placeholder = 'Select an option',
  disabled = false
}: FormSelectProps) {
  return <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        disabled={disabled}
        className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map(option => <option key={option.value} value={option.value}>
            {option.label}
          </option>)}
      </select>
    </div>;
}