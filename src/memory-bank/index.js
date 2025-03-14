/**
 * Memory Bank Manager
 * 
 * This file implements the core functionality for managing the CursorFlow Memory Bank.
 */

// Import dependencies
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const MemoryBankDatabaseAdapter = require('./database-adapter');
const MemoryBankNotificationManager = require('./notification-manager');
const { SQLiteAdapter } = require('./adapters/sqlite');

// Default options

/**
 * Class representing a Memory Bank manager
 */
class MemoryBankManager {
  /**
   * Create a new Memory Bank manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      basePath: options.basePath || './memory-bank',
      historyPath: options.historyPath || null, // Will be set to a default value based on basePath
      maxHistoryVersions: options.maxHistoryVersions || 10, // Maximum number of versions to keep per component
      useDatabase: options.useDatabase || false, // Whether to use database storage
      databasePath: options.databasePath || null, // Will be set to a default value based on basePath
      enableRealTimeUpdates: options.enableRealTimeUpdates !== undefined ? options.enableRealTimeUpdates : true, // Whether to enable real-time updates
      ...options
    };
    
    // Set default history path if not provided
    if (!this.options.historyPath) {
      this.options.historyPath = path.join(this.options.basePath, 'history');
    }
    
    // Set default database path if not provided
    if (!this.options.databasePath) {
      this.options.databasePath = path.join(this.options.basePath, 'memory-bank.db');
    }
    
    // Initialize notification manager
    this.notificationManager = new MemoryBankNotificationManager();
    
    // Component file names
    this.components = {
      activeContext: 'activeContext.md',
      productContext: 'productContext.md',
      decisionLog: 'decisionLog.md',
      progress: 'progress.md',
      systemPatterns: 'systemPatterns.md' // Optional component
    };
    
    // Initialize database adapter if using database
    this.dbAdapter = this.options.useDatabase ? new MemoryBankDatabaseAdapter({
      databasePath: this.options.databasePath
    }) : null;
    
    // Cache for frequently accessed components
    this.cache = {
      enabled: options.enableCache || false,
      data: {},
      stats: {
        hits: 0,
        misses: 0,
        lastCleared: Date.now()
      }
    };
    
    // Ensure directories exist
    this._ensureMemoryBankExists();
    if (!this.options.useDatabase) {
      this._ensureHistoryDirectoryExists();
    }
  }
  
  /**
   * Ensure the Memory Bank directory exists
   * @private
   */
  _ensureMemoryBankExists() {
    try {
      fs.ensureDirSync(this.options.basePath);
      console.log(`Memory Bank directory ensured at: ${this.options.basePath}`);
    } catch (error) {
      console.error('Failed to ensure Memory Bank directory:', error);
      throw error;
    }
  }
  
  /**
   * Ensure the history directory exists
   * @private
   */
  _ensureHistoryDirectoryExists() {
    try {
      fs.ensureDirSync(this.options.historyPath);
      console.log(`Memory Bank history directory ensured at: ${this.options.historyPath}`);
    } catch (error) {
      console.error('Failed to ensure Memory Bank history directory:', error);
      throw error;
    }
  }
  
  /**
   * Check if the Memory Bank is initialized
   * @returns {boolean} True if the Memory Bank is initialized
   */
  async isInitialized() {
    // If using database, check database
    if (this.options.useDatabase) {
      try {
        // Initialize database if not initialized
        if (!this.dbAdapter._initialized) {
          await this.dbAdapter.initialize();
        }
        
        // Check if required components exist
        const requiredComponents = ['activeContext', 'productContext', 'decisionLog', 'progress'];
        for (const component of requiredComponents) {
          const dbComponent = await this.dbAdapter.getComponent(component);
          if (!dbComponent) {
            return false;
          }
        }
        return true;
      } catch (error) {
        console.error('Error checking Memory Bank initialization in database:', error);
        return false;
      }
    } else {
      // Check if required components exist in file system
      try {
        const requiredComponents = ['activeContext', 'productContext', 'decisionLog', 'progress'];
        for (const component of requiredComponents) {
          const componentPath = path.join(this.options.basePath, this.components[component]);
          if (!fs.existsSync(componentPath)) {
            return false;
          }
        }
        return true;
      } catch (error) {
        console.error('Error checking Memory Bank initialization in file system:', error);
        return false;
      }
    }
  }
  
