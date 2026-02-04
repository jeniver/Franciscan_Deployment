import React, { useEffect, useState } from 'react'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
interface DateOfBirthPickerProps {
  initialMode?: 'full' | 'year'
  initialDay?: string
  initialMonth?: string
  initialYear?: string
  onChange: (value: {
    mode: 'full' | 'year'
    day?: string
    month?: string
    year?: string
  }) => void
  disabled?: boolean
  variant?: 'card' | 'inline'
}
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const days = Array.from(
  {
    length: 31,
  },
  (_, i) => String(i + 1).padStart(2, '0'),
)
const currentYear = new Date().getFullYear()
const years = Array.from(
  {
    length: 120,
  },
  (_, i) => String(currentYear - i),
)
export function DateOfBirthPicker({
  initialMode = 'full',
  initialDay = '',
  initialMonth = '',
  initialYear = '',
  onChange,
  disabled = false,
  variant = 'card',
}: DateOfBirthPickerProps) {
  const [mode, setMode] = useState<'full' | 'year'>(initialMode)
  const [day, setDay] = useState(initialDay)
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  useEffect(() => {
    setMode(initialMode)
    setDay(initialDay)
    setMonth(initialMonth)
    setYear(initialYear)
  }, [initialMode, initialDay, initialMonth, initialYear])
  const handleModeChange = (newMode: 'full' | 'year') => {
    setMode(newMode)
    if (newMode === 'year') {
      setDay('')
      setMonth('')
      onChange({
        mode: 'year',
        year,
      })
    } else {
      onChange({
        mode: 'full',
        day,
        month,
        year,
      })
    }
  }
  const handleDayChange = (newDay: string) => {
    setDay(newDay)
    onChange({
      mode: 'full',
      day: newDay,
      month,
      year,
    })
  }
  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth)
    onChange({
      mode: 'full',
      day,
      month: newMonth,
      year,
    })
  }
  const handleYearChange = (newYear: string) => {
    setYear(newYear)
    if (mode === 'full') {
      onChange({
        mode: 'full',
        day,
        month,
        year: newYear,
      })
    } else {
      onChange({
        mode: 'year',
        year: newYear,
      })
    }
  }
  // Styles based on variant
  const isCard = variant === 'card'
  const containerClass = isCard
    ? 'w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden'
    : 'w-full space-y-2'
  const focusRingClass = isCard ? 'focus:ring-gray-900' : 'focus:ring-[#8b5a2b]'
  const selectClass = `w-full appearance-none bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 ${focusRingClass} focus:border-transparent transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer`
  return (
    <div className={isCard ? 'w-full max-w-md mx-auto' : 'w-full'}>
      <div
        className={
          isCard
            ? 'bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden'
            : ''
        }
      >
        {/* Header Section - Only for Card variant */}
        {isCard && (
          <div className="p-6 pb-4 border-b border-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-900 rounded-lg text-white shadow-lg shadow-gray-900/20">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    Date of Birth
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Please enter your birth details
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inline Header with Label and Toggle */}
        {!isCard && (
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>

            {/* Compact Toggle for Inline */}
            <div className="bg-gray-100 p-0.5 rounded-lg flex relative text-xs">
              <motion.div
                className="absolute top-0.5 bottom-0.5 bg-white rounded-md shadow-sm border border-gray-200/50"
                initial={false}
                animate={{
                  x: mode === 'full' ? 0 : '100%',
                  width: '50%',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />

              <button
                type="button"
                onClick={() => handleModeChange('full')}
                disabled={disabled}
                className={`relative z-10 px-3 py-1 font-medium transition-colors duration-200 rounded-md ${mode === 'full' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Full Date
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('year')}
                disabled={disabled}
                className={`relative z-10 px-3 py-1 font-medium transition-colors duration-200 rounded-md ${mode === 'year' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Year Only
              </button>
            </div>
          </div>
        )}

        {/* Card Toggle */}
        {isCard && (
          <div className="px-6 pb-4">
            <div className="bg-gray-100/80 p-1 rounded-xl flex relative">
              <motion.div
                className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm border border-gray-200/50"
                initial={false}
                animate={{
                  x: mode === 'full' ? 0 : '100%',
                  width: '50%',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />

              <button
                type="button"
                onClick={() => handleModeChange('full')}
                disabled={disabled}
                className={`relative z-10 flex-1 py-2 text-sm font-semibold transition-colors duration-200 text-center rounded-lg ${mode === 'full' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Full Date
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('year')}
                disabled={disabled}
                className={`relative z-10 flex-1 py-2 text-sm font-semibold transition-colors duration-200 text-center rounded-lg ${mode === 'year' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Year Only
              </button>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className={isCard ? 'p-6 pt-2 bg-gray-50/30' : ''}>
          <AnimatePresence mode="wait">
            {mode === 'full' ? (
              <motion.div
                key="full"
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -5,
                }}
                transition={{
                  duration: 0.2,
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                {/* Day Select */}
                <div className="relative flex-1 min-w-[80px]">
                  {isCard && (
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                      Day
                    </label>
                  )}
                  <div className="relative group">
                    <select
                      value={day}
                      onChange={(e) => handleDayChange(e.target.value)}
                      disabled={disabled}
                      className={selectClass}
                    >
                      <option value="" disabled>
                        DD
                      </option>
                      {days.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>

                {/* Month Select */}
                <div className="relative flex-[2] min-w-[140px]">
                  {isCard && (
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                      Month
                    </label>
                  )}
                  <div className="relative group">
                    <select
                      value={month}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      disabled={disabled}
                      className={selectClass}
                    >
                      <option value="" disabled>
                        Select Month
                      </option>
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>

                {/* Year Select */}
                <div className="relative flex-1 min-w-[100px]">
                  {isCard && (
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                      Year
                    </label>
                  )}
                  <div className="relative group">
                    <select
                      value={year}
                      onChange={(e) => handleYearChange(e.target.value)}
                      disabled={disabled}
                      className={selectClass}
                    >
                      <option value="" disabled>
                        YYYY
                      </option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="year"
                initial={{
                  opacity: 0,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.98,
                }}
                transition={{
                  duration: 0.2,
                }}
              >
                {isCard && (
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                    Year of Birth
                  </label>
                )}
                <div className="relative group">
                  <select
                    value={year}
                    onChange={(e) => handleYearChange(e.target.value)}
                    disabled={disabled}
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Select Year
                    </option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                </div>
                {isCard && (
                  <p className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-600">
                      <span className="text-xs font-bold">i</span>
                    </span>
                    Only the year will be stored.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
