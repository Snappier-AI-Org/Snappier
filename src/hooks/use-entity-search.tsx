import { useState, useEffect, useCallback, useRef } from "react";
import { PAGINATION } from "@/config/constants";

interface UseEntitySearchProps<T extends {
  search: string;
  page: number
}> {
  params: T;
  setParams: (params: T) => void;
  debounceMs?: number;
}

export function useEntitySearch<T extends {
  search: string;
  page: number;
}>({
  params,
  setParams,
  debounceMs = 300 // Reduced from 500ms for faster response
}: UseEntitySearchProps<T>) {
const [localSearch, setLocalSearch] = useState(params.search);
const [isSearching, setIsSearching] = useState(false);
const timerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }

    if (localSearch === params.search) {
        setIsSearching(false);
        return;
    }

    setIsSearching(true);
    
    timerRef.current = setTimeout(() => {
        setParams({
            ...params,
            search: localSearch,
            page: PAGINATION.DEFAULT_PAGE,
        });
        setIsSearching(false);
    }, debounceMs);

    return () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };
}, [localSearch, params, setParams, debounceMs]);

    useEffect(() => {
        if (params.search !== localSearch) {
            setLocalSearch(params.search);
            setIsSearching(false);
        }
    }, [params.search]);

    const onSearchChange = useCallback((value: string) => {
        setLocalSearch(value);
    }, []);

    return {
        searchValue: localSearch,
        onSearchChange,
        isSearching,
    };
};