  /**
   * Initialize the Memory Bank with default content
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      // Create default content for each component
      await this.updateComponent('activeContext', this._getDefaultActiveContext());
      await this.updateComponent('productContext', this._getDefaultProductContext());
      await this.updateComponent('decisionLog', this._getDefaultDecisionLog());
      await this.updateComponent('progress', this._getDefaultProgress());
      
      // Notify about initialization
      if (this.options.enableRealTimeUpdates) {
        this.notificationManager.notifyMemoryBankInitialized();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Memory Bank:', error);
      throw error;
    }
  }
  
  /**
   * Get the content of a Memory Bank component
   * @param {string} componentName - The component name
   * @returns {Promise<string>} The component content
   */
  async getComponent(componentName) {
    if (!this.components[componentName]) {
      throw new Error(`Unknown component: ${componentName}`);
    }
    
    // Check cache first if enabled
    if (this.cache.enabled && this.cache.data[componentName]) {
      this.cache.stats.hits++;
      return this.cache.data[componentName];
    }
    
    if (this.options.useDatabase) {
      try {
        // Get from database
        const dbComponent = await this.dbAdapter.getComponent(componentName);
        
        // If component doesn't exist in database, create it with default content
        if (!dbComponent) {
          const defaultMethod = `_getDefault${componentName.charAt(0).toUpperCase() + componentName.slice(1)}`;
          if (typeof this[defaultMethod] === 'function') {
            const defaultContent = this[defaultMethod]();
            await this.dbAdapter.saveComponent(componentName, componentName, defaultContent);
            
            // Update cache if enabled
            if (this.cache.enabled) {
              this.cache.data[componentName] = defaultContent;
            }
            
            return defaultContent;
          } else {
            await this.dbAdapter.saveComponent(componentName, componentName, '');
            
            // Update cache if enabled
            if (this.cache.enabled) {
              this.cache.data[componentName] = '';
            }
            
            return '';
          }
        }
        
        // Update cache if enabled
        if (this.cache.enabled) {
          this.cache.data[componentName] = dbComponent.content;
        }
        
        return dbComponent.content;
      } catch (error) {
        console.error(`Failed to read component ${componentName} from database:`, error);
        throw error;
      }
    } else {
      // Get from file system
      const componentPath = path.join(this.options.basePath, this.components[componentName]);
      
      try {
        // If the component file doesn't exist, create it with default content
        if (!fs.existsSync(componentPath)) {
          const defaultMethod = `_getDefault${componentName.charAt(0).toUpperCase() + componentName.slice(1)}`;
          if (typeof this[defaultMethod] === 'function') {
            const defaultContent = this[defaultMethod]();
            await fs.writeFile(componentPath, defaultContent, 'utf8');
            
            // Update cache if enabled
            if (this.cache.enabled) {
              this.cache.data[componentName] = defaultContent;
            }
            
            return defaultContent;
          } else {
            await fs.writeFile(componentPath, '', 'utf8');
            
            // Update cache if enabled
            if (this.cache.enabled) {
              this.cache.data[componentName] = '';
            }
            
            return '';
          }
        }
        
        const content = await fs.readFile(componentPath, 'utf8');
        
        // Update cache if enabled
        if (this.cache.enabled) {
          this.cache.data[componentName] = content;
        } else {
          this.cache.stats.misses++;
        }
        
        return content;
      } catch (error) {
        console.error(`Failed to read component ${componentName} from file system:`, error);
        throw error;
      }
    }
  }
  
