export interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source?: string;
}

export interface NotificationService {
  showNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
  clearNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  getNotifications: () => SystemNotification[];
}

// Mock implementation for development
class MockNotificationService implements NotificationService {
  private notifications: SystemNotification[] = [];

  showNotification(notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: SystemNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };
    this.notifications.unshift(newNotification);
    
    // Auto-remove after 5 seconds for non-error notifications
    if (notification.type !== 'error') {
      setTimeout(() => {
        this.clearNotification(newNotification.id);
      }, 5000);
    }
  }

  clearNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  }

  getNotifications() {
    return [...this.notifications];
  }
}

// Export singleton instance
export const systemNotifications = new MockNotificationService();

// Helper functions
export const showSuccess = (title: string, message: string) => {
  systemNotifications.showNotification({
    type: 'success',
    title,
    message,
  });
};

export const showError = (title: string, message: string) => {
  systemNotifications.showNotification({
    type: 'error',
    title,
    message,
  });
};

export const showWarning = (title: string, message: string) => {
  systemNotifications.showNotification({
    type: 'warning',
    title,
    message,
  });
};

export const showInfo = (title: string, message: string) => {
  systemNotifications.showNotification({
    type: 'info',
    title,
    message,
  });
}; 