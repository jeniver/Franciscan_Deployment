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
  // Track if the update is coming from internal user interaction to avoid loops
  const isInternalUpdate = useRef(false)
  /* 🔁 Sync FROM parent props to internal state */
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }

    // Scenario 1: Full date provided (takes precedence)
    if (dateOfBirth) {
      let d = '', m = '', y = ''

      // Try numeric DD-MM-YYYY or D-M-YYYY
      const numericMatch = dateOfBirth.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
      if (numericMatch) {
        d = numericMatch[1].padStart(2, '0')
        m = numericMatch[2].padStart(2, '0')
        y = numericMatch[3]
      } else {
        // Try parsing other formats (like DD-MMM-YYYY e.g. 02-Feb-1941)
        const parsedDate = new Date(dateOfBirth)
        if (!isNaN(parsedDate.getTime()) && dateOfBirth.includes('-')) {
          d = String(parsedDate.getDate()).padStart(2, '0')
          m = String(parsedDate.getMonth() + 1).padStart(2, '0')
          y = String(parsedDate.getFullYear())
        }
      }

      if (d && m && y) {
        setDay(d)
        setMonth(m)
        setYear(y)
        return
      }
    }

    // Scenario 2: Only birth year provided
    if (birthYear !== null && birthYear !== undefined && birthYear !== '') {
      setDay('')
      setMonth('')
      setYear(Number(birthYear).toString())
      return
    }

    // Scenario 3: Both null or empty
    setDay('')
    setMonth('')
    setYear('')
  }, [dateOfBirth, birthYear])
  /* 🔄 Emit TO parent when inputs change */
  useEffect(() => {
    // We only trigger onChange if this effect was caused by user input (state change)
    // However, in React, we can't easily distinguish source in useEffect without refs or handlers.
    // We'll rely on the parent to handle the "prop update" cycle correctly (not re-triggering if values match).
    const d = day.replace(/\D/g, '')
    const m = month.replace(/\D/g, '')
    const y = year.replace(/\D/g, '')
    // 1. Empty state
    if (!d && !m && !y) {
      if (dateOfBirth !== null || birthYear !== null) {
        isInternalUpdate.current = true
        onChange(null, null, id)
      }
      return
    }
    // 2. Only Year entered (valid year)
    if (y.length === 4 && !d && !m) {
      const yNum = parseInt(y, 10)
      if (yNum >= minYear && yNum <= maxYear) {
        // Check if we need to update - clear dateOfBirth to enforce mutual exclusivity
        if (dateOfBirth !== null || birthYear !== yNum) {
          isInternalUpdate.current = true
          onChange(null, yNum, id)  // Send null for dateOfBirth when year is set
        }
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
        yearNum < minYear ||
        yearNum > maxYear ||
        monthNum < 1 ||
        monthNum > 12 ||
        dayNum < 1 ||
        dayNum > 31
      ) {
        // Invalid date parts, don't emit valid date yet, or emit null if it was previously valid
        if (dateOfBirth !== null || birthYear !== null) {
          // Optional: could emit null here to clear parent error state if desired,
          // but usually we wait for valid input. Let's emit null to be safe if it was valid before.
          isInternalUpdate.current = true
          onChange(null, null, id)
        }
        return
      }
      // Strict date check (e.g. 31-02-2000 is invalid)
      const dateObj = new Date(yearNum, monthNum - 1, dayNum)
      if (
        dateObj.getFullYear() === yearNum &&
        dateObj.getMonth() === monthNum - 1 &&
        dateObj.getDate() === dayNum
      ) {
        const newDateStr = `${d}-${m}-${y}`
        // Update if different - clear birthYear to enforce mutual exclusivity
        if (dateOfBirth !== newDateStr || birthYear !== null) {  // Check if birthYear needs clearing
          isInternalUpdate.current = true
          onChange(newDateStr, null, id)  // Send null for birthYear when full date is set
        }
      } else {
        // Invalid date logic (e.g. Feb 30)
        if (dateOfBirth !== null || birthYear !== null) {
          isInternalUpdate.current = true
          onChange(null, null, id)
        }
      }
      return
    }
    // 4. Partial/Incomplete state (e.g. just day, or day+month but no year)
    // We emit nulls to clear any previous valid state
    if (dateOfBirth !== null || birthYear !== null) {
      isInternalUpdate.current = true
      onChange(null, null, id)
    }
  }, [day, month, year, minYear, maxYear, onChange, dateOfBirth, birthYear, id])
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
          onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))}
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
          onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))}
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
          onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
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
