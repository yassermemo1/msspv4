import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UsePaginatedDataOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
  initialFilters?: Record<string, any>;
  autoFetch?: boolean;
}

export function usePaginatedData<T>(
  fetchFunction: (params: PaginationParams) => Promise<PaginatedResponse<T>>,
  options: UsePaginatedDataOptions = {}
) {
  const {
    initialPage = 1,
    initialPageSize = 100,
    initialSortBy,
    initialSortOrder = 'desc',
    initialFilters = {},
    autoFetch = true
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string | undefined>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);
  
  // Filtering state
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  
  const { toast } = useToast();

  // Fetch data function
  const fetchData = useCallback(async (params?: Partial<PaginationParams>) => {
    setLoading(true);
    setError(null);
    
    try {
      const requestParams: PaginationParams = {
        page: params?.page ?? currentPage,
        limit: params?.limit ?? pageSize,
        sortBy: params?.sortBy ?? sortBy,
        sortOrder: params?.sortOrder ?? sortOrder,
        filters: params?.filters ?? filters
      };

      const response = await fetchFunction(requestParams);
      
      setData(response.data);
      setTotalRecords(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
      
      // Update pagination state if different from request
      if (params?.page !== undefined) setCurrentPage(params.page);
      if (params?.limit !== undefined) setPageSize(params.limit);
      if (params?.sortBy !== undefined) setSortBy(params.sortBy);
      if (params?.sortOrder !== undefined) setSortOrder(params.sortOrder);
      if (params?.filters !== undefined) setFilters(params.filters);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortBy, sortOrder, filters, fetchFunction, toast]);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  // Page change handler
  const handlePageChange = useCallback((page: number) => {
    fetchData({ page });
  }, [fetchData]);

  // Page size change handler
  const handlePageSizeChange = useCallback((limit: number) => {
    fetchData({ page: 1, limit }); // Reset to first page when changing page size
  }, [fetchData]);

  // Sort handler
  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    fetchData({ page: 1, sortBy: column, sortOrder: direction }); // Reset to first page when sorting
  }, [fetchData]);

  // Filter handler
  const handleFilter = useCallback((newFilters: Record<string, any>) => {
    fetchData({ page: 1, filters: newFilters }); // Reset to first page when filtering
  }, [fetchData]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Reset to initial state
  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
    setSortBy(initialSortBy);
    setSortOrder(initialSortOrder);
    setFilters(initialFilters);
    fetchData({
      page: initialPage,
      limit: initialPageSize,
      sortBy: initialSortBy,
      sortOrder: initialSortOrder,
      filters: initialFilters
    });
  }, [initialPage, initialPageSize, initialSortBy, initialSortOrder, initialFilters, fetchData]);

  return {
    // Data
    data,
    loading,
    error,
    
    // Pagination
    currentPage,
    pageSize,
    totalRecords,
    totalPages,
    
    // Sorting
    sortBy,
    sortOrder,
    
    // Filtering
    filters,
    
    // Actions
    fetchData,
    refresh,
    reset,
    handlePageChange,
    handlePageSizeChange,
    handleSort,
    handleFilter,
    
    // Computed values
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    startRecord: (currentPage - 1) * pageSize + 1,
    endRecord: Math.min(currentPage * pageSize, totalRecords)
  };
} 