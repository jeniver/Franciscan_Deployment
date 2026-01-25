import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none relative overflow-hidden';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#8b2828] text-white rounded-xl shadow-md hover:shadow-xl hover:shadow-[#8b2828]/25 hover:scale-[1.02] active:scale-[0.98] focus:ring-[#8b2828]/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
    secondary: 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 rounded-xl shadow-sm hover:shadow-md hover:from-gray-200 hover:to-gray-300 focus:ring-gray-400/50 active:scale-[0.98]',
    success: 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white rounded-xl shadow-md hover:shadow-xl hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] focus:ring-emerald-500/50',
    danger: 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white rounded-xl shadow-md hover:shadow-xl hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98] focus:ring-red-500/50',
    outline: 'border-2 border-gray-300 text-gray-700 bg-white rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-400/50 active:scale-[0.98] transition-all',
    ghost: 'text-gray-700 rounded-xl hover:bg-gray-100 focus:ring-gray-400/50 active:scale-[0.98] transition-all',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };
  
  // Apply custom className last so it can override variant styles when needed
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
  const isDisabled = disabled || isLoading;
  
  return (
    <button className={classes} disabled={isDisabled} {...props}>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
    </button>
  );
};