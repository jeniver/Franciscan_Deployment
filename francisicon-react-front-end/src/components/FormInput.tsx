import React from 'react';

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  icon?: React.ReactNode;
  error?: string;
  disabled?: boolean;
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  icon,
  error,
  disabled = false
}: FormInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input 
          type={type} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder} 
          disabled={disabled}
          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            icon ? 'pl-10' : ''
          } ${
            error 
              ? 'border-red-300 bg-red-50 focus:ring-red-500' 
              : 'border-gray-300'
          } ${
            disabled 
              ? 'bg-gray-100 cursor-not-allowed' 
              : 'bg-white'
          }`} 
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 flex items-center gap-1">
          <span className="text-red-500">⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}