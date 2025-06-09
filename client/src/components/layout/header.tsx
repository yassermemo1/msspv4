import { useState } from "react";
import { Search, Bell, Plus, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

interface VersionData {
  version: string;
  name: string;
  environment: string;
  nodeVersion: string;
  uptime: number;
  timestamp: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch version information
  const { data: versionData } = useQuery<VersionData>({
    queryKey: ['/api/version'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/version');
      return res.json();
    },
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {versionData && (
              <Popover>
                <PopoverTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-gray-50 text-xs"
                  >
                    v{versionData.version}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Application Version</span>
                      <Badge variant="outline">v{versionData.version}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Environment</span>
                      <Badge variant={versionData.environment === 'production' ? 'default' : 'secondary'}>
                        {versionData.environment}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Uptime</span>
                      <span className="text-sm text-muted-foreground">{formatUptime(versionData.uptime)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Node.js</span>
                      <span className="text-sm text-muted-foreground">{versionData.nodeVersion}</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {subtitle && (
            <span className="text-sm text-gray-600">{subtitle}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search clients, contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 pl-10"
            />
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </div>
          
          {/* Quick Actions */}
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>
    </header>
  );
}
