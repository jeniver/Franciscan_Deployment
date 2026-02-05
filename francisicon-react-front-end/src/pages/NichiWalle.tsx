import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, Search } from 'lucide-react'
import { nicheService, Niche as ApiNiche, Wall, Chapel as ApiChapel, NicheResponse } from '../services/nicheService'

// Map API niche status to our internal status
const mapNicheStatus = (apiNiche: ApiNiche): 'Available' | 'Booked' | 'Occupied' => {
  // Status 1 = Vacant/Available, 3 = Booked, 4 = Occupied
  if (apiNiche.status === 1) return 'Available'
  if (apiNiche.status === 3) return 'Booked'
  if (apiNiche.status === 4) return 'Occupied'
  // Fallback - if isAvailable is true, consider it available
  if (apiNiche.isAvailable) return 'Available'
  return 'Occupied' // Default to occupied for safety
}

interface Niche {
  id: number
  code: string
  status: 'Available' | 'Booked' | 'Occupied'
  price: number
  apiData: ApiNiche
}

interface Chapel {
  id: number
  name: string
  code: string
  isCurrent?: boolean
}

// Static chapel mapping as fallback
const STATIC_CHAPELS: Chapel[] = [
  {
    id: 1,
    name: 'St Agnes',
    code: 'SA',
  },
  {
    id: 2,
    name: 'St Peter',
    code: 'SP',
  },
  {
    id: 3,
    name: 'St Colette',
    code: 'SC',
  },
  {
    id: 4,
    name: 'St Joseph',
    code: 'SJ',
  },
]

// Get chapel name from API response or fallback to static mapping
const getChapelInfo = (chapelId: number, apiResponse?: any): Chapel => {
  // Try to get chapel info from API response
  if (apiResponse?.data?.chapel) {
    const apiChapel = apiResponse.data.chapel;
    return {
      id: apiChapel.chapelId,
      name: apiChapel.chapelName || apiChapel.chapelCode || `Chapel ${apiChapel.chapelId}`,
      code: apiChapel.chapelCode || `C${apiChapel.chapelId}`
    };
  }
  
  // Fallback to static mapping
  const staticChapel = STATIC_CHAPELS.find(c => c.id === chapelId);
  return staticChapel || { id: chapelId, name: `Chapel ${chapelId}`, code: `C${chapelId}` };
}

// Get available chapels from API or use static list
const getAvailableChapels = (apiResponse?: any): Chapel[] => {
  // If we have API response with chapel info, use that
  if (apiResponse?.data?.chapel) {
    const currentChapel = getChapelInfo(apiResponse.data.chapel.chapelId, apiResponse);
    // For now, return the static list but mark current chapel
    return STATIC_CHAPELS.map(chapel => ({
      ...chapel,
      isCurrent: chapel.id === currentChapel.id
    }));
  }
  
  // Fallback to static chapels
  return STATIC_CHAPELS;
}