  /**
   * Save a version of the component to history
   * @private
   * @param {string} componentName - The component name
   * @param {string} content - The content to save
   * @returns {Promise<boolean>} True if successful
   */
  async _saveToHistory(componentName, content) {
    let versionId = null;
    
    if (this.options.useDatabase) {
      try {
        await this.dbAdapter.saveComponentHistory(componentName, content);
        
        // Get the version ID (usually the latest history entry)
        const history = await this.dbAdapter.getComponentHistory(componentName, { limit: 1 });
        if (history.length > 0) {
          versionId = history[0].id.toString();
        }
        
        await this.dbAdapter.pruneComponentHistory(componentName, this.options.maxHistoryVersions);
        
        // Notify about history addition
        if (this.options.enableRealTimeUpdates && versionId) {
          this.notificationManager.notifyComponentHistoryAdded(componentName, versionId);
        }
        
        return true;
      } catch (error) {
        console.error(`Failed to save history for component ${componentName} to database:`, error);
        return false;
      }
    } else {
      try {
        // Create component history directory if it doesn't exist
        const componentHistoryDir = path.join(this.options.historyPath, componentName);
        await fs.ensureDir(componentHistoryDir);
        
        // Get the current timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        versionId = timestamp;
        
        // Create a history file with timestamp
        const historyFilePath = path.join(componentHistoryDir, `${timestamp}.md`);
        await fs.writeFile(historyFilePath, content, 'utf8');
        
        // Prune old history files if we have too many
        await this._pruneComponentHistory(componentName);
        
        // Notify about history addition
        if (this.options.enableRealTimeUpdates) {
          this.notificationManager.notifyComponentHistoryAdded(componentName, timestamp);
        }
        
        return true;
      } catch (error) {
        console.error(`Failed to save history for component ${componentName} to file system:`, error);
        return false;
      }
    }
  }
  
  /**
   * Prune component history
   * @private
   * @param {string} componentName - The component name
   * @returns {Promise<void>}
   */
  async _pruneComponentHistory(componentName) {
    if (this.options.useDatabase) {
      // Database pruning is handled in _saveToHistory
      return;
    }
    
    try {
      const componentHistoryDir = path.join(this.options.historyPath, componentName);
      const files = await fs.readdir(componentHistoryDir);
      
      // Sort files by name (which includes timestamps) in descending order (newest first)
      files.sort().reverse();
      
      // Remove older files that exceed the maximum history versions
      const filesToRemove = files.slice(this.options.maxHistoryVersions);
      for (const file of filesToRemove) {
        await fs.remove(path.join(componentHistoryDir, file));
      }
    } catch (error) {
      console.error(`Failed to prune history for component ${componentName}:`, error);
    }
  }
  
  /**
   * Update a Memory Bank component
   * @param {string} componentName - The component name
   * @param {string} content - The new content
   * @returns {Promise<boolean>} True if update successful
   */
  async updateComponent(componentName, content) {
    if (!this.components[componentName]) {
      throw new Error(`Unknown component: ${componentName}`);
    }
    
    let isNewComponent = false;
    
    if (this.options.useDatabase) {
      try {
        // Check if component exists
        const existingComponent = await this.dbAdapter.getComponent(componentName);
        isNewComponent = !existingComponent;
        
        // Update in database
        await this.dbAdapter.saveComponent(componentName, componentName, content);
        
        // Update cache if enabled
        if (this.cache.enabled) {
          this.cache.data[componentName] = content;
        }
        
        // Notify about update
        if (this.options.enableRealTimeUpdates) {
          if (isNewComponent) {
            this.notificationManager.notifyComponentCreated(componentName, content);
          } else {
            this.notificationManager.notifyComponentUpdated(componentName, content);
          }
        }
        
        return true;
      } catch (error) {
        console.error(`Failed to update component ${componentName} in database:`, error);
        throw error;
      }
    } else {
      const componentPath = path.join(this.options.basePath, this.components[componentName]);
      
      try {
        // Ensure the directory exists
        fs.ensureDirSync(this.options.basePath);
        
        // Check if component exists
        isNewComponent = !fs.existsSync(componentPath);
        
        // If the file already exists, save its current content to history before updating
        if (!isNewComponent) {
          const currentContent = await fs.readFile(componentPath, 'utf8');
          // Only save to history if the content is different
          if (currentContent !== content) {
            await this._saveToHistory(componentName, currentContent);
          }
        }
        
        // Write the new content
        await fs.writeFile(componentPath, content, 'utf8');
        
        // Update cache if enabled
        if (this.cache.enabled) {
          this.cache.data[componentName] = content;
        }
        
        // Notify about update
        if (this.options.enableRealTimeUpdates) {
          if (isNewComponent) {
            this.notificationManager.notifyComponentCreated(componentName, content);
          } else {
            this.notificationManager.notifyComponentUpdated(componentName, content);
          }
        }
        
        return true;
      } catch (error) {
        console.error(`Failed to update component ${componentName} in file system:`, error);
        throw error;
      }
    }
  }
  
