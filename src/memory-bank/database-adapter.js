/**
 * Memory Bank Database Adapter
 * 
 * This file implements a SQLite database adapter for the Memory Bank.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

/**
 * Class representing a Memory Bank Database Adapter
 */
class MemoryBankDatabaseAdapter {
  /**
   * Create a new Memory Bank Database Adapter
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      databasePath: options.databasePath || './memory-bank/memory-bank.db',
      ...options
    };
    
    this.db = null;
    this._initialized = false;
  }
  
  /**
   * Initialize the database connection and schema
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.options.databasePath);
      await fs.ensureDir(dbDir);
      
      // Create database connection
      this.db = new sqlite3.Database(this.options.databasePath);
      
      // Create tables
      await this._createTables();
      
      this._initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
  
  /**
   * Create database tables
   * @private
   * @returns {Promise<void>}
   */
  async _createTables() {
    return new Promise((resolve, reject) => {
      // Create components table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS components (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `, (err) => {
        if (err) {
          return reject(err);
        }
        
        // Create history table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS component_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            component_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (component_id) REFERENCES components (id)
          )
        `, (err) => {
          if (err) {
            return reject(err);
          }
          
          // Create index on component_id for faster history lookups
          this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_component_history_component_id
            ON component_history (component_id)
          `, (err) => {
            if (err) {
              return reject(err);
            }
            
            resolve();
          });
        });
      });
    });
  }
  
  /**
   * Get a component by ID
   * @param {string} componentId - The component ID
   * @returns {Promise<Object>} The component data
   */
  async getComponent(componentId) {
    if (!this._initialized) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM components WHERE id = ?',
        [componentId],
        (err, row) => {
          if (err) {
            return reject(err);
          }
          
          if (!row) {
            return resolve(null);
          }
          
          resolve({
            id: row.id,
            name: row.name,
            content: row.content,
            updatedAt: new Date(row.updated_at)
          });
        }
      );
    });
  }
  
  /**
   * Save a component
   * @param {string} componentId - The component ID
   * @param {string} componentName - The component name
   * @param {string} content - The component content
   * @returns {Promise<boolean>} True if save successful
   */
  async saveComponent(componentId, componentName, content) {
    if (!this._initialized) {
      await this.initialize();
    }
    
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO components (id, name, content, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
         content = ?,
         updated_at = ?`,
        [componentId, componentName, content, now, content, now],
        async (err) => {
          if (err) {
            return reject(err);
          }
          
          // Save to history after successful update
          try {
            await this.saveComponentHistory(componentId, content);
            resolve(true);
          } catch (historyError) {
            console.error('Failed to save component history:', historyError);
            resolve(true); // Still consider the save successful even if history fails
          }
        }
      );
    });
  }
  
  /**
   * Save a component to history
   * @param {string} componentId - The component ID
   * @param {string} content - The component content
   * @returns {Promise<boolean>} True if save successful
   */
  async saveComponentHistory(componentId, content) {
    if (!this._initialized) {
      await this.initialize();
    }
    
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO component_history (component_id, content, created_at)
         VALUES (?, ?, ?)`,
        [componentId, content, now],
        (err) => {
          if (err) {
            return reject(err);
          }
          
          resolve(true);
        }
      );
    });
  }
  
  /**
   * Get component history
   * @param {string} componentId - The component ID
   * @param {Object} options - Options for retrieving history
   * @param {number} options.limit - Maximum number of versions to retrieve
   * @returns {Promise<Array>} Array of component versions
   */
  async getComponentHistory(componentId, options = {}) {
    if (!this._initialized) {
      await this.initialize();
    }
    
    const { limit = 10 } = options;
    
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM component_history
         WHERE component_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [componentId, limit],
        (err, rows) => {
          if (err) {
            return reject(err);
          }
          
          const history = rows.map(row => ({
            id: row.id,
            componentId: row.component_id,
            content: row.content,
            timestamp: new Date(row.created_at)
          }));
          
          resolve(history);
        }
      );
    });
  }
  
  /**
   * Prune component history
   * @param {string} componentId - The component ID
   * @param {number} keepCount - Number of versions to keep
   * @returns {Promise<boolean>} True if prune successful
   */
  async pruneComponentHistory(componentId, keepCount = 10) {
    if (!this._initialized) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      // First, get the IDs of entries to keep
      this.db.all(
        `SELECT id FROM component_history
         WHERE component_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [componentId, keepCount],
        (err, rows) => {
          if (err) {
            return reject(err);
          }
          
          if (rows.length === 0) {
            return resolve(true); // Nothing to prune
          }
          
          const keepIds = rows.map(row => row.id);
          
          // Delete all entries not in the keepIds list
          this.db.run(
            `DELETE FROM component_history
             WHERE component_id = ? AND id NOT IN (${keepIds.join(',')})`,
            [componentId],
            (err) => {
              if (err) {
                return reject(err);
              }
              
              resolve(true);
            }
          );
        }
      );
    });
  }
  
  /**
   * Get all components
   * @returns {Promise<Array>} Array of components
   */
  async getAllComponents() {
    if (!this._initialized) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM components',
        (err, rows) => {
          if (err) {
            return reject(err);
          }
          
          const components = rows.map(row => ({
            id: row.id,
            name: row.name,
            content: row.content,
            updatedAt: new Date(row.updated_at)
          }));
          
          resolve(components);
        }
      );
    });
  }
  
  /**
   * Migrate components from file system
   * @param {string} sourcePath - Path to migrate from
   * @param {Object} componentMap - Map of component IDs to file names
   * @returns {Promise<boolean>} True if migration successful
   */
  async migrateFromFileSystem(sourcePath, componentMap) {
    if (!this._initialized) {
      await this.initialize();
    }
    
    try {
      for (const [componentId, fileName] of Object.entries(componentMap)) {
        const filePath = path.join(sourcePath, fileName);
        
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf8');
          await this.saveComponent(componentId, componentId, content);
          console.log(`Migrated component ${componentId} from ${filePath}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to migrate from file system:', error);
      throw error;
    }
  }
  
  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            return reject(err);
          }
          
          this._initialized = false;
          this.db = null;
          resolve();
        });
      });
    }
  }
}

module.exports = MemoryBankDatabaseAdapter; 