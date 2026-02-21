import { useEffect, useMemo, useCallback, memo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon } from 'lucide-react';
import { useChapel } from '../hooks/useChapel';
import { useNiche } from '../hooks/useNiche';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Memoized NicheButton component to prevent unnecessary re-renders
const NicheButton = memo(({ niche, statusInfo, isSelected, isMatchingLocation, onNicheClick }: {
  niche: any;
  statusInfo: any;
  isSelected: boolean;
  isMatchingLocation?: boolean;
  onNicheClick: (nicheId: number) => void;
}) => {
  const handleClick = useCallback(() => {
    onNicheClick(niche.nicheId);
  }, [niche.nicheId, onNicheClick]);

  // Determine text and background colors based on status for maximum visibility
  const getStatusStyles = () => {
    if (isSelected) {
      return {
        backgroundColor: '#8b5a2b',
        color: '#ffffff',
        borderColor: '#8b5a2b',
        className: 'bg-[#8b5a2b] text-white border-[#8b5a2b] border-4 shadow-xl transform scale-105 ring-2 ring-[#8b5a2b] ring-offset-2'
      };
    }

    if (isMatchingLocation) {
      return {
        backgroundColor: '#dbeafe',
        color: '#1e3a8a',
        borderColor: '#3b82f6',
        className: 'bg-blue-100 border-blue-500 border-3 shadow-lg ring-2 ring-blue-400 ring-offset-1'
      };
    }

    if (!niche.isAvailable) {
      const statusLower = (statusInfo.statusText || '').toLowerCase();
      const isBooked = statusLower.includes('booked');
      const isOccupied = statusLower.includes('occupied');

      // For occupied niches, use white text on dark red background for maximum contrast
      if (isOccupied) {
        // Always use white text on dark red background for maximum visibility
        // Override API background color if it's too light
        const bgColor = statusInfo.statusColor || '#dc2626';
        // If the background color is light (high brightness), use dark text instead
        const isLightBg = bgColor && (
          bgColor.includes('fef') ||
          bgColor.includes('fff') ||
          bgColor.includes('f9f') ||
          bgColor.includes('f3f') ||
          bgColor.includes('f7f')
        );

        return {
          backgroundColor: isLightBg ? '#fee2e2' : (bgColor || '#dc2626'), // Light red if API provides light color, else dark red
          color: isLightBg ? '#7f1d1d' : '#ffffff', // Dark red text on light bg, white text on dark bg
          borderColor: isLightBg ? '#dc2626' : '#991b1b',
          className: 'border-red-800 border-2 cursor-not-allowed',
          fontWeight: 'bold'
        };
      }

      if (isBooked) {
        // Use very dark text on light yellow background
        return {
          backgroundColor: statusInfo.statusColor || '#fef3c7',
          color: '#78350f',
          borderColor: '#d97706',
          className: 'border-yellow-700 border-2 cursor-not-allowed',
          fontWeight: 'bold'
        };
      }

      // Other unavailable statuses
      return {
        backgroundColor: statusInfo.statusColor || '#f3f4f6',
        color: '#111827',
        borderColor: '#6b7280',
        className: 'border-gray-500 border-2 cursor-not-allowed',
        fontWeight: 'bold'
      };
    }

    // Available niches
    return {
      backgroundColor: undefined,
      color: '#14532d',
      borderColor: '#16a34a',
      className: 'bg-green-300 border-green-400 hover:bg-green-100 hover:border-green-500 hover:shadow-md'
    };
  };

  const statusStyles = getStatusStyles();

  return (
    <button
      onClick={handleClick}
      disabled={!niche.isAvailable}
      className={`aspect-square rounded-md text-xs font-bold transition-all duration-200 flex items-center justify-center border-2 ${statusStyles.className}`}
      style={{
        backgroundColor: statusStyles.backgroundColor,
        color: statusStyles.color,
        borderColor: statusStyles.borderColor,
        borderWidth: isSelected ? '4px' : isMatchingLocation ? '3px' : '2px',
        fontWeight: statusStyles.fontWeight || 'bold',
        // Remove opacity for better visibility - ensure text is always visible
        opacity: 1
      }}
      title={`${niche.code} - ${statusInfo.statusText} - $${niche.defaultAmount}${isSelected ? ' (SELECTED)' : isMatchingLocation ? ' (MATCHES LOCATION)' : ''}`}
    >
      <span style={{
        color: statusStyles.color,
        fontWeight: '900',
        letterSpacing: '0.025em',
        fontSize: '1.5rem',
        lineHeight: '1',
        // Force color to be applied
        WebkitTextFillColor: statusStyles.color,
        textShadow: statusStyles.color === '#ffffff' ? '0 1px 2px rgba(0,0,0,0.8)' : 'none'
      }}>
        {niche.code}
      </span>
    </button>
  );
});

