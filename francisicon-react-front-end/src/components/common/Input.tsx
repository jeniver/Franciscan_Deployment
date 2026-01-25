import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  helperText,
  className = '',
  ...props
}) => {
  const baseClasses = 'w-full rounded-xl border bg-white px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-gray-400';
  const defaultClasses = 'border-gray-300 focus:border-[#8b2828] focus:ring-[#8b2828]/20 hover:border-gray-400';
  const errorClasses = 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50';
  
  const classes = `${baseClasses} ${error ? errorClasses : defaultClasses} ${className}`;
  
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <span className="w-4 h-4">{icon}</span>
          </div>
        )}
        <input
          className={`${classes} ${icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm font-medium text-red-600 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};