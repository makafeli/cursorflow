/**
 * Memory Bank Notification Manager
 * 
 * This file implements a notification system for real-time updates to Memory Bank components.
 */

const EventEmitter = require('events');

/**
 * Class representing a Memory Bank Notification Manager
 */
class MemoryBankNotificationManager extends EventEmitter {
  /**
   * Create a new Memory Bank Notification Manager
   */
  constructor() {
    super();
    
    // Event types
    this.EVENT_TYPES = {
      COMPONENT_UPDATED: 'component-updated',
      COMPONENT_CREATED: 'component-created',
      COMPONENT_HISTORY_ADDED: 'component-history-added',
      MEMORY_BANK_INITIALIZED: 'memory-bank-initialized',
      CACHE_CLEARED: 'cache-cleared'
    };
    
    // Active subscriptions by connection ID
    this.subscriptions = new Map();
  }
  
  /**
   * Subscribe to Memory Bank events
   * @param {string} connectionId - Connection identifier
   * @param {Array<string>} eventTypes - Event types to subscribe to (or null for all)
   * @param {Function} callback - Callback function to invoke
   * @returns {string} Subscription ID
   */
  subscribe(connectionId, eventTypes, callback) {
    const subscriptionId = `${connectionId}-${Date.now()}`;
    
    // If eventTypes is null, subscribe to all event types
    const events = eventTypes || Object.values(this.EVENT_TYPES);
    
    // Create subscription entry
    const subscription = {
      connectionId,
      eventTypes: events,
      callback
    };
    
    // Store subscription
    this.subscriptions.set(subscriptionId, subscription);
    
    // Listen for each event type
    for (const eventType of events) {
      this.on(eventType, (data) => {
        if (this.subscriptions.has(subscriptionId)) {
          callback(eventType, data);
        }
      });
    }
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from Memory Bank events
   * @param {string} subscriptionId - Subscription identifier
   * @returns {boolean} True if unsubscription successful
   */
  unsubscribe(subscriptionId) {
    if (this.subscriptions.has(subscriptionId)) {
      const subscription = this.subscriptions.get(subscriptionId);
      
      // Remove subscription
      this.subscriptions.delete(subscriptionId);
      
      // Remove event listeners (will be automatically cleared when no listeners remain)
      return true;
    }
    
    return false;
  }
  
  /**
   * Unsubscribe all subscriptions for a connection
   * @param {string} connectionId - Connection identifier
   * @returns {number} Number of subscriptions removed
   */
  unsubscribeAll(connectionId) {
    let count = 0;
    
    // Find all subscriptions for this connection
    for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
      if (subscription.connectionId === connectionId) {
        this.unsubscribe(subscriptionId);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Notify about component update
   * @param {string} componentName - Component name
   * @param {string} content - New component content
   */
  notifyComponentUpdated(componentName, content) {
    this.emit(this.EVENT_TYPES.COMPONENT_UPDATED, {
      componentName,
      timestamp: new Date().toISOString(),
      contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
    });
  }
  
  /**
   * Notify about component creation
   * @param {string} componentName - Component name
   * @param {string} content - New component content
   */
  notifyComponentCreated(componentName, content) {
    this.emit(this.EVENT_TYPES.COMPONENT_CREATED, {
      componentName,
      timestamp: new Date().toISOString(),
      contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
    });
  }
  
  /**
   * Notify about component history addition
   * @param {string} componentName - Component name
   * @param {string} versionId - Version identifier
   */
  notifyComponentHistoryAdded(componentName, versionId) {
    this.emit(this.EVENT_TYPES.COMPONENT_HISTORY_ADDED, {
      componentName,
      versionId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Notify about Memory Bank initialization
   */
  notifyMemoryBankInitialized() {
    this.emit(this.EVENT_TYPES.MEMORY_BANK_INITIALIZED, {
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Notify about cache cleared
   */
  notifyCacheCleared() {
    this.emit(this.EVENT_TYPES.CACHE_CLEARED, {
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = MemoryBankNotificationManager; 