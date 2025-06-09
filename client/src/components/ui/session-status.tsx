import { useState, useEffect } from 'react';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Shield } from 'lucide-react';

export function SessionStatus() {
  const { isEnabled, getTimeRemaining } = useSessionTimeout();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setTimeRemaining(null);
      return;
    }

    const updateTime = () => {
      setTimeRemaining(getTimeRemaining());
    };

    // Update immediately
    updateTime();

    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [isEnabled, getTimeRemaining]);

  if (!isEnabled || timeRemaining === null) {
    return null;
  }

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (ms: number) => {
    const minutes = ms / (1000 * 60);
    if (minutes <= 5) return 'destructive';
    if (minutes <= 30) return 'secondary';
    return 'default';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={getStatusColor(timeRemaining)} 
          className="flex items-center space-x-1 cursor-help"
        >
          <Clock className="h-3 w-3" />
          <span>{formatTimeRemaining(timeRemaining)}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4" />
          <span>Session expires in {formatTimeRemaining(timeRemaining)}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
} 