interface NicheDetailsProps {
  formData: any;
  setFormData: (data: any) => void;
  isReadOnly?: boolean;
}
export function NicheDetails({
  formData,
  setFormData,
  isReadOnly = false
}: NicheDetailsProps) {
  // Get application number from Redux store for niche code field
  const applicationNumber = useSelector((state: RootState) => state.application.applicationNumber);
  const isExistingApplication = Boolean(applicationNumber?.trim()) || isReadOnly;

  // Use chapel hook for Redux integration
  const {
    chapels,
    selectedChapel,
    loading: chapelLoading,
    error: chapelError,
    handleSelectChapel
  } = useChapel();

  // Use niche hook for Redux integration
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
    handleSetSelectedNiches
  } = useNiche();

  // Load niches when chapel data becomes available or changes
  useEffect(() => {
    const rawChapelId = formData?.chapelId ?? selectedChapel?.chapelId;
    const chapelId = typeof rawChapelId === 'string' ? parseInt(rawChapelId, 10) : rawChapelId;

    if (!chapelId || Number.isNaN(chapelId)) {
      return;
    }

    const chapel =
      (selectedChapel && selectedChapel.chapelId === chapelId)
        ? selectedChapel
        : chapels.find(c => c.chapelId === chapelId);

    if (chapel && (!selectedChapel || selectedChapel.chapelId !== chapelId)) {
      handleSelectChapel(chapel);
    }

    const shouldLoadNiches =
      chapel &&
      (!niches.length || selectedChapel?.chapelId !== chapelId);

    if (shouldLoadNiches) {
      console.log(`Loading niches for chapel ${chapel.chapelId} from form data`);
      handleLoadNichesByChapel(chapel.chapelId, chapel.churchId ?? 1);
    }
  }, [
    chapels,
    formData?.chapelId,
    niches.length,
    selectedChapel,
    handleLoadNichesByChapel,
    handleSelectChapel
  ]);

  // Find niche that matches location information (wallName, rowNumber, rowLevel)
  const matchingNicheByLocation = useMemo(() => {
    if (!formData.wallName || !formData.rowNumber || !walls.length || !niches.length) {
      return null;
    }

    // Search through walls -> rows -> niches to find matching niche
    for (const wall of walls) {
      if (wall.wallName === formData.wallName || wall.wallCode === formData.wallCode) {
        for (const row of wall.rows) {
          const rowMatches = row.rowCode === formData.rowNumber ||
            String(row.rowId) === String(formData.rowNumber);
          const levelMatches = row.level === formData.rowLevel ||
            String(row.level) === String(formData.rowLevel);

          if (rowMatches && levelMatches) {
            // Find niche in this row that matches the niche code if available
            if (formData.nicheCode) {
              const niche = row.niches.find(n =>
                n.code === formData.nicheCode ||
                String(n.nicheId) === String(formData.nicheCode)
              );
              if (niche) return niche;
            }
            // If no niche code, return first available niche in this row
            if (row.niches.length > 0) {
              return row.niches[0];
            }
          }
        }
      }
    }
    return null;
  }, [formData.wallName, formData.wallCode, formData.rowNumber, formData.rowLevel, formData.nicheCode, walls, niches]);

  // Memoize paginated niches to prevent unnecessary recalculations
  const currentNiches = useMemo(() => getPaginatedNiches(), [niches, currentPage, nichesPerPage]);
  const totalPages = useMemo(() => getTotalPages(), [totalNiches, nichesPerPage]);

  // Auto-select and navigate to matching niche when location info is available
  useEffect(() => {
    if (matchingNicheByLocation && niches.length > 0) {
      // Select the niche if not already selected
      if (!selectedNiches.includes(matchingNicheByLocation.nicheId)) {
        handleSelectNiche(matchingNicheByLocation.nicheId);
        handleSetSelectedNiches([...selectedNiches, matchingNicheByLocation.nicheId]);

        // Update form data with niche details
        setFormData({
          ...formData,
          nicheId: matchingNicheByLocation.nicheId, // Set nicheId for validation compatibility
          nicheCode: matchingNicheByLocation.code,
          selectedNiches: [...selectedNiches, matchingNicheByLocation.nicheId],
          niche: {
            ...formData.niche,
            number: matchingNicheByLocation.nicheId.toString(),
            totalAmount: matchingNicheByLocation.defaultAmount || 2000
          }
        });
      }

      // Navigate to the page containing this niche
      const nicheIndex = niches.findIndex(n => n.nicheId === matchingNicheByLocation.nicheId);
      if (nicheIndex >= 0) {
        const pageNumber = Math.ceil((nicheIndex + 1) / nichesPerPage);
        if (pageNumber !== currentPage && pageNumber >= 1 && pageNumber <= totalPages) {
          handleSetCurrentPage(pageNumber);
        }
      }
    }
  }, [matchingNicheByLocation, niches, selectedNiches, currentPage, nichesPerPage, totalPages, handleSelectNiche, handleSetSelectedNiches, handleSetCurrentPage, setFormData]);

  // Handle chapel selection
  const handleChapelChange = (chapelId: string) => {
    const parsedChapelId = parseInt(chapelId, 10);
    const chapel = chapels.find(c => c.chapelId === parsedChapelId);
    if (chapel) {
      handleResetNicheState();
      handleSelectChapel(chapel);
      handleSetSelectedNiches([]);
      handleLoadNichesByChapel(chapel.chapelId, chapel.churchId ?? 1);
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
          totalAmount: 0
        }
      });
    }
  };

  const handleNicheClick = useCallback((nicheId: number) => {
    const niche = niches.find(n => n.nicheId === nicheId);
    if (!niche || !niche.isAvailable) return;

    handleSelectNiche(nicheId);

    // Update form data
    const wallName = (niche as any)?.wallName || '';
    const wallCode = (niche as any)?.wallCode || '';
    const rowNumber = (niche as any)?.rowNumber || '';
    const rowLevel = (niche as any)?.rowLevel || '';

    const isCurrentlySelected = selectedNiches.includes(nicheId);
    const newSelected = isCurrentlySelected
      ? selectedNiches.filter(id => id !== nicheId)
      : [...selectedNiches, nicheId];

    // Update niche code in text box - show the primary selected niche code
    const primaryNicheCode = newSelected.length > 0
      ? (niches.find(n => n.nicheId === newSelected[0])?.code || '')
      : '';

    setFormData({
      ...formData,
      selectedNiches: newSelected,
      nicheId: newSelected.length > 0 ? newSelected[0] : null, // Set nicheId for validation compatibility
      nicheCode: primaryNicheCode, // Update niche code in text box when niche is clicked
      niche: {
        ...formData.niche,
        number: newSelected.length > 0 ? newSelected[0].toString() : '',
        totalAmount: newSelected.length * (niche.defaultAmount || 2000)
      },
      wallName,
      wallCode,
      rowNumber,
      rowLevel
    });

    // Navigate to the page containing this niche if it's not on current page
    if (!isCurrentlySelected) {
      const nicheIndex = niches.findIndex(n => n.nicheId === nicheId);
      if (nicheIndex >= 0) {
        const pageNumber = Math.ceil((nicheIndex + 1) / nichesPerPage);
        if (pageNumber !== currentPage && pageNumber >= 1 && pageNumber <= totalPages) {
          handleSetCurrentPage(pageNumber);
        }
      }
    }
  }, [niches, selectedNiches, currentPage, nichesPerPage, totalPages, handleSelectNiche, handleSetCurrentPage, setFormData]);

  // Handle niche code input - find and highlight niche in grid
  const handleNicheCodeChange = useCallback((code: string) => {
    // If code is entered and we have niches loaded, find and highlight the niche
    if (code.trim() && niches.length > 0) {
      const searchCode = String(code || '').toLowerCase().trim();
      const niche = niches.find(n => String(n.code || '').toLowerCase() === searchCode);
      if (niche && niche.isAvailable) {
        // Select the niche if not already selected
        if (!selectedNiches.includes(niche.nicheId)) {
          handleSelectNiche(niche.nicheId);
        }

        // Update form data with niche details
        const wallName = (niche as any)?.wallName || '';
        const wallCode = (niche as any)?.wallCode || '';
        const rowNumber = (niche as any)?.rowNumber || '';
        const rowLevel = (niche as any)?.rowLevel || '';

        const newSelected = selectedNiches.includes(niche.nicheId)
          ? selectedNiches
          : [...selectedNiches, niche.nicheId];

        setFormData({
          ...formData,
          nicheId: niche.nicheId, // Set nicheId for validation compatibility
          nicheCode: niche.code, // Use the exact niche code from the niche object
          selectedNiches: newSelected,
          niche: {
            ...formData.niche,
            number: niche.nicheId.toString(),
            totalAmount: niche.defaultAmount || 2000
          },
          wallName,
          wallCode,
          rowNumber,
          rowLevel
        });

        // Navigate to the page containing this niche
        const nicheIndex = niches.findIndex(n => n.nicheId === niche.nicheId);
        if (nicheIndex >= 0) {
          const pageNumber = Math.ceil((nicheIndex + 1) / nichesPerPage);
          if (pageNumber !== currentPage && pageNumber >= 1 && pageNumber <= totalPages) {
            handleSetCurrentPage(pageNumber);
          }
        }
      } else {
        // Niche not found or not available - just update the code field
        setFormData({ ...formData, nicheCode: code });
      }
    } else if (!code.trim()) {
      // If code is cleared, clear selection
      handleSetSelectedNiches([]);
      setFormData({
        ...formData,
        nicheId: null, // Clear nicheId when clearing selection
        nicheCode: '',
        selectedNiches: [],
        niche: {
          ...formData.niche,
          number: '',
          totalAmount: 0
        },
        wallName: '',
        wallCode: '',
        rowNumber: '',
        rowLevel: ''
      });
    } else {
      // Just update the code field while typing
      setFormData({ ...formData, nicheCode: code });
    }
  }, [niches, selectedNiches, currentPage, nichesPerPage, totalPages, handleSelectNiche, handleSetCurrentPage, handleSetSelectedNiches, setFormData]);

  const goToPage = useCallback((page: number) => {
    handleSetCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages, handleSetCurrentPage]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      handleSetCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages, handleSetCurrentPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      handleSetCurrentPage(currentPage - 1);
    }
  }, [currentPage, handleSetCurrentPage]);
  return <div className="w-full">
    {/* Header Section */}
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 bg-gradient-to-br from-[#8b5a2b] to-[#6d4420] rounded-xl flex items-center justify-center">
        <MapPinIcon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Niche Selection
        </h2>
        <p className="text-sm text-gray-600">
          Select your preferred niche location and details
        </p>
      </div>
    </div>

    <div className="space-y-6">
      {/* Chapel and Niche Code Section */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Chapel</label>
          <select
            value={formData.chapelId || ''}
            onChange={(e) => handleChapelChange(e.target.value)}
            disabled={chapelLoading || isReadOnly}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{chapelLoading ? 'Loading chapels...' : 'Select Chapel'}</option>
            {chapels.map((chapel) => (
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

      {/* Niche Code and Chapel Display */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Niche Code (Selected)
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.nicheCode || ''}
              onChange={(e) => handleNicheCodeChange(e.target.value)}
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent font-medium ${isExistingApplication || isReadOnly
                ? 'bg-gray-100 cursor-not-allowed border-gray-300'
                : selectedNiches.length > 0 && formData.nicheCode
                  ? 'bg-[#8b5a2b] text-white border-[#8b5a2b] placeholder-white placeholder-opacity-70'
                  : 'bg-white border-gray-300'
                }`}
              placeholder={selectedNiches.length > 0 ? formData.nicheCode || "Enter niche code" : "Enter niche code (e.g., 1201)"}
              disabled={isExistingApplication || isReadOnly}
              title={isExistingApplication
                ? 'Niche code cannot be edited when viewing existing application'
                : selectedNiches.length > 0
                  ? `Selected niche code: ${formData.nicheCode}`
                  : 'Enter niche code to search and select niche'}
            />
            {formData.nicheCode && niches.length > 0 && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {niches.find(n => {
                  const nicheCode = String(n.code || '').toLowerCase();
                  const formCode = String(formData.nicheCode || '').toLowerCase();
                  return nicheCode === formCode;
                }) ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Niche found and highlighted" />
                ) : (
                  <div className="w-2 h-2 bg-red-500 rounded-full" title="Niche not found" />
                )}
              </div>
            )}
          </div>


          {/* Selected Niche Numbers Display */}
          {/* {selectedNiches && selectedNiches.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">Selected Niches:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedNiches.map((nicheId) => {
                    const niche = niches.find(n => n.nicheId === nicheId);
                    return (
                      <span 
                        key={nicheId}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        {niche ? niche.code : `Niche ${nicheId}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )} */}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Selected Chapel</label>
          <input
            type="text"
            value={selectedChapel ? `${selectedChapel.name} (${selectedChapel.code})` : formData.chapel || ''}
            readOnly
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            placeholder="No chapel selected"
          />
        </div>
      </div>



      {/* Niche Selection Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl font-bold text-gray-900">Select Niche</h4>
          <div className="text-sm font-semibold text-gray-800">
            Page {currentPage} of {totalPages} • {selectedNiches.length} selected
          </div>
        </div>

        {/* Niches Grid - Using real API data */}
        <div className="grid grid-cols-8 gap-1.5 mb-4">
          {nicheLoading ? (
            // Loading state
            Array.from({ length: nichesPerPage }, (_, i) => (
              <div key={i} className="aspect-square rounded-md bg-gray-200 animate-pulse" />
            ))
          ) : (
            // Real niche data
            currentNiches.map(niche => {
              const statusInfo = getNicheStatusInfo(niche);
              const isSelected = selectedNiches.includes(niche.nicheId);
              const isMatchingLocation = matchingNicheByLocation?.nicheId === niche.nicheId;

              return (
                <NicheButton
                  key={niche.nicheId}
                  niche={niche}
                  statusInfo={statusInfo}
                  isSelected={isSelected}
                  isMatchingLocation={isMatchingLocation}
                  onNicheClick={handleNicheClick}
                />
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-gray-900 bg-white border-2 border-gray-400 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Previous
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`px-3 py-2 text-sm font-bold rounded-lg transition-colors ${currentPage === pageNum
                    ? 'bg-[#8b5a2b] text-white'
                    : 'text-gray-900 bg-white border-2 border-gray-400 hover:bg-gray-50'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-gray-900 bg-white border-2 border-gray-400 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistics and Legend */}
      {statistics && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Chapel Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-600">Total Niches:</span>
              <span className="font-medium ml-1">{statistics.totalNiches}</span>
            </div>
            <div>
              <span className="text-gray-600">Available:</span>
              <span className="font-bold ml-1 text-green-700">{statistics.vacant}</span>
            </div>
            <div>
              <span className="text-gray-600">Booked:</span>
              <span className="font-bold ml-1 text-yellow-800">{statistics.booked}</span>
            </div>
            <div>
              <span className="text-gray-600">Occupied:</span>
              <span className="font-bold ml-1 text-red-800">{statistics.occupied}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-600 rounded" />
          <span className="text-green-800 font-bold">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-600 rounded" />
          <span className="text-yellow-900 font-bold">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 border-2 border-red-600 rounded" />
          <span className="text-red-900 font-bold">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#8b5a2b] border-2 border-[#8b5a2b] rounded" />
          <span className="text-gray-700 font-medium">Selected</span>
        </div>
      </div>

      {/* Error Display */}
      {nicheError && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-800">
          <p className="text-sm">{nicheError}</p>
        </div>
      )}
      {/* <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Niche Documentation
            </h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              + Add
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Upload supporting documents for your niche selection
          </p>
        </div> */}
    </div>
  </div>;
}