// Transform API response to our internal format
const transformNiches = (apiResponse: NicheResponse): Niche[] => {
  const niches: Niche[] = []
  
  apiResponse.data.walls.forEach(wall => {
    wall.rows.forEach(row => {
      row.niches.forEach(apiNiche => {
        niches.push({
          id: apiNiche.nicheId,
          code: apiNiche.code,
          status: mapNicheStatus(apiNiche),
          price: apiNiche.defaultAmount,
          apiData: apiNiche
        })
      })
    })
  })
  
  return niches
}
export function NichiWalle() {
  const [selectedChapelId, setSelectedChapelId] = useState<number>(3) // Default to St Colette based on API example
  const [niches, setNiches] = useState<Niche[]>([])
  const [selectedNicheIds, setSelectedNicheIds] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchCode, setSearchCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const itemsPerPage = 48 // 8x6 compact grid

  // Fetch niches from API
  useEffect(() => {
    const fetchNiches = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        console.log(`Fetching niches for chapel ${selectedChapelId}`);
        const apiResponse = await nicheService.getNichesByChapel(selectedChapelId, 1);
        
        // Store response for statistics access
        (window as any).lastApiResponse = apiResponse;
        
        const transformedNiches = transformNiches(apiResponse)
        setNiches(transformedNiches)
        setSelectedNicheIds([])
        setCurrentPage(1)
        
        console.log(`Successfully loaded ${transformedNiches.length} niches`);
      } catch (err: any) {
        console.error('Error fetching niches:', err)
        setError(err.message || 'Failed to load niches')
        // Fallback to empty array
        setNiches([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchNiches()
  }, [selectedChapelId])
  const filteredNiches = useMemo(() => {
    if (!searchCode) return niches
    return niches.filter((n) => n.code.includes(searchCode))
  }, [niches, searchCode])
  const totalPages = Math.ceil(filteredNiches.length / itemsPerPage)
  const currentNiches = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredNiches.slice(start, start + itemsPerPage)
  }, [filteredNiches, currentPage])
  const stats = useMemo(
    () => ({
      total: niches.length,
      available: niches.filter((n) => n.status === 'Available').length,
      booked: niches.filter((n) => n.status === 'Booked').length,
      occupied: niches.filter((n) => n.status === 'Occupied').length,
    }),
    [niches],
  )

interface ChapelStats {
  total: number;
  available: number;
  booked: number;
  occupied: number;
  occupancyRate?: string;
  availabilityRate?: string;
}

// Get chapel statistics from API if available
  const chapelStats: ChapelStats = useMemo(() => {
    const baseStats = {
      total: stats.total,
      available: stats.available,
      booked: stats.booked,
      occupied: stats.occupied
    };
    
    // Extract statistics from API response if available
    if (niches.length > 0 && niches[0].apiData && niches[0].apiData.nicheRowId) {
      // Try to get statistics from the first niche's parent structure
      // In a real implementation, this would come from the API response statistics object
      const apiStats = (window as any).lastApiResponse?.data?.summary;
      if (apiStats) {
        return {
          ...baseStats,
          occupancyRate: apiStats.occupancyRate,
          availabilityRate: apiStats.availabilityRate
        };
      }
    }
    
    // Fallback to calculated rates
    const occupancyRate = stats.total > 0 ? 
      `${((stats.booked + stats.occupied) / stats.total * 100).toFixed(2)}%` : '0.00%';
    const availabilityRate = stats.total > 0 ? 
      `${(stats.available / stats.total * 100).toFixed(2)}%` : '0.00%';
      
    return {
      ...baseStats,
      occupancyRate,
      availabilityRate
    };
  }, [niches, stats])
  const handleNicheClick = (niche: Niche) => {
    if (niche.status !== 'Available') return
    setSelectedNicheIds((prev) =>
      prev.includes(niche.id)
        ? prev.filter((id) => id !== niche.id)
        : [...prev, niche.id],
    )
  }
  const getStatusClasses = (status: 'Available' | 'Booked' | 'Occupied', isSelected: boolean) => {
    if (isSelected)
      return 'bg-amber-700 border-amber-800 text-white ring-1 ring-amber-500'
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
      case 'Booked':
        return 'bg-amber-50 border-amber-300 text-amber-700'
      case 'Occupied':
        return 'bg-red-50 border-red-300 text-red-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-400'
    }
  }
  const selectedChapel = getChapelInfo(selectedChapelId, (window as any).lastApiResponse)
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Compact Header Row */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 text-amber-700" />
          <span className="font-semibold text-gray-800 text-sm">
            Niche Selection - {selectedChapel.name}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {selectedChapel.code}
          </span>
        </div>

        <div className="h-4 w-px bg-gray-200" />

        {/* Chapel Select */}
        <div className="flex items-center gap-2">
          <select
            value={selectedChapelId}
            onChange={(e) => setSelectedChapelId(Number(e.target.value))}
            disabled={isLoading}
            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Select chapel to view niches. Currently showing: ${selectedChapel.name}`}
          >
            {getAvailableChapels((window as any).lastApiResponse).map((chapel) => (
              <option key={chapel.id} value={chapel.id}>
                {chapel.name}{chapel.isCurrent ? ' ★' : ''}
              </option>
            ))}
          </select>
          {isLoading && (
            <div className="flex items-center">
              <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Search code..."
            className="text-xs border border-gray-200 rounded pl-6 pr-2 py-1.5 w-28 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="h-4 w-px bg-gray-200" />

        {/* Chapel Info */}
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
          <span className="font-medium">{selectedChapel.name}</span>
          <span className="text-gray-500">•</span>
          <span>Code: {selectedChapel.code}</span>
        </div>

        <div className="h-4 w-px bg-gray-200" />

        {/* Inline Stats */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            <span className="font-medium text-emerald-600">
              {chapelStats.available}
            </span>{' '}
            free
          </span>
          <span className="text-gray-500">
            <span className="font-medium text-amber-600">{chapelStats.booked}</span>{' '}
            booked
          </span>
          <span className="text-gray-500">
            <span className="font-medium text-red-600">{chapelStats.occupied}</span>{' '}
            occupied
          </span>
          {'occupancyRate' in chapelStats && chapelStats.occupancyRate && (
            <span className="text-gray-500">
              <span className="font-medium text-blue-600">{chapelStats.occupancyRate}</span>{' '}
              occupancy
            </span>
          )}
        </div>

        {/* Selection Badge */}
        {selectedNicheIds.length > 0 && (
          <>
            <div className="h-4 w-px bg-gray-200" />
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {selectedNicheIds.length} selected
              <button
                onClick={() => setSelectedNicheIds([])}
                className="ml-1 hover:text-amber-900"
              >
                ×
              </button>
            </span>
          </>
        )}

        {/* Pagination - pushed to right */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-500 px-2">
            {currentPage}/{totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Grid */}
      <div className="p-3">
        {/* Mini Legend */}
        <div className="flex items-center gap-4 mb-2 text-[10px] text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-50 border border-emerald-300" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-300" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-300" />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-700 border border-amber-800" />
            <span>Selected</span>
          </div>
        </div>

        {/* Grid */}
        <div className="relative min-h-[180px] bg-gray-50/50 rounded border border-gray-100 p-2">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-xs text-red-500">
              Error: {error}
              <button 
                onClick={() => window.location.reload()} 
                className="ml-2 text-amber-600 hover:text-amber-800 underline"
              >
                Retry
              </button>
            </div>
          ) : currentNiches.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              No niches found
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {currentNiches.map((niche) => {
                const isSelected = selectedNicheIds.includes(niche.id)
                return (
                  <button
                    key={niche.id}
                    onClick={() => handleNicheClick(niche)}
                    disabled={niche.status !== 'Available'}
                    className={`
                      h-7 flex items-center justify-center rounded text-[11px] font-semibold border transition-all
                      ${getStatusClasses(niche.status, isSelected)}
                      ${niche.status !== 'Available' ? 'cursor-not-allowed' : ''}
                    `}
                    title={`${niche.code} - ${niche.status} - ₱${niche.price.toLocaleString()}`}
                  >
                    {niche.code}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
