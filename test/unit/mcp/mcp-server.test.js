/**
 * CursorFlow MCP Server - MCP Server Tests
 * 
 * Tests for the MCP server implementation.
 */

const path = require('path');
const fs = require('fs-extra');
const WebSocket = require('ws');
const {
  createTempDir,
  cleanupTempDir
} = require('../../test-utils');

// Import the MCP Server implementation
const CursorFlowMCPServer = require('../../../src/mcp/server');

describe('MCP Server', () => {
  let tempDir;
  let mcpServer;
  
  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = createTempDir();
    
    // Ensure necessary directories exist
    fs.ensureDirSync(path.join(tempDir, 'memory-bank'));
    fs.ensureDirSync(path.join(tempDir, 'modes'));
    fs.ensureDirSync(path.join(tempDir, 'workflows'));
    
    // Create test system prompts
    fs.writeFileSync(
      path.join(tempDir, 'modes', 'system-prompt-ask'),
      'You are in ask mode',
      'utf8'
    );
    
    // Initialize the MCP Server with the temporary directory
    mcpServer = new CursorFlowMCPServer({
      port: 0, // Use port 0 for testing to avoid conflicts
      memoryBankPath: path.join(tempDir, 'memory-bank'),
      modesPath: path.join(tempDir, 'modes'),
      testing: true // Flag to indicate testing mode
    });
  });
  
  afterEach(async () => {
    // Stop the server if it's running
    if (mcpServer.server) {
      await mcpServer.stop();
    }
    
    // Clean up the temporary directory after each test
    cleanupTempDir(tempDir);
  });
  
  describe('Initialization', () => {
    it('should initialize correctly with provided paths', () => {
      expect(mcpServer).toBeDefined();
      expect(mcpServer.options.memoryBankPath).toBe(path.join(tempDir, 'memory-bank'));
      expect(mcpServer.options.modesPath).toBe(path.join(tempDir, 'modes'));
    });
    
    it('should initialize Express and HTTP servers', () => {
      expect(mcpServer.app).toBeDefined();
      expect(mcpServer.server).toBeDefined();
    });
    
    it('should initialize the WebSocket server', () => {
      expect(mcpServer.wss).toBeDefined();
    });
    
    it('should register default resources', () => {
      expect(Object.keys(mcpServer.resources).length).toBeGreaterThan(0);
      expect(mcpServer.resources['memory-bank']).toBeDefined();
      expect(mcpServer.resources['modes']).toBeDefined();
    });
    
    it('should register default tools', () => {
      expect(Object.keys(mcpServer.tools).length).toBeGreaterThan(0);
      expect(mcpServer.tools['initializeMemoryBank']).toBeDefined();
    });
    
    it('should register default prompts', () => {
      expect(Object.keys(mcpServer.prompts).length).toBeGreaterThan(0);
    });
  });
  
  describe('Server Lifecycle', () => {
    it('should start and stop the server', async () => {
      // Start the server
      await mcpServer.start();
      
      // Check that the server is running
      expect(mcpServer.server.listening).toBe(true);
      
      // Stop the server
      await mcpServer.stop();
      
      // Check that the server has stopped
      expect(mcpServer.server.listening).toBe(false);
    });
  });
  
  describe('Resource Management', () => {
    it('should allow registering custom resources', () => {
      // Register a custom resource
      mcpServer.registerResource('custom-resource', {
        description: 'A custom resource for testing',
        getResource: async () => ({ data: 'test' }),
        updateResource: async () => true
      });
      
      // Check that the resource was registered
      expect(mcpServer.resources['custom-resource']).toBeDefined();
      expect(mcpServer.resources['custom-resource'].description).toBe('A custom resource for testing');
    });
  });
  
  describe('Tool Management', () => {
    it('should allow registering custom tools', () => {
      // Register a custom tool
      mcpServer.registerTool('custom-tool', {
        description: 'A custom tool for testing',
        execute: async () => ({ result: 'success' })
      });
      
      // Check that the tool was registered
      expect(mcpServer.tools['custom-tool']).toBeDefined();
      expect(mcpServer.tools['custom-tool'].description).toBe('A custom tool for testing');
    });
  });
  
  describe('Prompt Management', () => {
    it('should allow registering custom prompts', () => {
      // Register a custom prompt
      mcpServer.registerPrompt('custom-prompt', {
        description: 'A custom prompt for testing',
        getPrompt: async () => 'This is a test prompt'
      });
      
      // Check that the prompt was registered
      expect(mcpServer.prompts['custom-prompt']).toBeDefined();
      expect(mcpServer.prompts['custom-prompt'].description).toBe('A custom prompt for testing');
    });
  });
});