  /**
   * Append content to a Memory Bank component
   * @param {string} componentName - The component name
   * @param {string} content - The content to append
   * @returns {Promise<boolean>} True if append successful
   */
  async appendToComponent(componentName, content) {
    if (!this.components[componentName]) {
      throw new Error(`Unknown component: ${componentName}`);
    }
    
    if (this.options.useDatabase) {
      try {
        // Get current content from database
        const dbComponent = await this.dbAdapter.getComponent(componentName);
        
        // If component doesn't exist, create it with the content
        if (!dbComponent) {
          await this.dbAdapter.saveComponent(componentName, componentName, content);
        } else {
          // Append to existing content
          const newContent = dbComponent.content + content;
          await this.dbAdapter.saveComponent(componentName, componentName, newContent);
        }
        
        // Update cache if enabled
        if (this.cache.enabled) {
          const currentContent = dbComponent ? dbComponent.content : '';
          this.cache.data[componentName] = currentContent + content;
        }
        
        return true;
      } catch (error) {
        console.error(`Failed to append to component ${componentName} in database:`, error);
        throw error;
      }
    } else {
      const componentPath = path.join(this.options.basePath, this.components[componentName]);
      
      try {
        // Ensure the directory exists
        fs.ensureDirSync(this.options.basePath);
        
        // If the file already exists, save its current content to history before appending
        if (fs.existsSync(componentPath)) {
          const currentContent = await fs.readFile(componentPath, 'utf8');
          await this._saveToHistory(componentName, currentContent);
        }
        
        // Create file if it doesn't exist
        if (!fs.existsSync(componentPath)) {
          await fs.writeFile(componentPath, '', 'utf8');
        }
        
        // Append the content
        await fs.appendFile(componentPath, content, 'utf8');
        
        // Update cache if enabled
        if (this.cache.enabled) {
          const currentContent = this.cache.data[componentName] || '';
          this.cache.data[componentName] = currentContent + content;
        }
        
        return true;
      } catch (error) {
        console.error(`Failed to append to component ${componentName} in file system:`, error);
        throw error;
      }
    }
  }
  
