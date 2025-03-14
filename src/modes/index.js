/**
 * Mode Manager
 * 
 * This file implements the core functionality for managing CursorFlow modes.
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Class representing a Mode Manager
 */
class ModeManager {
  /**
   * Create a new Mode Manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      basePath: options.basePath || './.cursor',
      ...options
    };
    
    // Define available modes
    this.modes = {
      architect: {
        id: 'architect',
        name: 'Architect',
        description: 'Design and plan the system architecture',
        promptFile: 'system-prompt-architect'
      },
      code: {
        id: 'code',
        name: 'Code',
        description: 'Implement code and features',
        promptFile: 'system-prompt-code'
      },
      test: {
        id: 'test',
        name: 'Test',
        description: 'Create and execute tests',
        promptFile: 'system-prompt-test'
      },
      debug: {
        id: 'debug',
        name: 'Debug',
        description: 'Find and fix issues',
        promptFile: 'system-prompt-debug'
      },
      ask: {
        id: 'ask',
        name: 'Ask',
        description: 'Answer general questions',
        promptFile: 'system-prompt-ask'
      }
    };
    
    // Active mode
    this.activeMode = 'ask'; // Default to ask mode
  }
  
  /**
   * Get a list of all available modes
   * @returns {Array} Array of mode objects
   */
  getAvailableModes() {
    return Object.values(this.modes);
  }
  
  /**
   * Get the active mode
   * @returns {Object} Active mode object
   */
  getActiveMode() {
    return this.modes[this.activeMode];
  }
  
  /**
   * Set the active mode
   * @param {string} modeId - Mode identifier
   * @returns {boolean} True if successful
   */
  setActiveMode(modeId) {
    if (!this.modes[modeId]) {
      throw new Error(`Unknown mode: ${modeId}`);
    }
    
    this.activeMode = modeId;
    return true;
  }
  
  /**
   * Get the system prompt for a mode
   * @param {string} modeId - Mode identifier
   * @returns {Promise<string>} System prompt content
   */
  async getSystemPrompt(modeId) {
    if (!this.modes[modeId]) {
      throw new Error(`Unknown mode: ${modeId}`);
    }
    
    const mode = this.modes[modeId];
    const promptFilePath = path.join(this.options.basePath, mode.promptFile);
    
    try {
      if (fs.existsSync(promptFilePath)) {
        return await fs.readFile(promptFilePath, 'utf8');
      } else {
        console.warn(`Prompt file not found: ${promptFilePath}, using default prompt`);
        return this._getDefaultPrompt(modeId);
      }
    } catch (error) {
      console.error(`Failed to read system prompt for mode ${modeId}:`, error);
      return this._getDefaultPrompt(modeId);
    }
  }
  
  /**
   * Map CursorFlow modes to Cursor IDE modes
   * @param {string} cursorFlowMode - CursorFlow mode ID
   * @returns {string} Equivalent Cursor IDE mode
   */
  mapToCursorMode(cursorFlowMode) {
    // Map the 5 CursorFlow modes to Cursor's 3 modes (Agent, Ask, Edit)
    const modeMapping = {
      architect: 'Agent',
      code: 'Edit',
      test: 'Agent',
      debug: 'Agent',
      ask: 'Ask'
    };
    
    return modeMapping[cursorFlowMode] || 'Ask';
  }
  
  /**
   * Get default prompt for a mode
   * @private
   * @param {string} modeId - Mode identifier
   * @returns {string} Default prompt content
   */
  _getDefaultPrompt(modeId) {
    const defaultPrompts = {
      architect: `You are an Architect. Your primary focus is on system design and planning. 
Help the user design robust, scalable, and maintainable software architectures.
Consider trade-offs between different approaches and recommend best practices.`,
      
      code: `You are a Code expert. Your primary focus is on writing clean, efficient, and correct code.
Help the user implement features, fix bugs, and refactor code to improve quality.
Follow best practices and conventions for the language and framework being used.`,
      
      test: `You are a Test expert. Your primary focus is on ensuring software quality through testing.
Help the user write effective unit tests, integration tests, and end-to-end tests.
Consider edge cases and recommend testing strategies to improve coverage.`,
      
      debug: `You are a Debug expert. Your primary focus is on finding and fixing issues.
Help the user diagnose problems, understand error messages, and fix bugs.
Consider the root cause of issues and recommend solutions that prevent similar problems.`,
      
      ask: `You are an assistant. Your primary focus is on answering general questions.
Help the user with any queries they have about programming, software development, or other topics.
Provide clear, concise, and accurate information.`
    };
    
    return defaultPrompts[modeId] || defaultPrompts.ask;
  }
}

// Export the Mode Manager
module.exports = ModeManager; 