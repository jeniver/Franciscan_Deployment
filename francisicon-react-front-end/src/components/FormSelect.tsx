import React from 'react'
import { ChevronDown } from 'lucide-react'
interface FormSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    value: string
    label: string
  }[]
  disabled?: boolean
}
export function FormSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: FormSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full appearance-none px-4 py-2.5 pr-10
            border border-gray-300 rounded-lg
            text-sm text-gray-900 bg-white
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent
            ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'cursor-pointer hover:border-gray-400'}
          `}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
      </div>
    </div>
  )
}
