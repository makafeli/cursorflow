/**
 * CursorFlow MCP Server - Workflows Tests
 * 
 * Tests for the Workflows implementation.
 */

const path = require('path');
const fs = require('fs-extra');
const {
  createTempDir,
  cleanupTempDir
} = require('../../test-utils');

// Import the Workflows implementation
const WorkflowEngine = require('../../../src/workflows/index');

describe('Workflow Engine', () => {
  let tempDir;
  let workflowEngine;
  let testWorkflow;
  
  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = createTempDir();
    
    // Initialize the Workflow Engine with the temporary directory
    workflowEngine = new WorkflowEngine({
      basePath: path.join(tempDir, 'workflows')
    });
    
    // Define a test workflow
    testWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'A workflow for testing',
      nodes: [
        {
          id: 'node1',
          type: 'start',
          name: 'Start Node',
          next: 'node2'
        },
        {
          id: 'node2',
          type: 'action',
          name: 'Action Node',
          action: 'testAction',
          next: 'node3'
        },
        {
          id: 'node3',
          type: 'decision',
          name: 'Decision Node',
          condition: {
            field: 'result',
            operator: 'equals',
            value: 'success'
          },
          onTrue: 'node4',
          onFalse: null
        },
        {
          id: 'node4',
          type: 'end',
          name: 'End Node'
        }
      ]
    };
  });
  
  afterEach(() => {
    // Clean up the temporary directory after each test
    cleanupTempDir(tempDir);
  });
  
  describe('Initialization', () => {
    it('should initialize correctly with a base path', () => {
      expect(workflowEngine).toBeDefined();
      expect(workflowEngine.options.basePath).toBe(path.join(tempDir, 'workflows'));
    });
    
    it('should create the workflows directory if it does not exist', () => {
      // Check that the workflows directory was created
      expect(fs.existsSync(path.join(tempDir, 'workflows'))).toBe(true);
    });
  });
  
  describe('Workflow Management', () => {
    beforeEach(async () => {
      // Create a test workflow file
      await fs.writeJson(
        path.join(tempDir, 'workflows', 'test-workflow.json'),
        testWorkflow,
        { spaces: 2 }
      );
      
      // Load workflows
      await workflowEngine.loadWorkflows();
    });
    
    it('should load workflows from disk', async () => {
      // Check that the workflow was loaded
      expect(workflowEngine.workflows).toHaveProperty('test-workflow');
      expect(workflowEngine.workflows['test-workflow']).toEqual(testWorkflow);
    });
    
    it('should get a workflow by ID', () => {
      const workflow = workflowEngine.getWorkflow('test-workflow');
      expect(workflow).toEqual(testWorkflow);
    });
    
    it('should return null for a non-existent workflow', () => {
      const nonExistentWorkflow = workflowEngine.getWorkflow('non-existent-workflow');
      expect(nonExistentWorkflow).toBeNull();
    });
    
    it('should get all workflows', () => {
      const workflows = workflowEngine.getAllWorkflows();
      expect(workflows).toHaveProperty('test-workflow');
      expect(Object.keys(workflows).length).toBe(1);
    });
  });
  
  describe('Workflow Creation and Updates', () => {
    it('should create a new workflow', async () => {
      const newWorkflow = {
        id: 'new-workflow',
        name: 'New Workflow',
        description: 'A new workflow for testing',
        nodes: [
          {
            id: 'node1',
            type: 'start',
            name: 'Start Node',
            next: null
          }
        ]
      };
      
      // Create the workflow
      const createdWorkflow = await workflowEngine.createWorkflow(newWorkflow);
      
      // Check that the workflow was created in memory
      expect(workflowEngine.workflows['new-workflow']).toEqual(newWorkflow);
      
      // Check that the workflow was created on disk
      const filePath = path.join(tempDir, 'workflows', 'new-workflow.json');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const fileContent = await fs.readJson(filePath);
      expect(fileContent).toEqual(newWorkflow);
    });
    
    it('should update an existing workflow', async () => {
      // Create a workflow first
      await workflowEngine.createWorkflow(testWorkflow);
      
      // Update the workflow
      const updatedWorkflow = {
        ...testWorkflow,
        description: 'Updated description'
      };
      
      await workflowEngine.updateWorkflow('test-workflow', updatedWorkflow);
      
      // Check that the workflow was updated in memory
      expect(workflowEngine.workflows['test-workflow']).toEqual(updatedWorkflow);
      
      // Check that the workflow was updated on disk
      const filePath = path.join(tempDir, 'workflows', 'test-workflow.json');
      const fileContent = await fs.readJson(filePath);
      expect(fileContent).toEqual(updatedWorkflow);
    });
    
    it('should throw an error when updating a non-existent workflow', async () => {
      await expect(
        workflowEngine.updateWorkflow('non-existent', { id: 'non-existent', name: 'Test', nodes: [] })
      ).rejects.toThrow('Workflow not found');
    });
    
    it('should delete a workflow', async () => {
      // Create a workflow first
      await workflowEngine.createWorkflow(testWorkflow);
      
      // Delete the workflow
      await workflowEngine.deleteWorkflow('test-workflow');
      
      // Check that the workflow was removed from memory
      expect(workflowEngine.workflows['test-workflow']).toBeUndefined();
      
      // Check that the workflow was removed from disk
      const filePath = path.join(tempDir, 'workflows', 'test-workflow.json');
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });
  
  describe('Workflow Execution', () => {
    beforeEach(async () => {
      // Create a test workflow
      await workflowEngine.createWorkflow(testWorkflow);
    });
    
    it('should execute a workflow', () => {
      // Execute the workflow
      const executionId = workflowEngine.executeWorkflow('test-workflow');
      
      // Check that the execution was created
      expect(executionId).toBeDefined();
      expect(workflowEngine.activeExecutions[executionId]).toBeDefined();
      expect(workflowEngine.activeExecutions[executionId].workflowId).toBe('test-workflow');
      expect(workflowEngine.activeExecutions[executionId].status).toBe('running');
    });
    
    it('should get the execution state', () => {
      // Execute the workflow
      const executionId = workflowEngine.executeWorkflow('test-workflow');
      
      // Get the execution state
      const state = workflowEngine.getExecutionState(executionId);
      
      // Check that the state was returned
      expect(state).toBeDefined();
      expect(state.id).toBe(executionId);
      expect(state.workflowId).toBe('test-workflow');
    });
    
    it('should get all executions', () => {
      // Execute two workflows
      const executionId1 = workflowEngine.executeWorkflow('test-workflow');
      const executionId2 = workflowEngine.executeWorkflow('test-workflow');
      
      // Get all executions
      const executions = workflowEngine.getAllExecutions();
      
      // Check that both executions are included
      expect(Object.keys(executions).length).toBe(2);
      expect(executions[executionId1]).toBeDefined();
      expect(executions[executionId2]).toBeDefined();
    });
  });
}); 