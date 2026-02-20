import { useEffect, useState, useRef } from 'react'
import { XIcon } from 'lucide-react'
interface EnhancedBeneficiaryDatePickerProps {
  dateOfBirth: string | null // Format: 'DD-MM-YYYY'
  birthYear: string | number | null | undefined // Format: YYYY
  id?: number | string
  onChange: (dateOfBirth: string | null, birthYear: number | null, id?: number | string) => void
  label?: string
  minYear?: number
  maxYear?: number
  disabled?: boolean
  required?: boolean
}
export function EnhancedBeneficiaryDatePicker({
  id,
  dateOfBirth,
  birthYear,
  onChange,
  label,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  disabled = false,
  required = false,
}: EnhancedBeneficiaryDatePickerProps) {
  // Internal state for inputs
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')

  // Refs to track previous values and break loops
  const prevPropsRef = useRef({ dateOfBirth, birthYear })
  const isInternalUpdate = useRef(false)

  /* 🔁 Sync FROM parent props to internal state */
  useEffect(() => {
    // Skip if this update was triggered by our own change
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }

    // Skip if props haven't actually changed
    if (
      prevPropsRef.current.dateOfBirth === dateOfBirth &&
      prevPropsRef.current.birthYear === birthYear
    ) {
      return
    }

    // Update previous props ref
    prevPropsRef.current = { dateOfBirth, birthYear }

    // Logic to populate internal state from props
    let newDay = ''
    let newMonth = ''
    let newYear = ''

    if (dateOfBirth) {
      // Prioritize full DateOfBirth
      const numericMatch = dateOfBirth.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
      if (numericMatch) {
        newDay = numericMatch[1].padStart(2, '0')
        newMonth = numericMatch[2].padStart(2, '0')
        newYear = numericMatch[3]
      } else {
        const parsedDate = new Date(dateOfBirth)
        if (!isNaN(parsedDate.getTime()) && dateOfBirth.includes('-')) {
          newDay = String(parsedDate.getDate()).padStart(2, '0')
          newMonth = String(parsedDate.getMonth() + 1).padStart(2, '0')
          newYear = String(parsedDate.getFullYear())
        }
      }
    } else if (birthYear !== null && birthYear !== undefined && birthYear !== '') {
      // Fallback to BirthYear if DateOfBirth is missing
      newYear = String(birthYear)
    }

    setDay(newDay)
    setMonth(newMonth)
    setYear(newYear)
  }, [dateOfBirth, birthYear])

  /* 🔄 Handle Internal Changes */
  const handleChange = (type: 'day' | 'month' | 'year', value: string) => {
    // Clean input
    const cleanValue = value.replace(/\D/g, '')

    // Determine new state values based on what changed
    let d = type === 'day' ? cleanValue : day;
    let m = type === 'month' ? cleanValue : month;
    let y = type === 'year' ? cleanValue : year;

    // Update internal state immediately
    if (type === 'day') setDay(cleanValue)
    if (type === 'month') setMonth(cleanValue)
    if (type === 'year') setYear(cleanValue)

    // Flag that we are initiating an update
    isInternalUpdate.current = true

    // Logic to determine what to send to parent

    // 1. Empty state -> Clear everything
    if (!d && !m && !y) {
      onChange(null, null, id)
      return
    }

    // 2. Only Year entered (valid range) and NO day/month
    // This is the "Year Only" mode
    if (y.length === 4 && !d && !m) {
      const yNum = parseInt(y, 10)
      if (yNum >= minYear && yNum <= maxYear) {
        // Send Year, Clear Date
        onChange(null, yNum, id)
      } else {
        // Invalid year, clear both
        onChange(null, null, id)
      }
      return
    }

    // 3. Full Date entered
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const dayNum = parseInt(d, 10)
      const monthNum = parseInt(m, 10)
      const yearNum = parseInt(y, 10)

      // Basic validation
      if (
        yearNum >= minYear &&
        yearNum <= maxYear &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        dayNum >= 1 &&
        dayNum <= 31
      ) {
        // JavaScript Date validation (handles days in month)
        const dateObj = new Date(yearNum, monthNum - 1, dayNum)
        if (
          dateObj.getFullYear() === yearNum &&
          dateObj.getMonth() === monthNum - 1 &&
          dateObj.getDate() === dayNum
        ) {
          const newDateStr = `${d}-${m}-${y}`
          // Send Date, Clear Year
          onChange(newDateStr, null, id)
          return
        }
      }
    }

    // 4. Partial or Invalid state
    // If we have some input but it's not a complete valida date OR a valid standalone year
    // We should clear the parent state to ensure consistency (e.g., prevent "202" from stuck as a year)
    // BUT we only clear if the parent currently HAS a value, to avoid unnecessary updates
    if (dateOfBirth !== null || birthYear !== null) {
      onChange(null, null, id)
    }
  }

  const clearAll = () => {
    setDay('')
    setMonth('')
    setYear('')
    isInternalUpdate.current = true
    onChange(null, null, id)
  }

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
          onChange={(e) => handleChange('day', e.target.value)}
          className="w-16 rounded-md border border-gray-300 px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent transition-all"
        />
        <span className="text-gray-400">-</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="MM"
          value={month}
          disabled={disabled}
          onChange={(e) => handleChange('month', e.target.value)}
          className="w-16 rounded-md border border-gray-300 px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent transition-all"
        />
        <span className="text-gray-400">-</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="YYYY"
          value={year}
          disabled={disabled}
          onChange={(e) => handleChange('year', e.target.value)}
          className="w-24 rounded-md border border-gray-300 px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent transition-all"
        />

        {(day || month || year) && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear date"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Enter full date (DD-MM-YYYY) or only year (YYYY)
      </p>
    </div>
  )
}
