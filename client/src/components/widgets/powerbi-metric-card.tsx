import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  Activity,
  Users,
  FileText,
  DollarSign,
  Target,
  Shield,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { DynamicWidgetRenderer } from './dynamic-widget-renderer';

// Modern color schemes inspired by PowerBI
const colorSchemes = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    lightBg: 'bg-blue-50',
    text: 'text-white',
    lightText: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-100'
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500 to-green-600',
    lightBg: 'bg-emerald-50',
    text: 'text-white',
    lightText: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'text-emerald-100'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
    lightBg: 'bg-purple-50',
    text: 'text-white',
    lightText: 'text-purple-700',
    border: 'border-purple-200',
    icon: 'text-purple-100'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-red-600',
    lightBg: 'bg-orange-50',
    text: 'text-white',
    lightText: 'text-orange-700',
    border: 'border-orange-200',
    icon: 'text-orange-100'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-rose-600',
    lightBg: 'bg-red-50',
    text: 'text-white',
    lightText: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-100'
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    lightBg: 'bg-teal-50',
    text: 'text-white',
    lightText: 'text-teal-700',
    border: 'border-teal-200',
    icon: 'text-teal-100'
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    lightBg: 'bg-indigo-50',
    text: 'text-white',
    lightText: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: 'text-indigo-100'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-500 to-amber-600',
    lightBg: 'bg-yellow-50',
    text: 'text-white',
    lightText: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: 'text-yellow-100'
  }
};

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Users,
  FileText,
  DollarSign,
  Target,
  Shield,
  Calendar,
  AlertCircle,
  Activity,
  TrendingUp
};

// Rate limiting helper
class RateLimiter {
  private lastRequest: Map<string, number> = new Map();
  private readonly minInterval: number = 60000; // 1 minute

  canRequest(key: string): boolean {
    const now = Date.now();
    const lastTime = this.lastRequest.get(key) || 0;
    return now - lastTime >= this.minInterval;
  }

  recordRequest(key: string): void {
    this.lastRequest.set(key, Date.now());
  }

  getTimeUntilNextRequest(key: string): number {
    const lastTime = this.lastRequest.get(key) || 0;
    const timePassed = Date.now() - lastTime;
    return Math.max(0, this.minInterval - timePassed);
  }
}

const rateLimiter = new RateLimiter();

interface PowerBIMetricCardProps {
  widget: any;
  title: string;
  colorScheme?: keyof typeof colorSchemes;
  icon?: string;
  [key: string]: any; // For passing through to DynamicWidgetRenderer
}

export const PowerBIMetricCard: React.FC<PowerBIMetricCardProps> = ({
  widget,
  title,
  colorScheme = 'blue',
  icon = 'Activity',
  ...otherProps
}) => {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [, forceUpdate] = useState({});

  const scheme = colorSchemes[colorScheme];
  const Icon = iconMap[icon] || Activity;

  // Update timer for rate limit display
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const handleRefresh = useCallback(() => {
    if (!rateLimiter.canRequest(widget.id)) {
      const nextRequest = rateLimiter.getTimeUntilNextRequest(widget.id);
      toast({
        title: `Rate limited`,
        description: `Please wait ${formatTimeRemaining(nextRequest)} before refreshing.`,
        variant: 'destructive'
      });
      return;
    }

    rateLimiter.recordRequest(widget.id);
    setRefreshTrigger(prev => prev + 1);
    
    toast({
      title: "Refreshing",
      description: "Widget data is being updated...",
    });
  }, [widget.id, toast]);

  const canRefresh = rateLimiter.canRequest(widget.id);
  const timeUntilRefresh = rateLimiter.getTimeUntilNextRequest(widget.id);

  // Simplified DynamicWidgetRenderer that wraps the original one
  const PowerBIDynamicWidget = React.memo(() => {
    const widgetRef = useRef<HTMLDivElement>(null);
    
    // Monitor for data changes in the DOM
    useEffect(() => {
      if (!widgetRef.current) return;
      
      const observer = new MutationObserver(() => {
        const metricElement = widgetRef.current?.querySelector('.text-4xl, .text-3xl, .text-2xl');
        if (metricElement) {
          const textContent = metricElement.textContent || '';
          const value = parseFloat(textContent.replace(/[^0-9.-]/g, '')) || 0;
          
          if (value !== data?.value) {
            setData({ value, label: title });
            setLoading(false);
            setError(null);
          }
        }
      });
      
      observer.observe(widgetRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      return () => observer.disconnect();
    }, []);
    
    return (
      <div ref={widgetRef} className="hidden">
        <DynamicWidgetRenderer
          widget={{
            ...widget,
            displayType: 'metric',
            refreshInterval: 0 // Disable auto-refresh
          }}
          {...otherProps}
          onLoadingStateChange={(state, errorMessage) => {
            if (state === 'loading') {
              setLoading(true);
            } else if (state === 'error') {
              setError(errorMessage ? new Error(errorMessage) : null);
              setLoading(false);
            }
          }}
          onRefresh={() => {
            // This is called when we want to refresh
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      </div>
    );
  });

  return (
    <Card className="powerbi-card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className={`${scheme.bg} p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="powerbi-icon-container">
              <Icon className={`h-5 w-5 ${scheme.text}`} />
            </div>
            <h3 className={`font-semibold ${scheme.text}`}>{title}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/20">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide' : 'Show'} Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleRefresh} 
                disabled={!canRefresh}
                className={!canRefresh ? 'opacity-50' : ''}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh {!canRefresh && `(${formatTimeRemaining(timeUntilRefresh)})`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className={`p-6 bg-white flex-1 powerbi-content ${showDetails ? 'overflow-y-auto' : ''}`}>
        {loading && !data ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
            <p className="text-sm text-red-600">Failed to load data</p>
            <p className="text-xs text-gray-500 mt-1">{error.message}</p>
          </div>
        ) : (
          <>
            {/* Render the PowerBI-wrapped widget */}
            <PowerBIDynamicWidget />
            
            {/* Display the data */}
            {data && (
              <>
                <div className="flex items-end justify-between mb-2">
                  <div className="text-3xl font-bold text-gray-900 powerbi-metric-value">
                    {data.value.toLocaleString()}
                  </div>
                </div>
                <p className="text-sm text-gray-500">{data.label || title}</p>
                
                {showDetails && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Last Update:</div>
                        <div className="text-gray-900">{new Date().toLocaleTimeString()}</div>
                      </div>
                      
                      {widget.description && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Description</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">{widget.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

// Add PowerBI styles
const style = document.createElement('style');
style.textContent = `
  .powerbi-card {
    transition: all 0.3s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .powerbi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .powerbi-icon-container {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem;
    border-radius: 0.5rem;
    backdrop-filter: blur(10px);
  }
  
  .powerbi-metric-value {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    letter-spacing: -0.02em;
  }
  
  .powerbi-content {
    min-height: 120px;
  }
`;
document.head.appendChild(style); 