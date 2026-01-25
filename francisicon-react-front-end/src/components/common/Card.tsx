import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  hover?: boolean;
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  actions,
  hover = false,
  gradient = false,
}) => {
  const baseClasses = 'bg-white rounded-2xl shadow-sm border border-gray-200/60 transition-all duration-300';
  const hoverClasses = hover ? 'hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 hover:border-gray-300' : '';
  const gradientClasses = gradient ? 'bg-gradient-to-br from-white to-gray-50/50' : '';
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${className}`}>
      {(title || subtitle || actions) && (
        <div className="px-6 py-5 border-b border-gray-200/60 bg-gradient-to-r from-gray-50/50 to-transparent rounded-t-2xl">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-0.5 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 leading-relaxed mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};