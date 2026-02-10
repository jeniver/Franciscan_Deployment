import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';

interface EnhancedBeneficiaryDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  required?: boolean;
}

export function EnhancedBeneficiaryDatePicker({
  value = '',
  onChange,
  label,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  disabled = false,
  required = false
}: EnhancedBeneficiaryDatePickerProps) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  /* 🔁 Sync FROM parent value */
  useEffect(() => {
    if (!value) {
      setDay('');
      setMonth('');
      setYear('');
      return;
    }

    if (/^\d{4}$/.test(value)) {
      setDay('');
      setMonth('');
      setYear(value);
      return;
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
      const [d, m, y] = value.split('-');
      setDay(d);
      setMonth(m);
      setYear(y);
    }
  }, [value]);

  /* 🔄 Emit TO parent */
  useEffect(() => {
    // Only year entered
    if (year && !day && !month) {
      const y = Number(year);
      if (y >= minYear && y <= maxYear) {
        onChange(year);
      }
      return;
    }

    // Full date entered
    if (day && month && year) {
      const d = Number(day);
      const m = Number(month);
      const y = Number(year);

      if (
        y < minYear ||
        y > maxYear ||
        m < 1 ||
        m > 12 ||
        d < 1 ||
        d > 31
      ) {
        return;
      }

      const date = new Date(y, m - 1, d);
      if (
        date.getFullYear() === y &&
        date.getMonth() === m - 1 &&
        date.getDate() === d
      ) {
        onChange(
          `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`
        );
      }
      return;
    }

    // Incomplete input → emit nothing
    onChange('');
  }, [day, month, year, minYear, maxYear, onChange]);

  const clearAll = () => {
    setDay('');
    setMonth('');
    setYear('');
    onChange('');
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex gap-2 items-center relative">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="DD"
          value={day}
          disabled={disabled}
          onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))}
          className="w-16 rounded-md border px-2 py-2 text-center focus:ring-2 focus:ring-[#8b5a2b]"
        />

        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="MM"
          value={month}
          disabled={disabled}
          onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))}
          className="w-16 rounded-md border px-2 py-2 text-center focus:ring-2 focus:ring-[#8b5a2b]"
        />

        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="YYYY"
          value={year}
          disabled={disabled}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
          className="w-24 rounded-md border px-2 py-2 text-center focus:ring-2 focus:ring-[#8b5a2b]"
        />

        {(day || month || year) && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-500">
        Enter full date (DD-MM-YYYY) or only year (YYYY)
      </p>
    </div>
  );
}
