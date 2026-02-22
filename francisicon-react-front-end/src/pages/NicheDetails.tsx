import React, { useCallback, useEffect, useMemo, useState, memo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon } from 'lucide-react'
import { useChapel } from '../hooks/useChapel'
import { useNiche } from '../hooks/useNiche'
import { useSelector } from 'react-redux'
import { RootState } from '../store'

// Memoized NicheButton component — rectangular, styled to match the columbarium grid image
const NicheButton = memo(
  ({
    niche,
    statusInfo,
    isSelected,
    isMatchingLocation,
    onNicheClick,
  }: {
    niche: any
    statusInfo: any
    isSelected: boolean
    isMatchingLocation?: boolean
    onNicheClick: (nicheId: number) => void
  }) => {
    const handleClick = useCallback(() => {
      onNicheClick(niche.nicheId)
    }, [niche.nicheId, onNicheClick])

    /**
     * Status styles matched to the image:
     *  - Occupied  → dark crimson bg  + bright gold text  (most common in image)
     *  - Booked    → amber/gold bg    + very dark text
     *  - Available → white/cream bg   + dark text, green border
     *  - Selected  → warm brown bg    + white text, thick border + ring
     *  - Matching  → blue tint bg     + dark blue text
     */
    const getStatusStyles = (): {
      bg: string
      text: string
      border: string
      borderWidth: string
      cursor: string
      ring?: string
      textShadow?: string
    } => {
      if (isSelected) {
        return {
          bg: '#8b5a2b',
          text: '#ffffff',
          border: '#5c3a1e',
          borderWidth: '3px',
          cursor: 'pointer',
          ring: '0 0 0 3px rgba(139,90,43,0.5)',
          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
        }
      }
      if (isMatchingLocation) {
        return {
          bg: '#dbeafe',
          text: '#1e3a8a',
          border: '#3b82f6',
          borderWidth: '3px',
          cursor: 'pointer',
          ring: '0 0 0 2px rgba(59,130,246,0.4)',
        }
      }
      if (!niche.isAvailable) {
        const statusLower = (statusInfo.statusText || '').toLowerCase()
        const isOccupied = statusLower.includes('occupied')
        const isBooked = statusLower.includes('booked')
        if (isOccupied) {
          // Dark crimson background + bright gold/yellow text — matches image dominant style
          return {
            bg: '#7f1d1d',
            text: '#fbbf24',
            border: '#991b1b',
            borderWidth: '2px',
            cursor: 'not-allowed',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
          }
        }
        if (isBooked) {
          // Gold/amber background + very dark text — matches yellow niches in image
          return {
            bg: '#fbbf24',
            text: '#1c1917',
            border: '#d97706',
            borderWidth: '2px',
            cursor: 'not-allowed',
          }
        }
        // Other unavailable
        return {
          bg: '#e5e7eb',
          text: '#374151',
          border: '#9ca3af',
          borderWidth: '2px',
          cursor: 'not-allowed',
        }
      }
      // Available — white/cream with green border
      return {
        bg: '#fefce8',
        text: '#14532d',
        border: '#16a34a',
        borderWidth: '2px',
        cursor: 'pointer',
      }
    }

    const s = getStatusStyles()

    return (
      <button
        onClick={handleClick}
        disabled={!niche.isAvailable && !isSelected}
        title={`${niche.code} — ${statusInfo.statusText} — $${niche.defaultAmount}${isSelected ? ' (SELECTED)' : isMatchingLocation ? ' (MATCHES LOCATION)' : ''}`}
        style={{
          backgroundColor: s.bg,
          color: s.text,
          borderColor: s.border,
          borderWidth: s.borderWidth,
          borderStyle: 'solid',
          cursor: s.cursor,
          boxShadow: s.ring || 'none',
          borderRadius: '4px',
          // Rectangular: fixed height, auto width to fit code
          height: '34px',
          minWidth: '58px',
          padding: '0 6px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: s.text,
            fontWeight: '800',
            fontSize: '13px',
            letterSpacing: '0.02em',
            lineHeight: 1,
            WebkitTextFillColor: s.text,
            textShadow: s.textShadow || 'none',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {niche.code}
        </span>
      </button>
    )
  },
)
NicheButton.displayName = 'NicheButton'

interface NicheDetailsProps {
  formData: any
  setFormData: (data: any) => void
  isReadOnly?: boolean
}

export function NicheDetails({
  formData,
  setFormData,
  isReadOnly = false,
}: NicheDetailsProps) {
  const applicationNumber = useSelector(
    (state: RootState) => state.application.applicationNumber,
  )
  const isExistingApplication = Boolean(applicationNumber?.trim()) || isReadOnly

  const {
    chapels,
    selectedChapel,
    loading: chapelLoading,
    error: chapelError,
    handleSelectChapel,
  } = useChapel()

  const {
    niches,
    walls,
    statistics,
    currentPage,
    nichesPerPage,
    totalNiches,
    selectedNiches,
    loading: nicheLoading,
    error: nicheError,
    handleLoadNichesByChapel,
    handleSelectNiche,
    handleSetCurrentPage,
    getPaginatedNiches,
    getTotalPages,
    getNicheStatusInfo,
    handleResetNicheState,
    handleSetSelectedNiches,
  } = useNiche()

  // Load niches when chapel data becomes available or changes
  useEffect(() => {
    const rawChapelId = formData?.chapelId ?? selectedChapel?.chapelId
    const chapelId =
      typeof rawChapelId === 'string' ? parseInt(rawChapelId, 10) : rawChapelId

    if (!chapelId || Number.isNaN(chapelId)) return

    const chapel =
      selectedChapel && selectedChapel.chapelId === chapelId
        ? selectedChapel
        : chapels.find((c) => c.chapelId === chapelId)

    if (chapel && (!selectedChapel || selectedChapel.chapelId !== chapelId)) {
      handleSelectChapel(chapel)
    }

    const shouldLoadNiches =
      chapel && (!niches.length || selectedChapel?.chapelId !== chapelId)

    if (shouldLoadNiches) {
      handleLoadNichesByChapel(chapel.chapelId, chapel.churchId ?? 1)
    }
  }, [
    chapels,
    formData?.chapelId,
    niches.length,
    selectedChapel,
    handleLoadNichesByChapel,
    handleSelectChapel,
  ])

  // Find niche matching location info
  const matchingNicheByLocation = useMemo(() => {
    if (
      !formData.wallName ||
      !formData.rowNumber ||
      !walls.length ||
      !niches.length
    )
      return null

    for (const wall of walls) {
      if (
        wall.wallName === formData.wallName ||
        wall.wallCode === formData.wallCode
      ) {
        for (const row of wall.rows) {
          const rowMatches =
            row.rowCode === formData.rowNumber ||
            String(row.rowId) === String(formData.rowNumber)
          const levelMatches =
            row.level === formData.rowLevel ||
            String(row.level) === String(formData.rowLevel)

          if (rowMatches && levelMatches) {
            if (formData.nicheCode) {
              const niche = row.niches.find(
                (n: any) =>
                  n.code === formData.nicheCode ||
                  String(n.nicheId) === String(formData.nicheCode),
              )
              if (niche) return niche
            }
            if (row.niches.length > 0) return row.niches[0]
          }
        }
      }
    }
    return null
  }, [
    formData.wallName,
    formData.wallCode,
    formData.rowNumber,
    formData.rowLevel,
    formData.nicheCode,
    walls,
    niches,
  ])

  const currentNiches = useMemo(
    () => getPaginatedNiches(),
    [niches, currentPage, nichesPerPage],
  )

  const totalPages = useMemo(
    () => getTotalPages(),
    [totalNiches, nichesPerPage],
  )

  // Auto-select and navigate to matching niche
  useEffect(() => {
    if (matchingNicheByLocation && niches.length > 0) {
      if (!selectedNiches.includes(matchingNicheByLocation.nicheId)) {
        handleSetSelectedNiches([matchingNicheByLocation.nicheId])

        setFormData({
          ...formData,
          nicheId: matchingNicheByLocation.nicheId,
          nicheCode: matchingNicheByLocation.code,
          selectedNiches: [matchingNicheByLocation.nicheId],
          niche: {
            ...formData.niche,
            number: matchingNicheByLocation.nicheId.toString(),
            totalAmount: matchingNicheByLocation.defaultAmount || 2000,
          },
        })
      }

      const nicheIndex = niches.findIndex(
        (n: any) => n.nicheId === matchingNicheByLocation.nicheId,
      )
      if (nicheIndex >= 0) {
        const pageNumber = Math.ceil((nicheIndex + 1) / nichesPerPage)
        if (
          pageNumber !== currentPage &&
          pageNumber >= 1 &&
          pageNumber <= totalPages
        ) {
          handleSetCurrentPage(pageNumber)
        }
      }
    }
  }, [
    matchingNicheByLocation,
    niches,
    selectedNiches,
    currentPage,
    nichesPerPage,
    totalPages,
    handleSelectNiche,
    handleSetSelectedNiches,
    handleSetCurrentPage,
    setFormData,
  ])

  const handleChapelChange = (chapelId: string) => {
    const parsedChapelId = parseInt(chapelId, 10)
    const chapel = chapels.find((c) => c.chapelId === parsedChapelId)
    if (chapel) {
      handleResetNicheState()
      handleSelectChapel(chapel)
      handleSetSelectedNiches([])
      handleLoadNichesByChapel(chapel.chapelId, chapel.churchId ?? 1)

      setFormData({
        ...formData,
        chapel: chapel.name,
        chapelId: chapel.chapelId,
        chapelCode: chapel.code,
        selectedNiches: [],
        nicheCode: '',
        wallName: '',
        wallCode: '',
        rowNumber: '',
        rowLevel: '',
        niche: {
          ...formData.niche,
          number: '',
          totalAmount: 0,
        },
      })
    }
  }

  const handleNicheClick = useCallback(
    (nicheId: number) => {
      const niche = niches.find((n: any) => n.nicheId === nicheId)
      if (!niche || !niche.isAvailable) return

      const wallName = (niche as any)?.wallName || ''
      const wallCode = (niche as any)?.wallCode || ''
      const rowNumber = (niche as any)?.rowNumber || ''
      const rowLevel = (niche as any)?.rowLevel || ''

      const isCurrentlySelected = selectedNiches.includes(nicheId)
      const newSelected = isCurrentlySelected ? [] : [nicheId]

      handleSetSelectedNiches(newSelected)

      const primaryNicheCode =
        newSelected.length > 0
          ? niches.find((n: any) => n.nicheId === newSelected[0])?.code || ''
          : ''

      setFormData({
        ...formData,
        selectedNiches: newSelected,
        nicheId: newSelected.length > 0 ? newSelected[0] : null,
        nicheCode: primaryNicheCode,
        niche: {
          ...formData.niche,
          number: newSelected.length > 0 ? newSelected[0].toString() : '',
          totalAmount: newSelected.length * (niche.defaultAmount || 2000),
        },
        wallName,
        wallCode,
        rowNumber,
        rowLevel,
      })

      if (!isCurrentlySelected) {
        const nicheIndex = niches.findIndex((n: any) => n.nicheId === nicheId)
        if (nicheIndex >= 0) {
          const pageNumber = Math.ceil((nicheIndex + 1) / nichesPerPage)
          if (
            pageNumber !== currentPage &&
            pageNumber >= 1 &&
            pageNumber <= totalPages
          ) {
            handleSetCurrentPage(pageNumber)
          }
        }
      }
    },
    [
      niches,
      selectedNiches,
      currentPage,
      nichesPerPage,
      totalPages,
      handleSelectNiche,
      handleSetCurrentPage,
      setFormData,
    ],
  )

  const handleNicheCodeChange = useCallback(
    (code: string) => {
      if (code.trim() && niches.length > 0) {
        const searchCode = String(code || '')
          .toLowerCase()
          .trim()
        const niche = niches.find(
          (n: any) => String(n.code || '').toLowerCase() === searchCode,
        )

        if (niche && niche.isAvailable) {

          const wallName = (niche as any)?.wallName || ''
          const wallCode = (niche as any)?.wallCode || ''
          const rowNumber = (niche as any)?.rowNumber || ''
          const rowLevel = (niche as any)?.rowLevel || ''

          const newSelected = [niche.nicheId]
          handleSetSelectedNiches(newSelected)

          setFormData({
            ...formData,
            nicheId: niche.nicheId,
            nicheCode: niche.code,
            selectedNiches: newSelected,
            niche: {
              ...formData.niche,
              number: niche.nicheId.toString(),
              totalAmount: niche.defaultAmount || 2000,
            },
            wallName,
            wallCode,
            rowNumber,
            rowLevel,
          })

          const nicheIndex = niches.findIndex(
            (n: any) => n.nicheId === niche.nicheId,
          )
          if (nicheIndex >= 0) {
            const pageNumber = Math.ceil((nicheIndex + 1) / nichesPerPage)
            if (
              pageNumber !== currentPage &&
              pageNumber >= 1 &&
              pageNumber <= totalPages
            ) {
              handleSetCurrentPage(pageNumber)
            }
          }
        } else {
          setFormData({
            ...formData,
            nicheCode: code,
          })
        }
      } else if (!code.trim()) {
        handleSetSelectedNiches([])
        setFormData({
          ...formData,
          nicheId: null,
          nicheCode: '',
          selectedNiches: [],
          niche: {
            ...formData.niche,
            number: '',
            totalAmount: 0,
          },
          wallName: '',
          wallCode: '',
          rowNumber: '',
          rowLevel: '',
        })
      } else {
        setFormData({
          ...formData,
          nicheCode: code,
        })
      }
    },
    [
      niches,
      selectedNiches,
      currentPage,
      nichesPerPage,
      totalPages,
      handleSelectNiche,
      handleSetCurrentPage,
      handleSetSelectedNiches,
      setFormData,
    ],
  )

  const goToPage = useCallback(
    (page: number) =>
      handleSetCurrentPage(Math.max(1, Math.min(page, totalPages))),
    [totalPages, handleSetCurrentPage],
  )

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) handleSetCurrentPage(currentPage + 1)
  }, [currentPage, totalPages, handleSetCurrentPage])

  const prevPage = useCallback(() => {
    if (currentPage > 1) handleSetCurrentPage(currentPage - 1)
  }, [currentPage, handleSetCurrentPage])

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-[#8b5a2b] to-[#6d4420] rounded-xl flex items-center justify-center">
          <MapPinIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Niche Selection</h2>
          <p className="text-sm text-gray-600">
            Select your preferred niche location and details
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Chapel + View Niches */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Chapel
            </label>
            <select
              value={formData.chapelId || ''}
              onChange={(e) => handleChapelChange(e.target.value)}
              disabled={chapelLoading || isReadOnly}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {chapelLoading ? 'Loading chapels...' : 'Select Chapel'}
              </option>
              {chapels.map((chapel: any) => (
                <option key={chapel.chapelId} value={chapel.chapelId}>
                  {chapel.name} ({chapel.code})
                </option>
              ))}
            </select>
            {chapelError && (
              <p className="text-red-500 text-xs mt-1">{chapelError}</p>
            )}
          </div>
          <div className="flex items-end">
            <button
              className="w-full px-4 py-2.5 bg-[#8b5a2b] text-white rounded-lg hover:bg-[#6d4420] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={chapelLoading || !formData.chapelId}
            >
              {chapelLoading ? 'Loading...' : 'View Niches'}
            </button>
          </div>
        </div>

        {/* Niche Code + Selected Chapel */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Niche Code (Selected)
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.nicheCode || ''}
                onChange={(e) => handleNicheCodeChange(e.target.value)}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent font-medium ${isExistingApplication || isReadOnly ? 'bg-gray-100 cursor-not-allowed border-gray-300' : selectedNiches.length > 0 && formData.nicheCode ? 'bg-[#8b5a2b] text-white border-[#8b5a2b]' : 'bg-white border-gray-300'}`}
                placeholder={
                  selectedNiches.length > 0
                    ? formData.nicheCode || 'Enter niche code'
                    : 'Enter niche code (e.g., 1201)'
                }
                disabled={isExistingApplication || isReadOnly}
                title={
                  isExistingApplication
                    ? 'Niche code cannot be edited when viewing existing application'
                    : selectedNiches.length > 0
                      ? `Selected niche code: ${formData.nicheCode}`
                      : 'Enter niche code to search and select niche'
                }
              />
              {formData.nicheCode && niches.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {niches.find(
                    (n: any) =>
                      String(n.code || '').toLowerCase() ===
                      String(formData.nicheCode || '').toLowerCase(),
                  ) ? (
                    <div
                      className="w-2 h-2 bg-green-500 rounded-full"
                      title="Niche found"
                    />
                  ) : (
                    <div
                      className="w-2 h-2 bg-red-500 rounded-full"
                      title="Niche not found"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Selected Chapel
            </label>
            <input
              type="text"
              value={
                selectedChapel
                  ? `${selectedChapel.name} (${selectedChapel.code})`
                  : formData.chapel || ''
              }
              readOnly
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              placeholder="No chapel selected"
            />
          </div>
        </div>

        {/* ── Niche Grid ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xl font-bold text-gray-900">Select Niche</h4>
            <span className="text-sm font-semibold text-gray-700">
              Page {currentPage} of {totalPages} &bull; {selectedNiches.length}{' '}
              selected
            </span>
          </div>

          <div
            className="rounded-xl p-4 mb-4"
            style={{
              backgroundColor: '#f5e6c8',
              border: '2px solid #c8a96e',
            }}
          >
            {nicheLoading ? (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(
                  {
                    length: nichesPerPage,
                  },
                  (_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded bg-amber-200"
                      style={{
                        height: '34px',
                        minWidth: '58px',
                        flex: '0 0 auto',
                      }}
                    />
                  ),
                )}
              </div>
            ) : currentNiches.length === 0 ? (
              <div className="text-center py-12 text-amber-800 font-medium">
                {formData.chapelId
                  ? 'No niches found for this page.'
                  : 'Select a chapel to view niches.'}
              </div>
            ) : (
              (() => {
                const grouped: Record<string, typeof currentNiches> = {}
                let hasGrouping = false
                for (const niche of currentNiches) {
                  const rowKey =
                    (niche as any).rowLevel != null
                      ? String((niche as any).rowLevel)
                      : (niche as any).rowNumber != null
                        ? String((niche as any).rowNumber)
                        : 'all'
                  if (rowKey !== 'all') hasGrouping = true
                  if (!grouped[rowKey]) grouped[rowKey] = []
                  grouped[rowKey].push(niche)
                }

                if (hasGrouping) {
                  const sortedKeys = Object.keys(grouped).sort(
                    (a, b) => Number(b) - Number(a),
                  )
                  return (
                    <div className="flex flex-col gap-2">
                      {sortedKeys.map((rowKey) => (
                        <div key={rowKey} className="flex flex-wrap gap-1.5">
                          {grouped[rowKey].map((niche: any) => {
                            const statusInfo = getNicheStatusInfo(niche)
                            const isSelected = selectedNiches.includes(
                              niche.nicheId,
                            )
                            const isMatchingLocation =
                              matchingNicheByLocation?.nicheId === niche.nicheId
                            return (
                              <NicheButton
                                key={niche.nicheId}
                                niche={niche}
                                statusInfo={statusInfo}
                                isSelected={isSelected}
                                isMatchingLocation={isMatchingLocation}
                                onNicheClick={handleNicheClick}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )
                }


                return (
                  <div className="flex flex-wrap gap-1.5">
                    {currentNiches.map((niche: any) => {
                      const statusInfo = getNicheStatusInfo(niche)
                      const isSelected = selectedNiches.includes(niche.nicheId)
                      const isMatchingLocation =
                        matchingNicheByLocation?.nicheId === niche.nicheId
                      return (
                        <NicheButton
                          key={niche.nicheId}
                          niche={niche}
                          statusInfo={statusInfo}
                          isSelected={isSelected}
                          isMatchingLocation={isMatchingLocation}
                          onNicheClick={handleNicheClick}
                        />
                      )
                    })}
                  </div>
                )
              })()
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-gray-900 bg-white border-2 border-gray-400 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from(
                {
                  length: Math.min(5, totalPages),
                },
                (_, i) => {
                  const pageNum =
                    Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  if (pageNum > totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-2 text-sm font-bold rounded-lg transition-colors ${currentPage === pageNum ? 'bg-[#8b5a2b] text-white' : 'text-gray-900 bg-white border-2 border-gray-400 hover:bg-gray-50'}`}
                    >
                      {pageNum}
                    </button>
                  )
                },
              )}
            </div>

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-gray-900 bg-white border-2 border-gray-400 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          {/* ── Wall Selection ── */}
          {
            walls.length > 0 && (
              <WallSelection
                walls={walls}
                niches={niches}
                nichesPerPage={nichesPerPage}
                onNavigateToPage={handleSetCurrentPage}
              />
            )
          }

        </div>

        {/* Statistics */}
        {statistics && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Chapel Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-600">Total Niches:</span>
                <span className="font-bold ml-1 text-gray-900">
                  {statistics.totalNiches}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Available:</span>
                <span className="font-bold ml-1 text-green-700">
                  {statistics.vacant}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Booked:</span>
                <span className="font-bold ml-1 text-amber-700">
                  {statistics.booked}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Occupied:</span>
                <span className="font-bold ml-1 text-red-800">
                  {statistics.occupied}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <div
              className="rounded"
              style={{
                width: 32,
                height: 20,
                backgroundColor: '#fefce8',
                border: '2px solid #16a34a',
              }}
            />
            <span className="font-bold text-green-800">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="rounded"
              style={{
                width: 32,
                height: 20,
                backgroundColor: '#fbbf24',
                border: '2px solid #d97706',
              }}
            />
            <span className="font-bold text-amber-900">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="rounded flex items-center justify-center"
              style={{
                width: 32,
                height: 20,
                backgroundColor: '#7f1d1d',
                border: '2px solid #991b1b',
              }}
            >
              <span
                style={{
                  color: '#fbbf24',
                  fontSize: 9,
                  fontWeight: 900,
                }}
              >
                ●
              </span>
            </div>
            <span className="font-bold text-red-900">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="rounded"
              style={{
                width: 32,
                height: 20,
                backgroundColor: '#8b5a2b',
                border: '2px solid #5c3a1e',
              }}
            />
            <span className="font-bold text-gray-700">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="rounded"
              style={{
                width: 32,
                height: 20,
                backgroundColor: '#dbeafe',
                border: '2px solid #3b82f6',
              }}
            />
            <span className="font-bold text-blue-800">Matches Location</span>
          </div>
        </div>

        {/* Error */}
        {nicheError && (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-800">
            <p className="text-sm">{nicheError}</p>
          </div>
        )}


      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Wall Selection component – rendered at the bottom of NicheDetails  */
/* ------------------------------------------------------------------ */
function WallSelection({
  walls,
  niches,
  nichesPerPage,
  onNavigateToPage,
}: {
  walls: any[]
  niches: any[]
  nichesPerPage: number
  onNavigateToPage: (page: number) => void
}) {
  const [selectedWallId, setSelectedWallId] = useState<number | null>(null)

  const handleSelectWall = (wallId: number) => {
    const next = selectedWallId === wallId ? null : wallId
    setSelectedWallId(next)

    if (next !== null) {
      const firstIdx = niches.findIndex((n: any) => n.wallId === next)
      if (firstIdx >= 0) {
        onNavigateToPage(Math.ceil((firstIdx + 1) / nichesPerPage))
      }
    }
  }

  const selectedWall = walls.find((w) => w.wallId === selectedWallId)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h4 className="text-lg font-bold text-gray-900 mb-4">Wall Selection</h4>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {walls.map((wall: any) => {
          const isActive = selectedWallId === wall.wallId
          return (
            <button
              key={wall.wallId}
              onClick={() => handleSelectWall(wall.wallId)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${isActive
                ? 'border-[#8b5a2b] bg-[#fdf6ee] ring-2 ring-[#8b5a2b]/30'
                : 'border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-white'
                }`}
            >
              <p
                className={`text-sm font-bold ${isActive ? 'text-[#8b5a2b]' : 'text-gray-900'}`}
              >
                {wall.wallName || wall.wallCode}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {wall.nicheCount} niches &middot; {wall.rowCount} rows
              </p>
            </button>
          )
        })}
      </div>

      {/* {selectedWall && (
        <div className="mt-4 p-4 rounded-lg bg-[#fdf6ee] border border-[#e5d3b3]">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-bold text-[#8b5a2b]">
              {selectedWall.wallName} ({selectedWall.wallCode})
            </h5>
            <span className="text-xs font-semibold text-gray-600">
              {selectedWall.nicheCount} niches
            </span>
          </div>

          <div className="space-y-1.5">
            {(selectedWall.rows || []).map((row: any) => (
              <div
                key={row.rowId}
                className="flex items-center justify-between text-sm bg-white/70 rounded px-3 py-1.5"
              >
                <span className="font-medium text-gray-800">
                  Row {row.rowCode}
                  {row.level != null && (
                    <span className="text-gray-500 ml-1">
                      (Level {row.level})
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-500">
                  {row.nicheCount ?? row.niches?.length ?? 0} niches
                </span>
              </div>
            ))}
          </div>
        </div>
      )} */}
    </div>
  )
}