import React, { useRef, useEffect, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { formatDateToDDMMYYYY, formatDateFromDDMMYYYY } from '../../utils/dateUtils';

interface DateInputProps {
  value: string; // YYYY-MM-DD format (for API)
  onChange: (value: string) => void; // Receives YYYY-MM-DD format
  mode?: 'date' | 'year';
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  label?: string;
  error?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  mode = 'date',
  minYear = new Date().getFullYear() - 120,
  maxYear = new Date().getFullYear() + 10,
  placeholder = 'dd/mm/yyyy',
  className = '',
  disabled = false,
  required = false,
  id,
  name,
  label,
  error
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useRef(id || `date-input-${Math.random().toString(36).substr(2, 9)}`);

  const inputId = id || uniqueId.current;
  const inputName = name || inputId;
  useEffect(() => {
    if (mode === 'year') {
      const year = (value || '').toString().slice(0, 4);
      setDisplayValue(year);
    } else {
      setDisplayValue(formatDateToDDMMYYYY(value));
    }
  }, [value, mode]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    if (mode === 'year') {
      const yearOnly = inputValue.replace(/[^\d]/g, '').slice(0, 4);
      if (!yearOnly) {
        onChange('');
        return;
      }
      const yearNum = parseInt(yearOnly, 10);
      if (Number.isNaN(yearNum) || yearNum < minYear || yearNum > maxYear) {
        // don't commit invalid year; keep displayValue while typing
        return;
      }
      onChange(yearOnly);
      return;
    }

    // Convert to YYYY-MM-DD for API (date mode)
    const apiDate = formatDateFromDDMMYYYY(inputValue);
    if (apiDate) onChange(apiDate);
    else if (!inputValue) onChange('');
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === 'year') {
      const selectedYear = e.target.value; // YYYY (from <input type="number"> or <select> like)
      if (selectedYear) {
        onChange(selectedYear);
        setDisplayValue(selectedYear);
      } else {
        onChange('');
        setDisplayValue('');
      }
      return;
    }

    const selectedDate = e.target.value; // YYYY-MM-DD format
    if (selectedDate) {
      onChange(selectedDate);
      setDisplayValue(formatDateToDDMMYYYY(selectedDate));
    } else {
      onChange('');
      setDisplayValue('');
    }
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (mode === 'year') {
      const selectEl = containerRef.current?.querySelector('select') as HTMLSelectElement | null;
      selectEl?.focus();
      return;
    }

    // Trigger the date picker by clicking the hidden date input
    // Use a small delay to ensure the input is ready
    setTimeout(() => {
      if (dateInputRef.current) {
        // Try showPicker() first (modern browsers)
        if (typeof dateInputRef.current.showPicker === 'function') {
          try {
            dateInputRef.current.showPicker();
          } catch {
            // Fallback to click if showPicker throws
            dateInputRef.current?.click();
          }
        } else {
          // Fallback for older browsers
          dateInputRef.current.click();
        }
      }
    }, 10);
  };

  const baseClasses = 'w-full rounded-xl border bg-white px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-gray-400';
  const defaultClasses = 'border-gray-300 focus:border-[#8b2828] focus:ring-[#8b2828]/20 hover:border-gray-400';
  const errorClasses = 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50';

  const inputClasses = `${baseClasses} ${error ? errorClasses : defaultClasses} ${className} pr-10`;

  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, idx) => maxYear - idx);

  return (
    <div className="w-full space-y-1.5" ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {mode === 'year' ? (
          <select
            id={inputId}
            name={inputName}
            value={displayValue || ''}
            onChange={(e) => {
              const v = e.target.value;
              setDisplayValue(v);
              onChange(v);
            }}
            disabled={disabled}
            required={required}
            className={`${baseClasses} ${error ? errorClasses : defaultClasses} ${className} pr-10 appearance-none`}
          >
            <option value="">{placeholder || 'Select year'}</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        ) : (
          /* Text input for dd/mm/yyyy display */
          <input
            id={inputId}
            name={inputName}
            ref={textInputRef}
            type="text"
            value={displayValue}
            onChange={handleTextChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={inputClasses}
            pattern="\d{2}/\d{2}/\d{4}"
            maxLength={10}
          />
        )}

        {/* Calendar icon button */}
        <button
          type="button"
          onClick={handleCalendarClick}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors z-10"
          title={mode === 'year' ? 'Select year' : 'Open date picker'}
        >
          <CalendarIcon className="w-5 h-5" />
        </button>

        {mode === 'date' && (
          /* Hidden date input for picker functionality - positioned over calendar icon area only */
          <input
            ref={dateInputRef}
            type="date"
            value={value || ''}
            onChange={handleDatePickerChange}
            className="absolute top-0 right-0 w-12 h-full opacity-0 cursor-pointer"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '48px',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 5,
            }}
            tabIndex={-1}
            disabled={disabled}
            required={required}
          />
        )}
      </div>
      {error && (
        <p className="text-sm font-medium text-red-600 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
};