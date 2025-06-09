import { useState, useEffect, useCallback } from 'react';

export interface SystemNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive';
  }>;
}

interface SystemNotificationsState {
  notifications: SystemNotification[];
  unreadCount: number;
}

// Global state for system notifications
let globalState: SystemNotificationsState = {
  notifications: [],
  unreadCount: 0
};

// Subscribers for state changes
const subscribers = new Set<(state: SystemNotificationsState) => void>();

// Notify all subscribers of state changes
const notifySubscribers = () => {
  subscribers.forEach(callback => callback(globalState));
};

// Generate unique ID for notifications
const generateId = () => `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Add a new notification
export const addSystemNotification = (notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => {
  const newNotification: SystemNotification = {
    ...notification,
    id: generateId(),
    timestamp: new Date(),
    read: false
  };

  globalState.notifications.unshift(newNotification);
  globalState.unreadCount = globalState.notifications.filter(n => !n.read).length;
  
  notifySubscribers();

  // Auto-remove non-persistent notifications after 5 seconds
  if (!notification.persistent) {
    setTimeout(() => {
      removeSystemNotification(newNotification.id);
    }, 5000);
  }

  return newNotification.id;
};

// Remove a notification
export const removeSystemNotification = (id: string) => {
  globalState.notifications = globalState.notifications.filter(n => n.id !== id);
  globalState.unreadCount = globalState.notifications.filter(n => !n.read).length;
  notifySubscribers();
};

// Mark notification as read
export const markNotificationAsRead = (id: string) => {
  const notification = globalState.notifications.find(n => n.id === id);
  if (notification && !notification.read) {
    notification.read = true;
    globalState.unreadCount = globalState.notifications.filter(n => !n.read).length;
    notifySubscribers();
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = () => {
  globalState.notifications.forEach(n => n.read = true);
  globalState.unreadCount = 0;
  notifySubscribers();
};

// Clear all notifications
export const clearAllNotifications = () => {
  globalState.notifications = [];
  globalState.unreadCount = 0;
  notifySubscribers();
};

// Hook to use system notifications
export const useSystemNotifications = () => {
  const [state, setState] = useState<SystemNotificationsState>(globalState);

  useEffect(() => {
    const callback = (newState: SystemNotificationsState) => {
      setState({ ...newState });
    };

    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);
    };
  }, []);

  const addNotification = useCallback((notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => {
    return addSystemNotification(notification);
  }, []);

  const removeNotification = useCallback((id: string) => {
    removeSystemNotification(id);
  }, []);

  const markAsRead = useCallback((id: string) => {
    markNotificationAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    markAllNotificationsAsRead();
  }, []);

  const clearAll = useCallback(() => {
    clearAllNotifications();
  }, []);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};

// Convenience functions for common notification types
export const notifySuccess = (title: string, message: string, persistent = false) => {
  return addSystemNotification({
    type: 'success',
    title,
    message,
    persistent
  });
};

export const notifyError = (title: string, message: string, persistent = true) => {
  return addSystemNotification({
    type: 'error',
    title,
    message,
    persistent
  });
};

export const notifyWarning = (title: string, message: string, persistent = false) => {
  return addSystemNotification({
    type: 'warning',
    title,
    message,
    persistent
  });
};

export const notifyInfo = (title: string, message: string, persistent = false) => {
  return addSystemNotification({
    type: 'info',
    title,
    message,
    persistent
  });
};

// Integration-specific notifications
export const notifyIntegrationSuccess = (systemName: string, action: string) => {
  return notifySuccess(
    'Integration Success',
    `${action} completed successfully for ${systemName}`,
    false
  );
};

export const notifyIntegrationError = (systemName: string, action: string, error: string) => {
  return notifyError(
    'Integration Error',
    `${action} failed for ${systemName}: ${error}`,
    true
  );
};

export const notifyConnectionTest = (systemName: string, success: boolean, details?: string) => {
  if (success) {
    return notifySuccess(
      'Connection Test',
      `Successfully connected to ${systemName}`,
      false
    );
  } else {
    return notifyError(
      'Connection Test Failed',
      `Failed to connect to ${systemName}${details ? `: ${details}` : ''}`,
      true
    );
  }
};

export const notifyDataSync = (systemName: string, recordCount: number) => {
  return notifyInfo(
    'Data Sync Complete',
    `Synchronized ${recordCount} records from ${systemName}`,
    false
  );
};

export const notifyWidgetUpdate = (widgetName: string, success: boolean) => {
  if (success) {
    return notifySuccess(
      'Widget Updated',
      `${widgetName} has been updated successfully`,
      false
    );
  } else {
    return notifyError(
      'Widget Update Failed',
      `Failed to update ${widgetName}`,
      true
    );
  }
};

export const notifyQueryExecution = (queryName: string, executionTime: number, recordCount?: number) => {
  const message = recordCount !== undefined 
    ? `Query executed in ${executionTime}ms, returned ${recordCount} records`
    : `Query executed in ${executionTime}ms`;
    
  return notifyInfo(
    `Query: ${queryName}`,
    message,
    false
  );
};
