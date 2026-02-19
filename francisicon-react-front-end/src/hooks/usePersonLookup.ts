import { useState, useCallback, useRef } from 'react';
import { personService, PersonData } from '../services/personService';

export function usePersonLookup() {
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<PersonData[]>([]);

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const searchPerson = useCallback(async (query: string) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setIsSearching(true);
        setError(null);

        // Debounce search
        return new Promise<PersonData[]>((resolve) => {
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const result = await personService.searchCustomers(query, 1, 10);
                    const persons = result.data || [];
                    setSearchResults(persons as PersonData[]);
                    resolve(persons as PersonData[]);
                } catch (err: any) {
                    console.error('Error searching person:', err);
                    setError('Failed to search person data');
                    resolve([]);
                } finally {
                    setIsSearching(false);
                }
            }, 500);
        });
    }, []);

    const clearResults = useCallback(() => {
        setSearchResults([]);
        setError(null);
    }, []);

    return {
        searchPerson,
        searchResults,
        isSearching,
        error,
        clearResults
    };
}
