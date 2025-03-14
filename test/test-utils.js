/**
 * CursorFlow MCP Server - Test Utilities
 * 
 * Helper functions and utilities for testing the CursorFlow MCP Server.
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a temporary testing directory
 * @returns {string} Path to the temporary directory
 */
function createTempDir() {
  const tempDir = path.join(__dirname, '..', 'temp-test', uuidv4());
  fs.ensureDirSync(tempDir);
  return tempDir;
}

/**
 * Clean up a temporary testing directory
 * @param {string} dirPath - Path to the directory to clean up
 */
function cleanupTempDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.removeSync(dirPath);
  }
}

/**
 * Create a mock memory bank for testing
 * @param {string} dirPath - Directory where the memory bank should be created
 * @returns {Object} Mock memory bank data
 */
function createMockMemoryBank(dirPath) {
  const memoryBankDir = path.join(dirPath, 'memory-bank');
  fs.ensureDirSync(memoryBankDir);
  
  const mockData = {
    activeContext: {
      currentTask: 'Testing the Memory Bank functionality',
      goals: ['Validate serialization', 'Test query capabilities'],
      notes: 'This is a test memory bank for unit testing'
    },
    productContext: {
      name: 'CursorFlow Test',
      description: 'A test project for CursorFlow',
      architecture: {
        components: [
          {
            name: 'Test Component',
            description: 'A component for testing'
          }
        ]
      }
    },
    decisionLog: [
      {
        id: '1',
        decision: 'Use Jest for testing',
        rationale: 'Jest provides a good testing framework for JavaScript',
        date: new Date().toISOString()
      }
    ],
    progress: {
      completedTasks: ['Setup testing environment'],
      pendingTasks: ['Implement Memory Bank tests', 'Test MCP protocol']
    }
  };
  
  // Write the mock data to files
  Object.entries(mockData).forEach(([key, value]) => {
    fs.writeJsonSync(path.join(memoryBankDir, `${key}.json`), value, { spaces: 2 });
  });
  
  return mockData;
}

/**
 * Create mock workflows for testing
 * @param {string} dirPath - Directory where the workflows should be created
 * @returns {Object} Mock workflows data
 */
function createMockWorkflows(dirPath) {
  const workflowsDir = path.join(dirPath, 'workflows');
  fs.ensureDirSync(workflowsDir);
  
  const mockWorkflows = {
    'test-workflow': {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'A workflow for testing',
      steps: [
        {
          id: 'step1',
          name: 'First Step',
          type: 'prompt',
          data: {
            prompt: 'This is a test prompt'
          },
          next: 'step2'
        },
        {
          id: 'step2',
          name: 'Second Step',
          type: 'decision',
          data: {
            options: [
              { id: 'option1', label: 'Option 1', next: 'step3' },
              { id: 'option2', label: 'Option 2', next: null }
            ]
          }
        },
        {
          id: 'step3',
          name: 'Final Step',
          type: 'action',
          data: {
            action: 'testAction'
          },
          next: null
        }
      ]
    }
  };
  
  // Write each workflow to a separate file
  Object.entries(mockWorkflows).forEach(([id, workflow]) => {
    fs.writeJsonSync(path.join(workflowsDir, `${id}.json`), workflow, { spaces: 2 });
  });
  
  return mockWorkflows;
}

/**
 * Create mock modes for testing
 * @param {string} dirPath - Directory where the modes should be created
 * @returns {Object} Mock modes data
 */
function createMockModes(dirPath) {
  const modesDir = path.join(dirPath, 'modes');
  fs.ensureDirSync(modesDir);
  
  const mockModes = {
    'test-mode': {
      id: 'test-mode',
      name: 'Test Mode',
      description: 'A mode for testing',
      prompts: {
        system: 'You are in test mode',
        user: 'This is a test prompt'
      },
      tools: ['test-tool-1', 'test-tool-2']
    },
    'default': {
      id: 'default',
      name: 'Default Mode',
      description: 'The default mode',
      prompts: {
        system: 'You are in default mode',
        user: 'This is the default prompt'
      },
      tools: ['default-tool']
    }
  };
  
  // Write each mode to a separate file
  Object.entries(mockModes).forEach(([id, mode]) => {
    fs.writeJsonSync(path.join(modesDir, `${id}.json`), mode, { spaces: 2 });
  });
  
  return mockModes;
}

/**
 * Creates a mock MCP message
 * @param {string} type - The message type
 * @param {Object} data - The message data
 * @returns {Object} A mock MCP message
 */
function createMockMCPMessage(type, data = {}) {
  return {
    id: uuidv4(),
    type,
    data,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  createTempDir,
  cleanupTempDir,
  createMockMemoryBank,
  createMockWorkflows,
  createMockModes,
  createMockMCPMessage
}; 