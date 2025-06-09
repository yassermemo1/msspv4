import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useQuery } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface SessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  checkIntervalSeconds?: number;
}

export function useSessionTimeout(options: SessionTimeoutOptions = {}) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const {
    timeoutMinutes = 24 * 60, // 24 hours default
    warningMinutes = 5, // 5 minutes warning
    checkIntervalSeconds = 60 // Check every minute
  } = options;

  const lastActivityRef = useRef<number>(Date.now());
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef<boolean>(false);

  // Get user settings to check if session timeout is enabled
  const { data: settings } = useQuery({
    queryKey: ['/api/user/settings'],
    enabled: !!user,
  });

  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  const checkSession = useCallback(() => {
    if (!settings?.sessionTimeout || !user) {
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningMinutes * 60 * 1000;

    // Check if session should timeout
    if (timeSinceLastActivity >= timeoutMs) {
      toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
      logout();
      return;
    }

    // Check if warning should be shown
    if (timeSinceLastActivity >= (timeoutMs - warningMs) && !warningShownRef.current) {
      const remainingMinutes = Math.ceil((timeoutMs - timeSinceLastActivity) / (60 * 1000));
      
      toast({
        title: "Session Warning",
        description: `Your session will expire in ${remainingMinutes} minutes due to inactivity.`,
        duration: 10000, // Show for 10 seconds
      });
      
      warningShownRef.current = true;
    }
  }, [settings?.sessionTimeout, user, timeoutMinutes, warningMinutes, toast, logout]);

  // Track user activity
  useEffect(() => {
    if (!settings?.sessionTimeout || !user) {
      return;
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle activity updates to avoid excessive updates
    let activityTimeout: NodeJS.Timeout | null = null;
    
    const handleActivity = () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      activityTimeout = setTimeout(() => {
        updateLastActivity();
      }, 1000); // Update at most once per second
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      // Cleanup event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [settings?.sessionTimeout, user, updateLastActivity]);

  // Set up session checking interval
  useEffect(() => {
    if (!settings?.sessionTimeout || !user) {
      if (timeoutIdRef.current) {
        clearInterval(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      return;
    }

    timeoutIdRef.current = setInterval(checkSession, checkIntervalSeconds * 1000);

    return () => {
      if (timeoutIdRef.current) {
        clearInterval(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [settings?.sessionTimeout, user, checkSession, checkIntervalSeconds]);

  // Initialize last activity on mount
  useEffect(() => {
    if (user) {
      updateLastActivity();
    }
  }, [user, updateLastActivity]);

  return {
    isEnabled: settings?.sessionTimeout || false,
    updateActivity: updateLastActivity,
    getTimeRemaining: () => {
      if (!settings?.sessionTimeout || !user) {
        return null;
      }
      
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const remaining = timeoutMs - timeSinceLastActivity;
      
      return Math.max(0, remaining);
    }
  };
} 