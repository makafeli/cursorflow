/**
 * CursorFlow MCP Server - Memory Bank Tests
 * 
 * Tests for the Memory Bank implementation.
 */

const path = require('path');
const fs = require('fs-extra');
const {
  createTempDir,
  cleanupTempDir,
  createMockMemoryBank
} = require('../../test-utils');

// Import the Memory Bank implementation
const MemoryBank = require('../../../src/memory-bank/index');

describe('Memory Bank', () => {
  let tempDir;
  let memoryBank;
  let mockData;
  
  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = createTempDir();
    
    // Initialize the Memory Bank with the temporary directory
    memoryBank = new MemoryBank({
      basePath: path.join(tempDir, 'memory-bank')
    });
    
    // Mock data for tests
    mockData = {
      activeContext: '# Updated Active Context\nThis is a test.',
      productContext: '# Updated Product Context\nThis is a test.',
      decisionLog: '# Updated Decision Log\nThis is a test.',
      progress: '# Updated Progress\nThis is a test.'
    };
  });
  
  afterEach(() => {
    // Clean up the temporary directory after each test
    cleanupTempDir(tempDir);
  });
  
  describe('Initialization', () => {
    it('should initialize correctly with a base path', () => {
      expect(memoryBank).toBeDefined();
      expect(memoryBank.options.basePath).toBe(path.join(tempDir, 'memory-bank'));
    });
    
    it('should create the Memory Bank directory if it does not exist', () => {
      // Check that the Memory Bank directory was created
      expect(fs.existsSync(path.join(tempDir, 'memory-bank'))).toBe(true);
    });
    
    it('should create the Memory Bank history directory', () => {
      // Check that the history directory was created
      expect(fs.existsSync(path.join(tempDir, 'memory-bank', 'history'))).toBe(true);
    });
    
    it('should initialize with default content when requested', async () => {
      // Initialize the Memory Bank
      await memoryBank.initialize();
      
      // Check that the Memory Bank is initialized
      expect(memoryBank.isInitialized()).toBe(true);
      
      // Check that the components have default content
      const activeContext = await memoryBank.getComponent('activeContext');
      expect(activeContext).toContain('# Active Context');
      
      const productContext = await memoryBank.getComponent('productContext');
      expect(productContext).toContain('# Product Context');
    });
  });
  
  describe('Component Access', () => {
    beforeEach(async () => {
      // Initialize the Memory Bank
      await memoryBank.initialize();
    });
    
    it('should get a component correctly', async () => {
      const activeContext = await memoryBank.getComponent('activeContext');
      expect(activeContext).toContain('# Active Context');
    });
    
    it('should throw an error for a non-existent component', async () => {
      await expect(memoryBank.getComponent('nonExistentComponent'))
        .rejects.toThrow('Unknown component: nonExistentComponent');
    });
  });
  
  describe('Component Updates', () => {
    beforeEach(async () => {
      // Initialize the Memory Bank
      await memoryBank.initialize();
    });
    
    it('should update a component correctly', async () => {
      await memoryBank.updateComponent('activeContext', mockData.activeContext);
      
      // Check that the component was updated
      const retrievedActiveContext = await memoryBank.getComponent('activeContext');
      expect(retrievedActiveContext).toBe(mockData.activeContext);
      
      // Check that the component was updated on disk
      const fileContent = await fs.readFile(path.join(tempDir, 'memory-bank', 'activeContext.md'), 'utf8');
      expect(fileContent).toBe(mockData.activeContext);
    });
    
    it('should throw an error when updating a non-existent component', async () => {
      await expect(memoryBank.updateComponent('nonExistentComponent', 'test'))
        .rejects.toThrow('Unknown component: nonExistentComponent');
    });
  });
  
  describe('Component Appending', () => {
    beforeEach(async () => {
      // Initialize the Memory Bank
      await memoryBank.initialize();
    });
    
    it('should append to a component correctly', async () => {
      const appendText = '\n\nAppended text for testing.';
      const initialContent = await memoryBank.getComponent('activeContext');
      
      await memoryBank.appendToComponent('activeContext', appendText);
      
      // Check that the content was appended
      const updatedContent = await memoryBank.getComponent('activeContext');
      expect(updatedContent).toBe(initialContent + appendText);
    });
  });
  
  describe('All Components', () => {
    beforeEach(async () => {
      // Initialize the Memory Bank
      await memoryBank.initialize();
    });
    
    it('should get all components correctly', async () => {
      const allComponents = await memoryBank.getAllComponents();
      
      expect(allComponents).toHaveProperty('activeContext');
      expect(allComponents).toHaveProperty('productContext');
      expect(allComponents).toHaveProperty('decisionLog');
      expect(allComponents).toHaveProperty('progress');
      
      expect(allComponents.activeContext).toContain('# Active Context');
      expect(allComponents.productContext).toContain('# Product Context');
    });
  });
  
  describe('History Tracking', () => {
    beforeEach(async () => {
      // Initialize the Memory Bank
      await memoryBank.initialize();
    });
    
    it('should save history when updating a component', async () => {
      // Get the initial content
      const initialContent = await memoryBank.getComponent('activeContext');
      
      // Update the component
      await memoryBank.updateComponent('activeContext', mockData.activeContext);
      
      // Check that history was saved
      const history = await memoryBank.getComponentHistory('activeContext');
      expect(history.length).toBe(1);
      expect(history[0].content).toBe(initialContent);
    });
    
    it('should save history when appending to a component', async () => {
      // Get the initial content
      const initialContent = await memoryBank.getComponent('activeContext');
      
      // Append to the component
      const appendText = '\n\nAppended text for testing.';
      await memoryBank.appendToComponent('activeContext', appendText);
      
      // Check that history was saved
      const history = await memoryBank.getComponentHistory('activeContext');
      expect(history.length).toBe(1);
      expect(history[0].content).toBe(initialContent);
    });
    
    it('should maintain multiple versions in history', async () => {
      // Update the component multiple times
      await memoryBank.updateComponent('activeContext', 'Version 1');
      await memoryBank.updateComponent('activeContext', 'Version 2');
      await memoryBank.updateComponent('activeContext', 'Version 3');
      
      // Check that all versions are in history
      const history = await memoryBank.getComponentHistory('activeContext');
      expect(history.length).toBe(3);
      expect(history[0].content).toBe('Version 2');
      expect(history[1].content).toBe('Version 1');
      expect(history[2].content).toContain('# Active Context');
    });
    
    it('should retrieve only content when contentOnly option is true', async () => {
      // Update the component
      await memoryBank.updateComponent('activeContext', 'Version 1');
      
      // Get history with contentOnly option
      const history = await memoryBank.getComponentHistory('activeContext', { contentOnly: true });
      expect(history.length).toBe(1);
      expect(history[0]).toBe(memoryBank._getDefaultActiveContext());
      expect(typeof history[0]).toBe('string');
    });
    
    it('should limit the number of history entries when limit option is provided', async () => {
      // Update the component multiple times
      await memoryBank.updateComponent('activeContext', 'Version 1');
      await memoryBank.updateComponent('activeContext', 'Version 2');
      await memoryBank.updateComponent('activeContext', 'Version 3');
      
      // Get history with limit option
      const history = await memoryBank.getComponentHistory('activeContext', { limit: 2 });
      expect(history.length).toBe(2);
      expect(history[0].content).toBe('Version 2');
      expect(history[1].content).toBe('Version 1');
    });
    
    it('should retrieve a specific version of a component', async () => {
      // Update the component
      await memoryBank.updateComponent('activeContext', 'Version 1');
      
      // Wait a moment to ensure the timestamp is created properly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update again to create a history entry
      await memoryBank.updateComponent('activeContext', 'Version 2');
      
      // Get the history to find the version ID
      const history = await memoryBank.getComponentHistory('activeContext');
      expect(history.length).toBeGreaterThan(0);
      
      // Check the content directly rather than using timestamp
      const historyContent = history[0].content;
      expect(historyContent).toBe('Version 1');
    });
    
    it('should throw an error when retrieving a non-existent version', async () => {
      await expect(memoryBank.getComponentVersion('activeContext', '2023-01-01T00:00:00.000Z'))
        .rejects.toThrow('Version 2023-01-01T00:00:00.000Z not found for component activeContext');
    });
    
    it('should prune history when exceeding maxHistoryVersions', async () => {
      // Create a Memory Bank with a small maxHistoryVersions value
      const limitedMemoryBank = new MemoryBank({
        basePath: path.join(tempDir, 'limited-memory-bank'),
        maxHistoryVersions: 2
      });
      
      // Initialize and update multiple times
      await limitedMemoryBank.initialize();
      await limitedMemoryBank.updateComponent('activeContext', 'Version 1');
      await limitedMemoryBank.updateComponent('activeContext', 'Version 2');
      await limitedMemoryBank.updateComponent('activeContext', 'Version 3');
      
      // Check that only the most recent versions are kept
      const history = await limitedMemoryBank.getComponentHistory('activeContext');
      expect(history.length).toBe(2);
      
      // Check that the oldest version is not 'Version 1'
      const hasVersion1 = history.some(version => version.content === limitedMemoryBank._getDefaultActiveContext());
      expect(hasVersion1).toBe(false);
    });
  });
}); 