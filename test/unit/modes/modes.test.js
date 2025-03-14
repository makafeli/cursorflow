/**
 * CursorFlow MCP Server - Modes Tests
 * 
 * Tests for the Modes implementation.
 */

const path = require('path');
const fs = require('fs-extra');
const {
  createTempDir,
  cleanupTempDir
} = require('../../test-utils');

// Import the Modes implementation
const ModeManager = require('../../../src/modes/index');

describe('Modes Manager', () => {
  let tempDir;
  let modesManager;
  
  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = createTempDir();
    
    // Initialize the Modes Manager with the temporary directory
    modesManager = new ModeManager({
      basePath: path.join(tempDir, 'modes')
    });
    
    // Create system prompt files
    fs.ensureDirSync(path.join(tempDir, 'modes'));
    fs.writeFileSync(
      path.join(tempDir, 'modes', 'system-prompt-ask'),
      'You are in ask mode',
      'utf8'
    );
    fs.writeFileSync(
      path.join(tempDir, 'modes', 'system-prompt-code'),
      'You are in code mode',
      'utf8'
    );
  });
  
  afterEach(() => {
    // Clean up the temporary directory after each test
    cleanupTempDir(tempDir);
  });
  
  describe('Initialization', () => {
    it('should initialize correctly with the base path', () => {
      expect(modesManager).toBeDefined();
      expect(modesManager.options.basePath).toBe(path.join(tempDir, 'modes'));
    });
    
    it('should have predefined modes', () => {
      expect(modesManager.modes).toBeDefined();
      expect(Object.keys(modesManager.modes).length).toBeGreaterThan(0);
      expect(modesManager.modes).toHaveProperty('ask');
      expect(modesManager.modes).toHaveProperty('code');
      expect(modesManager.modes).toHaveProperty('architect');
    });
    
    it('should default to ask mode', () => {
      expect(modesManager.activeMode).toBe('ask');
    });
  });
  
  describe('Mode Access', () => {
    it('should get available modes correctly', () => {
      const modes = modesManager.getAvailableModes();
      expect(modes).toHaveLength(Object.keys(modesManager.modes).length);
      
      // Check that all modes are included
      expect(modes.some(mode => mode.id === 'ask')).toBe(true);
      expect(modes.some(mode => mode.id === 'code')).toBe(true);
      expect(modes.some(mode => mode.id === 'architect')).toBe(true);
      expect(modes.some(mode => mode.id === 'test')).toBe(true);
      expect(modes.some(mode => mode.id === 'debug')).toBe(true);
    });
    
    it('should get the active mode correctly', () => {
      // By default, the active mode is 'ask'
      const activeMode = modesManager.getActiveMode();
      expect(activeMode).toEqual(modesManager.modes.ask);
    });
  });
  
  describe('Active Mode', () => {
    it('should set and get the active mode correctly', () => {
      // Set the active mode
      modesManager.setActiveMode('code');
      
      // Get the active mode
      const activeMode = modesManager.getActiveMode();
      expect(activeMode).toEqual(modesManager.modes.code);
    });
    
    it('should throw an error when setting an unknown mode', () => {
      expect(() => {
        modesManager.setActiveMode('non-existent-mode');
      }).toThrow('Unknown mode: non-existent-mode');
    });
  });
  
  describe('System Prompts', () => {
    it('should get the system prompt for a mode correctly', async () => {
      const askPrompt = await modesManager.getSystemPrompt('ask');
      expect(askPrompt).toBe('You are in ask mode');
      
      const codePrompt = await modesManager.getSystemPrompt('code');
      expect(codePrompt).toBe('You are in code mode');
    });
    
    it('should use default prompts when file not found', async () => {
      const architectPrompt = await modesManager.getSystemPrompt('architect');
      expect(architectPrompt).toContain('You are an Architect');
    });
    
    it('should throw an error for unknown mode', async () => {
      await expect(modesManager.getSystemPrompt('non-existent-mode'))
        .rejects.toThrow('Unknown mode: non-existent-mode');
    });
  });
  
  describe('Mode Mapping', () => {
    it('should map CursorFlow modes to Cursor IDE modes correctly', () => {
      expect(modesManager.mapToCursorMode('architect')).toBe('Agent');
      expect(modesManager.mapToCursorMode('code')).toBe('Edit');
      expect(modesManager.mapToCursorMode('test')).toBe('Agent');
      expect(modesManager.mapToCursorMode('debug')).toBe('Agent');
      expect(modesManager.mapToCursorMode('ask')).toBe('Ask');
    });
    
    it('should default to Ask mode for unknown modes', () => {
      expect(modesManager.mapToCursorMode('unknown')).toBe('Ask');
    });
  });
}); 