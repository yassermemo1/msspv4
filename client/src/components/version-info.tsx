import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  Server, 
  Database,
  Globe,
  Loader2
} from "lucide-react";

interface VersionData {
  version: string;
  name: string;
  environment: string;
  nodeVersion: string;
  uptime: number;
  timestamp: string;
}

export function VersionInfo() {
  const { data: versionData, isLoading } = useQuery<VersionData>({
    queryKey: ['/api/version'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/version');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading version information...</span>
      </div>
    );
  }

  if (!versionData) {
    return (
      <div className="text-sm text-muted-foreground">
        Version information unavailable
      </div>
    );
  }

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

  const getEnvironmentBadgeVariant = (env: string) => {
    switch (env) {
      case 'production':
        return 'default';
      case 'development':
        return 'secondary';
      case 'testing':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            Application Version
          </span>
          <Badge variant="outline">v{versionData.version}</Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center">
            <Globe className="h-4 w-4 mr-2 text-blue-500" />
            Environment
          </span>
          <Badge variant={getEnvironmentBadgeVariant(versionData.environment)}>
            {versionData.environment}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center">
            <Server className="h-4 w-4 mr-2 text-purple-500" />
            Node.js Version
          </span>
          <span className="text-sm text-muted-foreground">{versionData.nodeVersion}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2 text-orange-500" />
            Server Uptime
          </span>
          <span className="text-sm text-muted-foreground">{formatUptime(versionData.uptime)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center">
            <Database className="h-4 w-4 mr-2 text-cyan-500" />
            Application Name
          </span>
          <span className="text-sm text-muted-foreground">{versionData.name}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Updated</span>
          <span className="text-xs text-muted-foreground">
            {new Date(versionData.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
} 