import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, AlertCircle, BarChart3, ExternalLink } from 'lucide-react';

interface JiraProjectCount {
  project: string;
  count: number;
  description: string;
  color: string;
}

const JiraProjectCountsWidget: React.FC<{ className?: string }> = ({ className }) => {
  console.log('🎯 JiraProjectCountsWidget rendering...');
  
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['jira-project-counts'],
    queryFn: async () => {
      console.log('🔍 Fetching Jira project counts...');
      const response = await fetch('/api/jira-counts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('❌ API request failed:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API response received:', data);
      
      if (data.success && data.data) {
        const projects = data.data.map((project: JiraProjectCount) => ({
          project: project.project,
          count: project.count,
          description: project.description,
          color: project.project === 'DEP' ? 'bg-blue-500' : 'bg-green-500'
        }));
        console.log('🎨 Formatted projects:', projects);
        return projects;
      } else {
        console.error('❌ Invalid API response format:', data);
        throw new Error(data.message || 'Failed to fetch data');
      }
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  const projectCounts = response || [];
  const totalCount = projectCounts.reduce((sum: number, project: JiraProjectCount) => sum + project.count, 0);
  
  console.log('📊 Widget state:', { projectCounts, totalCount, isLoading, error });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-semibold">Jira Project Issues</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700"
          >
            <Activity className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Total Issues:</span>
          <Badge variant="outline" className="font-mono">
            {totalCount.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
            <p className="text-sm text-red-600 mb-3">Failed to load Jira data</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Activity className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Success State */}
        {projectCounts && !isLoading && !error && (
          <div className="space-y-3">
            {projectCounts.map((project) => (
              <div
                key={project.project}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${project.color}`}></div>
                  <div>
                    <div className="font-medium text-gray-900">{project.project}</div>
                    <div className="text-xs text-gray-500">{project.description}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="font-mono">
                    {project.count.toLocaleString()}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      window.open(`https://sd.sic.sitco.sa/browse/${project.project}`, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-gray-400 hover:text-gray-600 p-1"
              onClick={() => {
                window.open('https://sd.sic.sitco.sa', '_blank');
              }}
            >
              View Jira <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JiraProjectCountsWidget; 