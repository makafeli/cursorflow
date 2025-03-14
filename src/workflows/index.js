/**
 * Workflow Engine
 * 
 * This file implements the core functionality for managing CursorFlow workflows.
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Class representing a Workflow Engine
 */
class WorkflowEngine {
  /**
   * Create a new Workflow Engine
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      basePath: options.basePath || './workflows',
      ...options
    };
    
    // Store active workflows
    this.workflows = {};
    this.activeExecutions = {};
    
    // Ensure directory exists
    this._ensureWorkflowsDirectoryExists();
  }
  
  /**
   * Ensure the workflows directory exists
   * @private
   */
  _ensureWorkflowsDirectoryExists() {
    try {
      fs.ensureDirSync(this.options.basePath);
      console.log(`Workflows directory ensured at: ${this.options.basePath}`);
    } catch (error) {
      console.error('Failed to ensure workflows directory:', error);
      throw error;
    }
  }
  
  /**
   * Load available workflows
   * @returns {Promise<Object>} Loaded workflows
   */
  async loadWorkflows() {
    try {
      const files = await fs.readdir(this.options.basePath);
      const workflowFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of workflowFiles) {
        const filePath = path.join(this.options.basePath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const workflow = JSON.parse(content);
        
        if (workflow.id) {
          this.workflows[workflow.id] = workflow;
        }
      }
      
      return this.workflows;
    } catch (error) {
      console.error('Failed to load workflows:', error);
      return {};
    }
  }
  
  /**
   * Get workflow by ID
   * @param {string} workflowId - Workflow identifier
   * @returns {Object|null} Workflow object or null if not found
   */
  getWorkflow(workflowId) {
    return this.workflows[workflowId] || null;
  }
  
  /**
   * Get all available workflows
   * @returns {Object} Workflows
   */
  getAllWorkflows() {
    return this.workflows;
  }
  
  /**
   * Create a new workflow
   * @param {Object} workflow - Workflow definition
   * @returns {Promise<Object>} Created workflow
   */
  async createWorkflow(workflow) {
    if (!workflow.id) {
      workflow.id = uuidv4();
    }
    
    if (!workflow.name) {
      throw new Error('Workflow name is required');
    }
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      throw new Error('Workflow must contain at least one node');
    }
    
    try {
      // Store workflow
      this.workflows[workflow.id] = workflow;
      
      // Save to file
      const filePath = path.join(this.options.basePath, `${workflow.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf8');
      
      return workflow;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing workflow
   * @param {string} workflowId - Workflow identifier
   * @param {Object} workflow - Updated workflow definition
   * @returns {Promise<Object>} Updated workflow
   */
  async updateWorkflow(workflowId, workflow) {
    if (!this.workflows[workflowId]) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    try {
      // Update ID if needed
      workflow.id = workflowId;
      
      // Store workflow
      this.workflows[workflowId] = workflow;
      
      // Save to file
      const filePath = path.join(this.options.basePath, `${workflowId}.json`);
      await fs.writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf8');
      
      return workflow;
    } catch (error) {
      console.error(`Failed to update workflow ${workflowId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a workflow
   * @param {string} workflowId - Workflow identifier
   * @returns {Promise<boolean>} True if deletion successful
   */
  async deleteWorkflow(workflowId) {
    if (!this.workflows[workflowId]) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    try {
      // Remove from memory
      delete this.workflows[workflowId];
      
      // Remove file
      const filePath = path.join(this.options.basePath, `${workflowId}.json`);
      await fs.remove(filePath);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete workflow ${workflowId}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a workflow
   * @param {string} workflowId - Workflow identifier
   * @param {Object} [initialData={}] - Initial data for execution
   * @returns {string} Execution ID
   */
  executeWorkflow(workflowId, initialData = {}) {
    const workflow = this.getWorkflow(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    // Create execution context
    const executionId = uuidv4();
    const execution = {
      id: executionId,
      workflowId,
      status: 'running',
      currentNodeIndex: 0,
      data: initialData,
      history: [],
      startTime: Date.now(),
      endTime: null
    };
    
    // Store execution
    this.activeExecutions[executionId] = execution;
    
    // Start execution
    this._executeNextNode(executionId);
    
    return executionId;
  }
  
  /**
   * Execute the next node in a workflow
   * @private
   * @param {string} executionId - Execution identifier
   * @returns {Promise<void>}
   */
  async _executeNextNode(executionId) {
    const execution = this.activeExecutions[executionId];
    
    if (!execution || execution.status !== 'running') {
      return;
    }
    
    const workflow = this.getWorkflow(execution.workflowId);
    
    if (!workflow) {
      execution.status = 'failed';
      execution.error = 'Workflow not found';
      return;
    }
    
    if (execution.currentNodeIndex >= workflow.nodes.length) {
      // Workflow completed
      execution.status = 'completed';
      execution.endTime = Date.now();
      return;
    }
    
    const currentNode = workflow.nodes[execution.currentNodeIndex];
    
    try {
      // Execute node
      const nodeResult = await this._executeNode(currentNode, execution.data);
      
      // Update execution data
      execution.data = { ...execution.data, ...nodeResult };
      
      // Add to history
      execution.history.push({
        nodeId: currentNode.id,
        timestamp: Date.now(),
        result: nodeResult
      });
      
      // Move to next node
      execution.currentNodeIndex++;
      
      // Execute next node
      this._executeNextNode(executionId);
    } catch (error) {
      console.error(`Error executing node ${currentNode.id}:`, error);
      execution.status = 'failed';
      execution.error = error.message;
    }
  }
  
  /**
   * Execute a workflow node
   * @private
   * @param {Object} node - Node definition
   * @param {Object} data - Execution data
   * @returns {Promise<Object>} Node execution result
   */
  async _executeNode(node, data) {
    // Basic implementation - placeholder for node execution
    console.log(`Executing node: ${node.id} (${node.type})`);
    
    // In a real implementation, this would handle different node types
    switch (node.type) {
      case 'input':
        return node.defaultValue || {};
        
      case 'output':
        return data;
        
      case 'transform':
        return node.transform ? node.transform(data) : data;
        
      case 'condition':
        return node.condition ? node.condition(data) : data;
        
      default:
        return data;
    }
  }
  
  /**
   * Get execution state
   * @param {string} executionId - Execution identifier
   * @returns {Object|null} Execution state or null if not found
   */
  getExecutionState(executionId) {
    return this.activeExecutions[executionId] || null;
  }
  
  /**
   * Get all active executions
   * @returns {Object} Active executions
   */
  getAllExecutions() {
    return this.activeExecutions;
  }
}

// Export the Workflow Engine
module.exports = WorkflowEngine; 