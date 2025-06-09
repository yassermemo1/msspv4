import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Filter, 
  Clock, 
  Star, 
  Building, 
  FileText, 
  Shield, 
  DollarSign, 
  Users,
  Settings,
  Zap,
  ArrowRight,
  Command
} from 'lucide-react';
import { AdvancedSearch } from './advanced-search';
import { useLocation } from 'wouter';

interface QuickSearchResult {
  id: number;
  entityType: string;
  entityId: number;
  title: string;
  subtitle: string;
  description: string;
  relevanceScore: number;
}

interface GlobalSearchHeaderProps {
  className?: string;
}

const ENTITY_ICONS = {
  clients: Building,
  contracts: FileText,
  services: Shield,
  financial_transactions: DollarSign,
  users: Users,
  hardware_assets: Settings,
  service_authorization_forms: FileText,
  certificates_of_compliance: Shield,
};

const ENTITY_COLORS = {
  clients: 'bg-blue-500',
  contracts: 'bg-green-500',
  services: 'bg-purple-500',
  financial_transactions: 'bg-yellow-500',
  users: 'bg-indigo-500',
  hardware_assets: 'bg-gray-500',
  service_authorization_forms: 'bg-orange-500',
  certificates_of_compliance: 'bg-red-500',
};

export function GlobalSearchHeader({ className }: GlobalSearchHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quickResults, setQuickResults] = useState<QuickSearchResult[]>([]);
  const [showQuickResults, setShowQuickResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useLocation();

  // Quick search with debouncing
  const quickSearchMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!query || query.length < 2) return [];
      
      const res = await apiRequest('POST', '/api/search/execute', {
        globalQuery: query,
        entityTypes: ['clients', 'contracts', 'services', 'users'],
        limit: 8
      });
      return res.json();
    },
    onSuccess: (results) => {
      setQuickResults(results);
      setShowQuickResults(true);
    }
  });

  // Fetch recent searches
  const { data: recentSearches = [] } = useQuery({
    queryKey: ['/api/search/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/search/history?limit=5');
      return res.json();
    },
  });

  // Fetch saved quick filters
  const { data: quickFilters = [] } = useQuery({
    queryKey: ['/api/search/saved-quick'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/search/saved');
      const data = await res.json();
      return data.filter((s: any) => s.isQuickFilter);
    },
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        quickSearchMutation.mutate(searchQuery);
      } else {
        setQuickResults([]);
        setShowQuickResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      
      // Escape to close search
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setShowQuickResults(false);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleResultClick = (result: QuickSearchResult) => {
    // Navigate to appropriate page based on entity type
    switch (result.entityType) {
      case 'clients':
        setLocation(`/clients/${result.entityId}`);
        break;
      case 'contracts':
        setLocation(`/contracts/${result.entityId}`);
        break;
      case 'services':
        setLocation(`/services/${result.entityId}`);
        break;
      case 'users':
        setLocation(`/users/${result.entityId}`);
        break;
      default:
        console.log('Navigate to:', result.entityType, result.entityId);
    }
    
    setIsSearchOpen(false);
    setShowQuickResults(false);
    setSearchQuery('');
  };

  const handleRecentSearchClick = (searchConfig: any) => {
    setSearchQuery(searchConfig.globalQuery || '');
    if (searchConfig.globalQuery) {
      quickSearchMutation.mutate(searchConfig.globalQuery);
    }
  };

  return (
    <>
      {/* Quick Search Trigger */}
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="relative flex-1 max-w-md">
          <Input
            ref={searchInputRef}
            placeholder="Search everything... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            className="pl-10 pr-4"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          
          {/* Quick Results Dropdown */}
          {showQuickResults && quickResults.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
              <CardContent className="p-2">
                <ScrollArea className="max-h-96">
                  <div className="space-y-1">
                    {quickResults.map((result) => {
                      const Icon = ENTITY_ICONS[result.entityType as keyof typeof ENTITY_ICONS] || FileText;
                      const color = ENTITY_COLORS[result.entityType as keyof typeof ENTITY_COLORS] || 'bg-gray-500';
                      
                      return (
                        <div
                          key={`${result.entityType}-${result.entityId}`}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className={cn("p-1.5 rounded", color)}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{result.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(result.relevanceScore * 100)}%
                          </div>
                        </div>
                      );
                    })}
                    
                    {searchQuery.length >= 2 && (
                      <>
                        <Separator />
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm"
                          onClick={() => setShowAdvanced(true)}
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Advanced Search for "{searchQuery}"
                          <ArrowRight className="h-4 w-4 ml-auto" />
                        </Button>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(true)}
          className="hidden sm:flex"
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced
        </Button>
      </div>

      {/* Search Overlay for Mobile */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 sm:hidden">
          <div className="container mx-auto p-4">
            <Card className="w-full">
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <Input
                    placeholder="Search everything..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>

                {/* Quick Filters */}
                {quickFilters.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Quick Filters</h4>
                    <div className="flex flex-wrap gap-2">
                      {quickFilters.slice(0, 4).map((filter: any) => (
                        <Badge
                          key={filter.id}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            // Apply quick filter logic here
                            console.log('Apply filter:', filter.name);
                          }}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {filter.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Recent Searches</h4>
                    <div className="space-y-2">
                      {recentSearches.slice(0, 3).map((search: any) => (
                        <div
                          key={search.id}
                          className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                          onClick={() => handleRecentSearchClick(search.searchConfig)}
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{search.searchQuery}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Results */}
                {quickResults.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Results</h4>
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2">
                        {quickResults.map((result) => {
                          const Icon = ENTITY_ICONS[result.entityType as keyof typeof ENTITY_ICONS] || FileText;
                          const color = ENTITY_COLORS[result.entityType as keyof typeof ENTITY_COLORS] || 'bg-gray-500';
                          
                          return (
                            <div
                              key={`${result.entityType}-${result.entityId}`}
                              className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                              onClick={() => handleResultClick(result)}
                            >
                              <div className={cn("p-1.5 rounded", color)}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{result.title}</div>
                                <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvanced(true)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Advanced Search
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Advanced Search Dialog */}
      <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden">
          <AdvancedSearch
            onClose={() => setShowAdvanced(false)}
            initialConfig={{
              globalQuery: searchQuery,
              entityTypes: ['clients', 'contracts', 'services']
            }}
            onSearchResults={(results) => {
              console.log('Advanced search results:', results);
              // Handle advanced search results
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
} 