  /**
   * Get all Memory Bank components
   * @returns {Promise<Object>} Object containing all components
   */
  async getAllComponents() {
    const result = {};
    
    if (this.options.useDatabase) {
      try {
        const components = await this.dbAdapter.getAllComponents();
        
        for (const component of components) {
          result[component.id] = component.content;
          
          // Update cache if enabled
          if (this.cache.enabled) {
            this.cache.data[component.id] = component.content;
          }
        }
      } catch (error) {
        console.error('Failed to get all components from database:', error);
      }
    } else {
      for (const componentName of Object.keys(this.components)) {
        try {
          result[componentName] = await this.getComponent(componentName);
        } catch (error) {
          console.warn(`Failed to get component ${componentName}:`, error);
          result[componentName] = '';
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get the history of a component
   * @param {string} componentName - The component name
   * @param {Object} options - Options for retrieving history
   * @param {number} options.limit - Maximum number of versions to retrieve (default: all)
   * @param {boolean} options.contentOnly - Whether to return only the content (default: false)
   * @returns {Promise<Array>} Array of component versions, latest first
   */
  async getComponentHistory(componentName, options = {}) {
    if (!this.components[componentName]) {
      throw new Error(`Unknown component: ${componentName}`);
    }
    
    const { limit = Infinity, contentOnly = false } = options;
    
    if (this.options.useDatabase) {
      try {
        const history = await this.dbAdapter.getComponentHistory(componentName, { limit });
        
        if (contentOnly) {
          return history.map(version => version.content);
        }
        
        return history;
      } catch (error) {
        console.error(`Failed to get history for component ${componentName} from database:`, error);
        throw error;
      }
    } else {
      const componentHistoryDir = path.join(this.options.historyPath, componentName);
      
      try {
        // Check if history directory exists
        if (!fs.existsSync(componentHistoryDir)) {
          return [];
        }
        
        // Get all history files
        let files = await fs.readdir(componentHistoryDir);
        
        // Sort by timestamp (newest first)
        files.sort().reverse();
        
        // Apply limit
        files = files.slice(0, limit);
        
        // Read each file and build the history array
        const history = [];
        for (const file of files) {
          const timestamp = file.replace('.md', '').replace(/-/g, ':').slice(0, 19);
          const filePath = path.join(componentHistoryDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          if (contentOnly) {
            history.push(content);
          } else {
            history.push({
              timestamp: new Date(timestamp),
              content
            });
          }
        }
        
        return history;
      } catch (error) {
        console.error(`Failed to get history for component ${componentName} from file system:`, error);
        throw error;
      }
    }
  }
  
  /**
   * Get a specific version of a component from history
   * @param {string} componentName - The component name
   * @param {string} versionId - The version ID (timestamp)
   * @returns {Promise<string>} The component content for that version
   */
  async getComponentVersion(componentName, versionId) {
    if (!this.components[componentName]) {
      throw new Error(`Unknown component: ${componentName}`);
    }
    
    if (this.options.useDatabase) {
      // In the DB adapter, versionId is the ID in the component_history table
      try {
        const history = await this.dbAdapter.getComponentHistory(componentName);
        const version = history.find(v => v.id.toString() === versionId || v.timestamp.toISOString() === versionId);
        
        if (!version) {
          throw new Error(`Version ${versionId} not found for component ${componentName}`);
        }
        
        return version.content;
      } catch (error) {
        console.error(`Failed to get version ${versionId} for component ${componentName} from database:`, error);
        throw error;
      }
    } else {
      // Format versionId to match filename format
      const formattedVersionId = versionId.replace(/[:.]/g, '-');
      const versionFilePath = path.join(this.options.historyPath, componentName, `${formattedVersionId}.md`);
      
      try {
        if (!fs.existsSync(versionFilePath)) {
          throw new Error(`Version ${versionId} not found for component ${componentName}`);
        }
        
        return await fs.readFile(versionFilePath, 'utf8');
      } catch (error) {
        console.error(`Failed to get version ${versionId} for component ${componentName} from file system:`, error);
        throw error;
      }
    }
  }
  
  /**
   * Default content for Active Context
   * @private
   * @returns {string} Default content
   */
  _getDefaultActiveContext() {
    return `# Active Context

## Current Focus
*What the team is currently working on*

## Recent Changes
*Important changes made since the last update*

## Open Questions
*Questions that need resolution*

## Next Steps
*Immediate next actions*
`;
  }
  
  /**
   * Default content for Product Context
   * @private
   * @returns {string} Default content
   */
  _getDefaultProductContext() {
    return `# Product Context

## Project Overview
*High-level description of the project*

## Goals and Objectives
*What the project aims to achieve*

## Key Features
*Main functionality of the system*

## Architecture
*Overall architecture of the system*

## Constraints
*Limitations and constraints*
`;
  }
  
  /**
   * Default content for Decision Log
   * @private
   * @returns {string} Default content
   */
  _getDefaultDecisionLog() {
    return `# Decision Log

## Decisions
*Record of important decisions made during the project*

### YYYY-MM-DD: Decision Title
**Context:** What led to this decision
**Decision:** What was decided
**Rationale:** Why this option was chosen
**Consequences:** What this means for the project
`;
  }
  
  /**
   * Default content for Progress
   * @private
   * @returns {string} Default content
   */
  _getDefaultProgress() {
    return `# Progress

## Completed
- [ ] Initialize project

## In Progress
- [ ] Set up development environment

## Upcoming
- [ ] Implement core features
`;
  }
  
  /**
   * Default content for System Patterns
   * @private
   * @returns {string} Default content
   */
  _getDefaultSystemPatterns() {
    return `# System Patterns

## Coding Patterns
*Standardized approaches to code implementation*

## Architectural Patterns
*Recurring architectural solutions*

## Testing Patterns
*How testing is approached in this project*
`;
  }
  
  /**
   * Clear the component cache
   * @returns {Promise<void>}
   */
  async clearCache() {
    if (this.cache.enabled) {
      this.cache.data = {};
      this.cache.stats.lastCleared = Date.now();
      console.log('Memory Bank cache cleared');
      
      // Notify about cache cleared
      if (this.options.enableRealTimeUpdates) {
        this.notificationManager.notifyCacheCleared();
      }
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      enabled: this.cache.enabled,
      hits: this.cache.stats.hits,
      misses: this.cache.stats.misses,
      lastCleared: new Date(this.cache.stats.lastCleared),
      cacheSize: Object.keys(this.cache.data).length
    };
  }
  
  /**
   * Migrate from file system to database
   * @returns {Promise<boolean>} True if migration successful
   */
  async migrateToDatabase() {
    if (!this.options.useDatabase) {
      throw new Error('Database storage is not enabled');
    }
    
    try {
      console.log('Starting migration from file system to database...');
      
      // Create component map for migration
      const componentMap = {};
      for (const [id, fileName] of Object.entries(this.components)) {
        componentMap[id] = fileName;
      }
      
      // Migrate components
      await this.dbAdapter.migrateFromFileSystem(this.options.basePath, componentMap);
      
      console.log('Migration from file system to database completed successfully');
      return true;
    } catch (error) {
      console.error('Failed to migrate from file system to database:', error);
      throw error;
    }
  }
  
  /**
   * Subscribe to Memory Bank events
   * @param {string} connectionId - Connection identifier
   * @param {Array<string>} eventTypes - Event types to subscribe to (or null for all)
   * @param {Function} callback - Callback function to invoke
   * @returns {string} Subscription ID
   */
  subscribe(connectionId, eventTypes, callback) {
    return this.notificationManager.subscribe(connectionId, eventTypes, callback);
  }
  
  /**
   * Unsubscribe from Memory Bank events
   * @param {string} subscriptionId - Subscription identifier
   * @returns {boolean} True if unsubscription successful
   */
  unsubscribe(subscriptionId) {
    return this.notificationManager.unsubscribe(subscriptionId);
  }
  
  /**
   * Unsubscribe all subscriptions for a connection
   * @param {string} connectionId - Connection identifier
   * @returns {number} Number of subscriptions removed
   */
  unsubscribeAll(connectionId) {
    return this.notificationManager.unsubscribeAll(connectionId);
  }
  
  /**
   * Get available event types
   * @returns {Object} Event types
   */
  getEventTypes() {
    return this.notificationManager.EVENT_TYPES;
  }
}

// Export the Memory Bank manager
module.exports = MemoryBankManager; 