/**
 * Memory Bank Notification Manager
 * Handles real-time notifications for Memory Bank updates
 */

const { v4: uuidv4 } = require('uuid');

class MemoryBankNotificationManager {
  /**
   * Event types for Memory Bank notifications
   */
  EVENT_TYPES = {
    COMPONENT_CREATED: 'component.created',
    COMPONENT_UPDATED: 'component.updated',
    COMPONENT_DELETED: 'component.deleted',
    HISTORY_ADDED: 'history.added',
    CACHE_CLEARED: 'cache.cleared',
    IMPORT_COMPLETED: 'import.completed',
    EXPORT_COMPLETED: 'export.completed'
  };
  
  constructor() {
    // Map of subscription id to subscription data
    this.subscriptions = new Map();
    
    // Map of connection id to subscription ids
    this.connectionSubscriptions = new Map();
    
    console.log('Memory Bank Notification Manager initialized');
  }
  
  /**
   * Subscribe to Memory Bank events
   * @param {string} connectionId - Connection identifier
   * @param {Array<string>} eventTypes - Event types to subscribe to (or null for all)
   * @param {Function} callback - Callback function to invoke
   * @returns {string} Subscription ID
   */
  subscribe(connectionId, eventTypes, callback) {
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }
    
    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    // Generate subscription ID
    const subscriptionId = uuidv4();
    
    // Store subscription
    this.subscriptions.set(subscriptionId, {
      connectionId,
      eventTypes: eventTypes || Object.values(this.EVENT_TYPES),
      callback
    });
    
    // Track connection subscriptions
    if (!this.connectionSubscriptions.has(connectionId)) {
      this.connectionSubscriptions.set(connectionId, new Set());
    }
    this.connectionSubscriptions.get(connectionId).add(subscriptionId);
    
    console.log(`Memory Bank: Connection ${connectionId} subscribed to events with ID ${subscriptionId}`);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from Memory Bank events
   * @param {string} subscriptionId - Subscription identifier
   * @returns {boolean} True if unsubscription successful
   */
  unsubscribe(subscriptionId) {
    if (!this.subscriptions.has(subscriptionId)) {
      return false;
    }
    
    const subscription = this.subscriptions.get(subscriptionId);
    const connectionId = subscription.connectionId;
    
    // Remove from subscription map
    this.subscriptions.delete(subscriptionId);
    
    // Remove from connection tracking
    if (this.connectionSubscriptions.has(connectionId)) {
      this.connectionSubscriptions.get(connectionId).delete(subscriptionId);
      
      // Clean up if no more subscriptions for this connection
      if (this.connectionSubscriptions.get(connectionId).size === 0) {
        this.connectionSubscriptions.delete(connectionId);
      }
    }
    
    console.log(`Memory Bank: Unsubscribed from events with ID ${subscriptionId}`);
    
    return true;
  }
  
  /**
   * Unsubscribe all subscriptions for a connection
   * @param {string} connectionId - Connection identifier
   * @returns {number} Number of subscriptions removed
   */
  unsubscribeAll(connectionId) {
    if (!this.connectionSubscriptions.has(connectionId)) {
      return 0;
    }
    
    const subscriptionIds = [...this.connectionSubscriptions.get(connectionId)];
    let count = 0;
    
    // Unsubscribe each subscription
    for (const subscriptionId of subscriptionIds) {
      if (this.unsubscribe(subscriptionId)) {
        count++;
      }
    }
    
    console.log(`Memory Bank: Unsubscribed ${count} subscriptions for connection ${connectionId}`);
    
    return count;
  }
  
  /**
   * Notify subscribers of an event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @private
   */
  _notify(eventType, data) {
    if (!Object.values(this.EVENT_TYPES).includes(eventType)) {
      console.warn(`Memory Bank: Unknown event type "${eventType}"`);
    }
    
    let notifiedCount = 0;
    
    // Notify all subscribers that match the event type
    for (const [, subscription] of this.subscriptions.entries()) {
      if (subscription.eventTypes.includes(eventType)) {
        try {
          subscription.callback({
            type: eventType,
            timestamp: Date.now(),
            data
          });
          notifiedCount++;
        } catch (error) {
          console.error(`Memory Bank: Error notifying subscriber: ${error.message}`);
        }
      }
    }
    
    if (notifiedCount > 0) {
      console.log(`Memory Bank: Notified ${notifiedCount} subscribers of "${eventType}" event`);
    }
  }
  
  /**
   * Notify about component creation
   * @param {Object} component - Created component
   */
  notifyComponentCreated(component) {
    this._notify(this.EVENT_TYPES.COMPONENT_CREATED, {
      componentId: component.id,
      component
    });
  }
  
  /**
   * Notify about component update
   * @param {Object} component - Updated component
   */
  notifyComponentUpdated(component) {
    this._notify(this.EVENT_TYPES.COMPONENT_UPDATED, {
      componentId: component.id,
      component
    });
  }
  
  /**
   * Notify about component deletion
   * @param {string} componentId - Component ID
   */
  notifyComponentDeleted(componentId) {
    this._notify(this.EVENT_TYPES.COMPONENT_DELETED, {
      componentId
    });
  }
  
  /**
   * Notify about history addition
   * @param {string} componentId - Component ID
   * @param {string} versionId - Version ID
   * @param {Object} version - Component version
   */
  notifyHistoryAdded(componentId, versionId, version) {
    this._notify(this.EVENT_TYPES.HISTORY_ADDED, {
      componentId,
      versionId,
      version
    });
  }
  
  /**
   * Notify about cache cleared
   */
  notifyCacheCleared() {
    this._notify(this.EVENT_TYPES.CACHE_CLEARED, {});
  }
  
  /**
   * Notify about import completed
   * @param {number} count - Number of components imported
   */
  notifyImportCompleted(count) {
    this._notify(this.EVENT_TYPES.IMPORT_COMPLETED, {
      count
    });
  }
  
  /**
   * Notify about export completed
   * @param {number} count - Number of components exported
   * @param {string} format - Export format
   */
  notifyExportCompleted(count, format) {
    this._notify(this.EVENT_TYPES.EXPORT_COMPLETED, {
      count,
      format
    });
  }
}

module.exports = MemoryBankNotificationManager; 