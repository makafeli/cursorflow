/**
 * Memory Bank Notification Manager Tests
 */

const MemoryBankNotificationManager = require('../../../src/memory-bank/notification-manager');

describe('Memory Bank Notification Manager', () => {
  let notificationManager;
  
  beforeEach(() => {
    notificationManager = new MemoryBankNotificationManager();
  });
  
  describe('Initialization', () => {
    it('should initialize with empty subscriptions', () => {
      expect(notificationManager.subscriptions).toBeInstanceOf(Map);
      expect(notificationManager.subscriptions.size).toBe(0);
    });
    
    it('should define event types', () => {
      expect(notificationManager.EVENT_TYPES).toBeInstanceOf(Object);
      expect(Object.keys(notificationManager.EVENT_TYPES).length).toBeGreaterThan(0);
      
      // Check for required event types
      expect(notificationManager.EVENT_TYPES.COMPONENT_CREATED).toBe('component-created');
      expect(notificationManager.EVENT_TYPES.COMPONENT_UPDATED).toBe('component-updated');
      expect(notificationManager.EVENT_TYPES.COMPONENT_HISTORY_ADDED).toBe('component-history-added');
      expect(notificationManager.EVENT_TYPES.CACHE_CLEARED).toBe('cache-cleared');
    });
  });
  
  describe('Subscription Management', () => {
    it('should subscribe to events', () => {
      const connectionId = 'test-connection';
      const eventTypes = [
        notificationManager.EVENT_TYPES.COMPONENT_UPDATED,
        notificationManager.EVENT_TYPES.COMPONENT_CREATED
      ];
      const callback = () => {};
      
      const subscriptionId = notificationManager.subscribe(connectionId, eventTypes, callback);
      
      expect(typeof subscriptionId).toBe('string');
      expect(notificationManager.subscriptions.size).toBe(1);
      expect(notificationManager.subscriptions.has(subscriptionId)).toBe(true);
      
      const subscription = notificationManager.subscriptions.get(subscriptionId);
      expect(subscription.connectionId).toBe(connectionId);
      expect(subscription.eventTypes).toEqual(eventTypes);
      expect(subscription.callback).toBe(callback);
    });
    
    it('should subscribe to all events if eventTypes is null', () => {
      const connectionId = 'test-connection';
      const callback = () => {};
      
      const subscriptionId = notificationManager.subscribe(connectionId, null, callback);
      
      const subscription = notificationManager.subscriptions.get(subscriptionId);
      expect(subscription.eventTypes).toEqual(Object.values(notificationManager.EVENT_TYPES));
    });
    
    it('should unsubscribe from events', () => {
      const connectionId = 'test-connection';
      const callback = () => {};
      
      const subscriptionId = notificationManager.subscribe(connectionId, null, callback);
      
      expect(notificationManager.subscriptions.size).toBe(1);
      
      const result = notificationManager.unsubscribe(subscriptionId);
      
      expect(result).toBe(true);
      expect(notificationManager.subscriptions.size).toBe(0);
    });
    
    it('should return false when unsubscribing from a non-existent subscription', () => {
      const result = notificationManager.unsubscribe('non-existent');
      
      expect(result).toBe(false);
    });
    
    it('should unsubscribe all subscriptions for a connection', () => {
      const connectionId = 'test-connection';
      const callback = () => {};
      
      // Create a subscription for this connection
      notificationManager.subscribe(connectionId, null, callback);
      
      expect(notificationManager.subscriptions.size).toBe(1);
      
      const count = notificationManager.unsubscribeAll(connectionId);
      
      expect(count).toBe(1);
      expect(notificationManager.subscriptions.size).toBe(0);
    });
    
    it('should return 0 when unsubscribing all for a non-existent connection', () => {
      const count = notificationManager.unsubscribeAll('non-existent');
      
      expect(count).toBe(0);
    });
  });
  
  describe('Notification', () => {
    it('should emit events when notifying about component updates', (done) => {
      const componentName = 'test-component';
      const content = 'Test content';
      
      // Listen for the event
      notificationManager.on(notificationManager.EVENT_TYPES.COMPONENT_UPDATED, (data) => {
        expect(data.componentName).toBe(componentName);
        expect(data.contentPreview).toBe(content);
        expect(data.timestamp).toBeDefined();
        done();
      });
      
      // Notify about the event
      notificationManager.notifyComponentUpdated(componentName, content);
    });
    
    it('should emit events when notifying about component creation', (done) => {
      const componentName = 'test-component';
      const content = 'Test content';
      
      // Listen for the event
      notificationManager.on(notificationManager.EVENT_TYPES.COMPONENT_CREATED, (data) => {
        expect(data.componentName).toBe(componentName);
        expect(data.contentPreview).toBe(content);
        expect(data.timestamp).toBeDefined();
        done();
      });
      
      // Notify about the event
      notificationManager.notifyComponentCreated(componentName, content);
    });
    
    it('should emit events when notifying about history additions', (done) => {
      const componentName = 'test-component';
      const versionId = 'test-version';
      
      // Listen for the event
      notificationManager.on(notificationManager.EVENT_TYPES.COMPONENT_HISTORY_ADDED, (data) => {
        expect(data.componentName).toBe(componentName);
        expect(data.versionId).toBe(versionId);
        expect(data.timestamp).toBeDefined();
        done();
      });
      
      // Notify about the event
      notificationManager.notifyComponentHistoryAdded(componentName, versionId);
    });
    
    it('should emit events when notifying about cache cleared', (done) => {
      // Listen for the event
      notificationManager.on(notificationManager.EVENT_TYPES.CACHE_CLEARED, (data) => {
        expect(data.timestamp).toBeDefined();
        done();
      });
      
      // Notify about the event
      notificationManager.notifyCacheCleared();
    });
    
    it('should invoke callbacks for subscribed events', (done) => {
      const connectionId = 'test-connection';
      const componentName = 'test-component';
      const content = 'Test content';
      
      // Subscribe to the event
      notificationManager.subscribe(connectionId, [notificationManager.EVENT_TYPES.COMPONENT_UPDATED], (eventType, data) => {
        expect(eventType).toBe(notificationManager.EVENT_TYPES.COMPONENT_UPDATED);
        expect(data.componentName).toBe(componentName);
        expect(data.contentPreview).toBe(content);
        done();
      });
      
      // Notify about the event
      notificationManager.notifyComponentUpdated(componentName, content);
    });
  });
}); 