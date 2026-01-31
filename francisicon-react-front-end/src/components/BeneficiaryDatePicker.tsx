import { useState, useEffect } from 'react';

interface BeneficiaryDatePickerProps {
  value: string; // YYYY-MM-DD format or just YYYY for year-only
  onChange: (value: string) => void;
  mode?: 'full' | 'year'; // full = day/month/year, year = year only
  label?: string;
  minYear?: number;
  maxYear?: number;
  required?: boolean;
  disabled?: boolean;
}

export function BeneficiaryDatePicker({
  value,
  onChange,
  mode = 'full',
  label,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  required = false,
  disabled = false
}: BeneficiaryDatePickerProps) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).reverse();
  const months = [
    { value: "01", label: "Jan" },
    { value: "02", label: "Feb" },
    { value: "03", label: "Mar" },
    { value: "04", label: "Apr" },
    { value: "05", label: "May" },
    { value: "06", label: "Jun" },
    { value: "07", label: "Jul" },
    { value: "08", label: "Aug" },
    { value: "09", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" }
  ];
  
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Parse incoming value (YYYY-MM-DD or YYYY)
  useEffect(() => {
    if (!value) {
      setDay("");
      setMonth("");
      setYear("");
      return;
    }

    if (mode === 'year') {
      // Year only mode
      const yearValue = value.toString().slice(0, 4);
      setYear(yearValue);
    } else {
      // Full date mode - parse YYYY-MM-DD
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      } else if (parts.length === 1 && parts[0].length === 4) {
        // Only year provided
        setYear(parts[0]);
        setMonth("");
        setDay("");
      }
    }
  }, [value, mode]);

  // Update parent when selections change
  useEffect(() => {
    if (mode === 'year') {
      // Year only mode
      if (year) {
        onChange(year);
      } else {
        onChange('');
      }
    } else {
      // Full date mode
      if (year && month && day) {
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        onChange(formattedDate);
      } else if (!year && !month && !day) {
        onChange('');
      }
    }
  }, [day, month, year, mode, onChange]);

  if (mode === 'year') {
    // Year-only picker
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-[#8b5a2b] focus:ring-2 focus:ring-[#8b5a2b] focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Choose Year --</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    );
  }

  // Full date picker (day/month/year)
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex space-x-3">
        {/* Day */}
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-[#8b5a2b] focus:ring-2 focus:ring-[#8b5a2b] focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Day</option>
          {days.map((d) => (
            <option key={d} value={d.toString().padStart(2, '0')}>{d}</option>
          ))}
        </select>

        {/* Month */}
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-[#8b5a2b] focus:ring-2 focus:ring-[#8b5a2b] focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Month</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Year */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-[#8b5a2b] focus:ring-2 focus:ring-[#8b5a2b] focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

