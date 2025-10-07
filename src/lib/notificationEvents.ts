// src/lib/notificationEvents.ts
type NotificationUpdateCallback = () => void;

class NotificationEventEmitter {
  private listeners: NotificationUpdateCallback[] = [];

  // Register a callback to be called when notifications are updated
  onNotificationUpdate(callback: NotificationUpdateCallback): () => void {
    this.listeners.push(callback);
    // Return an unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Trigger notification refresh for all listeners
  triggerNotificationUpdate() {
    console.log('📢 Triggering notification update for', this.listeners.length, 'listeners');
    this.listeners.forEach(callback => callback());
  }
}

// Export singleton instance
export const notificationEvents = new NotificationEventEmitter();