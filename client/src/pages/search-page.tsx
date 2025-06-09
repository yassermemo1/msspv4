import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AdvancedSearch } from '@/components/ui/advanced-search';
import { 
  Search, 
  TrendingUp, 
  Clock, 
  Bookmark, 
  Users, 
  Zap,
  BarChart3,
  Activity,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

interface SearchResult {
  id: number;
  entityType: string;
  entityId: number;
  title: string;
  subtitle: string;
  description: string;
  relevanceScore: number;
  metadata: Record<string, any>;
}

export function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeSearchType, setActiveSearchType] = useState<string>('global');

  // Fetch search analytics
  const { data: searchAnalytics } = useQuery({
    queryKey: ['/api/search/analytics'],
    queryFn: async () => {
      // Mock analytics data since we haven't implemented this endpoint yet
      return {
        totalSearches: 1247,
        popularQueries: [
          { query: 'active clients', count: 89 },
          { query: 'contract renewals', count: 67 },
          { query: 'security services', count: 45 },
          { query: 'financial reports', count: 38 },
        ],
        searchTrends: [
          { date: '2024-05-23', searches: 45 },
          { date: '2024-05-24', searches: 52 },
          { date: '2024-05-25', searches: 61 },
          { date: '2024-05-26', searches: 48 },
          { date: '2024-05-27', searches: 55 },
          { date: '2024-05-28', searches: 67 },
          { date: '2024-05-29', searches: 73 },
        ],
        entityDistribution: [
          { entityType: 'clients', count: 423, percentage: 34 },
          { entityType: 'contracts', count: 312, percentage: 25 },
          { entityType: 'services', count: 267, percentage: 21 },
          { entityType: 'financial', count: 145, percentage: 12 },
          { entityType: 'users', count: 100, percentage: 8 },
        ]
      };
    },
  });

  // Fetch recent searches
  const { data: recentSearches = [] } = useQuery({
    queryKey: ['/api/search/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/search/history?limit=10');
      return res.json();
    },
  });

  // Fetch saved searches
  const { data: savedSearches = [] } = useQuery({
    queryKey: ['/api/search/saved'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/search/saved');
      return res.json();
    },
  });

  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results);
  };

  const getEntityTypeColor = (entityType: string) => {
    const colors: Record<string, string> = {
      clients: 'bg-blue-500',
      contracts: 'bg-green-500',
      services: 'bg-purple-500',
      financial: 'bg-yellow-500',
      users: 'bg-indigo-500',
    };
    return colors[entityType] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Search</h1>
          <p className="text-muted-foreground">
            Search across all your MSSP data with powerful filters and saved queries
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="h-4 w-4 mr-1" />
            {searchAnalytics?.totalSearches || 0} searches performed
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Search Area */}
        <div className="lg:col-span-3">
          <AdvancedSearch
            onSearchResults={handleSearchResults}
            showQuickAccess={true}
            className="w-full"
          />

          {/* Search Results Summary */}
          {searchResults.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Search Results ({searchResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.slice(0, 6).map((result) => (
                    <Card key={`${result.entityType}-${result.entityId}`} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getEntityTypeColor(result.entityType)}`}>
                          <Target className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{result.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                          <p className="text-xs text-muted-foreground mt-1">{result.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {result.entityType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(result.relevanceScore * 100)}% match
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                
                {searchResults.length > 6 && (
                  <div className="text-center mt-4">
                    <Button variant="outline">
                      View All {searchResults.length} Results
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Search Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Search Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {searchAnalytics?.totalSearches || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Searches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {savedSearches.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Saved Searches</div>
                </div>
              </div>

              {/* Entity Distribution */}
              {searchAnalytics?.entityDistribution && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Search Distribution</h4>
                  <div className="space-y-2">
                    {searchAnalytics.entityDistribution.map((entity) => (
                      <div key={entity.entityType} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${getEntityTypeColor(entity.entityType)}`} />
                          <span className="text-sm capitalize">{entity.entityType}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entity.percentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Popular Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Popular Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {searchAnalytics?.popularQueries?.map((query, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer">
                    <span className="text-sm">{query.query}</span>
                    <Badge variant="outline" className="text-xs">
                      {query.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentSearches.slice(0, 5).map((search: any) => (
                  <div key={search.id} className="p-2 rounded-md hover:bg-accent cursor-pointer">
                    <div className="text-sm font-medium truncate">
                      {search.searchQuery}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(search.createdAt), 'MMM dd, HH:mm')} • {search.resultsCount} results
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Saved Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bookmark className="h-5 w-5 mr-2" />
                Saved Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedSearches.slice(0, 5).map((search: any) => (
                  <div key={search.id} className="p-2 rounded-md hover:bg-accent cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{search.name}</span>
                      {search.isQuickFilter && (
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Quick
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Used {search.useCount} times
                    </div>
                  </div>
                ))}
                
                {savedSearches.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No saved searches yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Search Active Clients
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Target className="h-4 w-4 mr-2" />
                Find Expiring Contracts
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                High Value Transactions
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Recent Activity
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 