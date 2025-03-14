/**
 * CursorFlow MCP Server - Main Server Implementation
 * 
 * This file implements the core MCP server functionality, including WebSocket handling,
 * resource management, and tool execution.
 */

const http = require('http');
const express = require('express');
const { Server: WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');

/**
 * CursorFlow MCP Server Class
 */
class CursorFlowMCPServer {
  /**
   * Create a new MCP server instance
   * @param {Object} options - Server configuration options
   */
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.authToken = options.authToken;
    this.memoryBankDir = options.memoryBankDir || './data/memory-bank';
    this.workflowsDir = options.workflowsDir || './data/workflows';
    this.modesDir = options.modesDir || './data/modes';
    this.logLevel = options.logLevel || 'info';
    this.enableCache = options.enableCache || false;
    this.useDatabase = options.useDatabase || false;
    this.databasePath = options.databasePath;
    this.testing = options.testing || false;

    // Internal state
    this.connections = new Map();
    this.resources = new Map();
    this.tools = new Map();
    this.prompts = new Map();
    this.server = null;
    this.httpServer = null;
    this.wsServer = null;
    this.app = null;
    
    // Initialize server
    this._initializeServer();
  }

  /**
   * Initialize the Express and WebSocket server
   * @private
   */
  _initializeServer() {
    // Create Express app
    this.app = express();
    
    // Serve static files from public directory
    this.app.use(express.static('public'));
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });
    
    // Create HTTP server
    this.httpServer = http.createServer(this.app);
    
    // Create WebSocket server with more verbose options
    this.wsServer = new WebSocketServer({ 
      server: this.httpServer,
      // Add specific WebSocket options
      clientTracking: true,
      // Handle WebSocket server errors
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        // Below options specified as default values
        concurrencyLimit: 10,
        threshold: 1024 // Size in bytes below which messages should not be compressed
      }
    });
    
    // Handle WebSocket server errors
    this.wsServer.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
    
    // Log when the WebSocket server is ready
    this.wsServer.on('listening', () => {
      console.log(`WebSocket server ready on ${this.host}:${this.port}`);
    });
    
    // Handle WebSocket connections
    this.wsServer.on('connection', (ws, req) => {
      console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
      this._handleConnection(ws);
    });
    
    // Register default resources
    this._registerDefaultResources();
    
    // Register default tools
    this._registerDefaultTools();
    
    // Register default prompts
    this._registerDefaultPrompts();
  }

  /**
   * Handle a new WebSocket connection
   * @param {WebSocket} ws - The WebSocket connection
   * @private
   */
  _handleConnection(ws) {
    // Generate a unique connection ID
    const connectionId = uuidv4();
    
    // Store the connection
    this.connections.set(connectionId, {
      ws,
      authenticated: false,
      lastActivity: Date.now(),
      messageCount: 0,
      ip: ws._socket ? ws._socket.remoteAddress : 'unknown'
    });
    
    // Log the connection
    console.log(`New connection established: ${connectionId} from ${this.connections.get(connectionId).ip}`);
    
    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error(`Error sending ping to ${connectionId}:`, error);
        }
      }
    }, 30000); // Send ping every 30 seconds
    
    // Set up connection timeout after 5 minutes of inactivity
    const connectionTimeout = setInterval(() => {
      const connection = this.connections.get(connectionId);
      if (connection && (Date.now() - connection.lastActivity) > 5 * 60 * 1000) {
        console.log(`Connection ${connectionId} timed out due to inactivity`);
        try {
          ws.close(1000, 'Connection timeout due to inactivity');
        } catch (error) {
          console.error(`Error closing inactive connection ${connectionId}:`, error);
        }
        clearInterval(pingInterval);
        clearInterval(connectionTimeout);
        this.connections.delete(connectionId);
      }
    }, 60000); // Check inactivity every minute
    
    // Send welcome message
    this._sendMessage(connectionId, {
      type: 'welcome',
      connectionId,
      server: 'CursorFlow MCP Server',
      version: '0.1.0',
      requiresAuth: !!this.authToken,
      time: new Date().toISOString()
    });
    
    // Handle messages
    ws.on('message', (message) => {
      try {
        // Update last activity timestamp
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.lastActivity = Date.now();
          connection.messageCount++;
        }
        
        // Parse and handle the message
        const parsedMessage = JSON.parse(message);
        console.log(`Received message from ${connectionId}: ${JSON.stringify(parsedMessage)}`);
        this._handleMessage(connectionId, parsedMessage);
      } catch (error) {
        console.error(`Error handling message from ${connectionId}:`, error);
        this._sendErrorResponse(connectionId, 'INVALID_MESSAGE', 'Invalid message format: ' + error.message, null);
      }
    });
    
    // Handle pong responses
    ws.on('pong', () => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.lastActivity = Date.now();
      }
    });
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`Connection closed: ${connectionId} with code ${code} and reason: ${reason || 'No reason provided'}`);
      clearInterval(pingInterval);
      clearInterval(connectionTimeout);
      this.connections.delete(connectionId);
    });
    
    // Handle connection error
    ws.on('error', (error) => {
      console.error(`Connection error: ${connectionId}`, error);
      clearInterval(pingInterval);
      clearInterval(connectionTimeout);
      this.connections.delete(connectionId);
    });
  }

  /**
   * Handle an incoming message
   * @param {string} connectionId - The connection ID
   * @param {Object} message - The parsed message
   * @private
   */
  _handleMessage(connectionId, message) {
    // Update last activity
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
    
    // Handle authentication
    if (message.type === 'authenticate') {
      if (this.authToken && message.token === this.authToken) {
        connection.authenticated = true;
        this._sendMessage(connectionId, {
          type: 'authenticationResult',
          success: true,
          requestId: message.requestId
        });
      } else {
        this._sendMessage(connectionId, {
          type: 'authenticationResult',
          success: false,
          error: 'Invalid authentication token',
          requestId: message.requestId
        });
      }
      return;
    }
    
    // Check authentication if required
    if (this.authToken && !connection.authenticated) {
      this._sendErrorResponse(connectionId, 'AUTHENTICATION_REQUIRED', 'Authentication required', message.requestId);
      return;
    }
    
    // Handle different message types
    switch (message.type) {
      case 'discoverResources':
        this._handleResourceDiscovery(connectionId, message);
        break;
        
      case 'getResource':
        this._handleGetResource(connectionId, message);
        break;
        
      case 'executeTool':
        this._handleExecuteTool(connectionId, message);
        break;
        
      case 'getPrompt':
        this._handleGetPrompt(connectionId, message);
        break;
        
      default:
        this._sendErrorResponse(connectionId, 'UNSUPPORTED_MESSAGE_TYPE', `Unsupported message type: ${message.type}`, message.requestId);
    }
  }

  /**
   * Handle a resource discovery request
   * @param {string} connectionId - The connection ID
   * @param {Object} message - The message
   * @private
   */
  _handleResourceDiscovery(connectionId, message) {
    const resources = Array.from(this.resources.values()).map(resource => ({
      id: resource.id,
      name: resource.name,
      description: resource.description,
      parameters: resource.parameters || []
    }));
    
    this._sendMessage(connectionId, {
      type: 'resourceDiscovery',
      resources,
      requestId: message.requestId
    });
  }

  /**
   * Handle a get resource request
   * @param {string} connectionId - The connection ID
   * @param {Object} message - The message
   * @private
   */
  _handleGetResource(connectionId, message) {
    const resourceId = message.resourceId;
    const params = message.params || {};
    
    // Validate resource ID
    if (!resourceId) {
      this._sendErrorResponse(connectionId, 'INVALID_RESOURCE_ID', 'Resource ID is required', message.requestId);
      return;
    }
    
    // Check if resource exists
    const resource = this.resources.get(resourceId);
    if (!resource) {
      this._sendErrorResponse(connectionId, 'RESOURCE_NOT_FOUND', `Resource not found: ${resourceId}`, message.requestId);
      return;
    }
    
    // Get resource data
    try {
      const data = resource.handler(params);
      
      this._sendMessage(connectionId, {
        type: 'resource',
        resourceId,
        data,
        requestId: message.requestId
      });
    } catch (error) {
      this._sendErrorResponse(connectionId, 'RESOURCE_ERROR', `Error getting resource: ${error.message}`, message.requestId);
    }
  }

  /**
   * Handle a tool execution request
   * @param {string} connectionId - The connection ID
   * @param {Object} message - The message
   * @private
   */
  _handleExecuteTool(connectionId, message) {
    const toolId = message.toolId;
    const params = message.params || {};
    
    // Validate tool ID
    if (!toolId) {
      this._sendErrorResponse(connectionId, 'INVALID_TOOL_ID', 'Tool ID is required', message.requestId);
      return;
    }
    
    // Check if tool exists
    const tool = this.tools.get(toolId);
    if (!tool) {
      this._sendErrorResponse(connectionId, 'TOOL_NOT_FOUND', `Tool not found: ${toolId}`, message.requestId);
      return;
    }
    
    // Validate parameters
    if (tool.requiredParameters) {
      for (const param of tool.requiredParameters) {
        if (params[param] === undefined) {
          this._sendErrorResponse(connectionId, 'MISSING_PARAMETER', `Missing required parameter: ${param}`, message.requestId);
          return;
        }
      }
    }
    
    // Execute tool
    try {
      const result = tool.handler(params, connectionId);
      
      this._sendMessage(connectionId, {
        type: 'toolExecution',
        toolId,
        result,
        requestId: message.requestId
      });
    } catch (error) {
      this._sendErrorResponse(connectionId, 'TOOL_EXECUTION_ERROR', `Error executing tool: ${error.message}`, message.requestId);
    }
  }

  /**
   * Handle a get prompt request
   * @param {string} connectionId - The connection ID
   * @param {Object} message - The message
   * @private
   */
  _handleGetPrompt(connectionId, message) {
    const promptId = message.promptId;
    const params = message.params || {};
    
    // Validate prompt ID
    if (!promptId) {
      this._sendErrorResponse(connectionId, 'INVALID_PROMPT_ID', 'Prompt ID is required', message.requestId);
      return;
    }
    
    // Check if prompt exists
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      this._sendErrorResponse(connectionId, 'PROMPT_NOT_FOUND', `Prompt not found: ${promptId}`, message.requestId);
      return;
    }
    
    // Generate prompt
    try {
      const generatedPrompt = prompt.generate(params);
      
      this._sendMessage(connectionId, {
        type: 'prompt',
        promptId,
        prompt: generatedPrompt,
        requestId: message.requestId
      });
    } catch (error) {
      this._sendErrorResponse(connectionId, 'PROMPT_GENERATION_ERROR', `Error generating prompt: ${error.message}`, message.requestId);
    }
  }

  /**
   * Send a message to a WebSocket connection
   * @param {string} connectionId - The connection ID
   * @param {Object} message - The message to send
   * @private
   */
  _sendMessage(connectionId, message) {
    // Check if connection exists
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.warn(`Cannot send message to non-existent connection: ${connectionId}`);
      return;
    }
    
    try {
      // Add timestamp if not present
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }
      
      // Add server ID if not present
      if (!message.serverId) {
        message.serverId = 'cursorflow-mcp-server';
      }
      
      // Check WebSocket readyState before sending
      if (connection.ws.readyState !== connection.ws.OPEN) {
        console.warn(`Cannot send message to connection ${connectionId} - WebSocket not open (state: ${connection.ws.readyState})`);
        return;
      }
      
      // Log outgoing message for debugging
      if (this.logLevel === 'debug') {
        console.debug(`Sending message to ${connectionId}: ${JSON.stringify(message)}`);
      }
      
      // Send the message
      connection.ws.send(JSON.stringify(message));
      
      // Update last activity timestamp
      connection.lastActivity = Date.now();
    } catch (error) {
      console.error(`Error sending message to ${connectionId}:`, error);
      
      // Close connection if it's broken
      if (error.message.includes('not opened') || error.message.includes('CLOSED')) {
        try {
          connection.ws.close(1011, 'Internal server error');
        } catch (closeError) {
          console.error(`Error closing broken connection ${connectionId}:`, closeError);
        }
        this.connections.delete(connectionId);
      }
    }
  }

  /**
   * Send an error response to a connection
   * @param {string} connectionId - The connection ID
   * @param {string} code - The error code
   * @param {string} message - The error message
   * @param {string} requestId - The request ID
   * @private
   */
  _sendErrorResponse(connectionId, code, message, requestId) {
    // Log the error for server-side debugging
    console.warn(`Sending error to client ${connectionId}: [${code}] ${message}`);
    
    // Prepare error response with standardized structure
    const errorResponse = {
      type: 'error',
      code: code || 'UNKNOWN_ERROR',
      error: {
        message: message || 'An unknown error occurred',
        code: code || 'UNKNOWN_ERROR'
      },
      requestId: requestId || 'unknown-request',
      timestamp: new Date().toISOString()
    };
    
    // Send the error message
    this._sendMessage(connectionId, errorResponse);
  }

  /**
   * Register default resources
   * @private
   */
  _registerDefaultResources() {
    // Memory Bank resource
    this.registerResource('memory-bank', {
      id: 'memory-bank',
      name: 'Memory Bank',
      description: 'Access to Memory Bank components',
      parameters: [
        {
          name: 'componentName',
          type: 'string',
          description: 'Name of the component to retrieve',
          required: false
        }
      ],
      handler: (params) => {
        // This is a simplified implementation for the demo
        return {
          components: {
            activeContext: {
              id: 'activeContext',
              name: 'Active Context',
              content: 'This is the active context for the current project.',
              lastUpdated: new Date().toISOString()
            },
            productContext: {
              id: 'productContext',
              name: 'Product Context',
              content: 'This is the product context containing project information.',
              lastUpdated: new Date().toISOString()
            },
            decisionLog: {
              id: 'decisionLog',
              name: 'Decision Log',
              content: 'This is the decision log tracking important decisions.',
              lastUpdated: new Date().toISOString()
            },
            progress: {
              id: 'progress',
              name: 'Progress',
              content: 'This is the progress tracking component.',
              lastUpdated: new Date().toISOString()
            }
          }
        };
      }
    });

    // Memory Bank history resource
    this.registerResource('memory-bank/history', {
      id: 'memory-bank/history',
      name: 'Memory Bank History',
      description: 'Access to Memory Bank component history',
      parameters: [
        {
          name: 'componentName',
          type: 'string',
          description: 'Name of the component to retrieve history for',
          required: true
        }
      ],
      handler: (params) => {
        if (!params.componentName) {
          throw new Error('Component name is required');
        }
        
        // This is a simplified implementation for the demo
        return {
          componentName: params.componentName,
          history: [
            {
              id: uuidv4(),
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              preview: 'Initial version',
              content: `This is the initial version of ${params.componentName}.`
            },
            {
              id: uuidv4(),
              timestamp: new Date(Date.now() - 1800000).toISOString(),
              preview: 'Updated content',
              content: `This is an updated version of ${params.componentName}.`
            },
            {
              id: uuidv4(),
              timestamp: new Date().toISOString(),
              preview: 'Latest version',
              content: `This is the latest version of ${params.componentName}.`
            }
          ]
        };
      }
    });
  }

  /**
   * Register default tools
   * @private
   */
  _registerDefaultTools() {
    // Query Memory Bank tool
    this.registerTool('queryMemoryBank', {
      id: 'queryMemoryBank',
      name: 'Query Memory Bank',
      description: 'Search the Memory Bank for specific information',
      requiredParameters: ['query'],
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'Search query',
          required: true
        },
        {
          name: 'componentName',
          type: 'string',
          description: 'Name of the component to search in',
          required: false
        }
      ],
      handler: (params) => {
        // This is a simplified implementation for the demo
        return {
          success: true,
          query: params.query,
          results: [
            {
              componentName: 'activeContext',
              matches: [
                {
                  text: `Text containing ${params.query}`,
                  location: 'line 10'
                }
              ]
            }
          ]
        };
      }
    });

    // Update Memory Bank tool
    this.registerTool('updateMemoryBank', {
      id: 'updateMemoryBank',
      name: 'Update Memory Bank',
      description: 'Update a Memory Bank component',
      requiredParameters: ['componentName', 'content'],
      parameters: [
        {
          name: 'componentName',
          type: 'string',
          description: 'Name of the component to update',
          required: true
        },
        {
          name: 'content',
          type: 'string',
          description: 'New content for the component',
          required: true
        }
      ],
      handler: (params) => {
        // This is a simplified implementation for the demo
        return {
          success: true,
          component: {
            id: params.componentName,
            name: params.componentName,
            content: params.content,
            lastUpdated: new Date().toISOString()
          }
        };
      }
    });
  }

  /**
   * Register default prompts
   * @private
   */
  _registerDefaultPrompts() {
    // Mode-specific prompt
    this.registerPrompt('modeSpecificPrompt', {
      id: 'modeSpecificPrompt',
      name: 'Mode-Specific Prompt',
      description: 'Generates a prompt based on the current mode',
      parameters: [
        {
          name: 'mode',
          type: 'string',
          description: 'The mode to generate a prompt for',
          required: true
        }
      ],
      generate: (params) => {
        if (!params.mode) {
          throw new Error('Mode is required');
        }
        
        const mode = params.mode.toLowerCase();
        
        // This is a simplified implementation for the demo
        let template = `You are in ${mode} mode. `;
        
        switch (mode) {
          case 'architect':
            template += 'Focus on system design and architecture. Consider high-level patterns and structures.';
            break;
            
          case 'code':
            template += 'Focus on writing and implementing code. Consider best practices and patterns.';
            break;
            
          case 'debug':
            template += 'Focus on finding and fixing issues. Consider common causes of bugs.';
            break;
            
          case 'test':
            template += 'Focus on creating tests. Consider test coverage and edge cases.';
            break;
            
          case 'ask':
            template += 'Focus on answering questions and providing information.';
            break;
            
          default:
            template += 'Provide general assistance based on the context.';
        }
        
        return template;
      }
    });
  }

  /**
   * Register a resource
   * @param {string} resourceId - The resource ID
   * @param {Object} resourceDefinition - The resource definition
   */
  registerResource(resourceId, resourceDefinition) {
    this.resources.set(resourceId, resourceDefinition);
  }

  /**
   * Register a tool
   * @param {string} toolId - The tool ID
   * @param {Object} toolDefinition - The tool definition
   */
  registerTool(toolId, toolDefinition) {
    this.tools.set(toolId, toolDefinition);
  }

  /**
   * Register a prompt
   * @param {string} promptId - The prompt ID
   * @param {Object} promptDefinition - The prompt definition
   */
  registerPrompt(promptId, promptDefinition) {
    this.prompts.set(promptId, promptDefinition);
  }

  /**
   * Start the server
   * @returns {Promise<void>}
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        // Create data directories if they don't exist
        fs.ensureDirSync(this.memoryBankDir);
        fs.ensureDirSync(this.workflowsDir);
        fs.ensureDirSync(this.modesDir);
        
        // Start the server
        this.server = this.httpServer.listen(this.port, this.host, () => {
          console.log(`CursorFlow MCP Server started on ${this.host}:${this.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   * @returns {Promise<void>}
   */
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      // Close all WebSocket connections
      for (const [connectionId, connection] of this.connections.entries()) {
        try {
          connection.ws.close();
        } catch (error) {
          console.error(`Error closing connection ${connectionId}:`, error);
        }
      }
      
      // Clear connections
      this.connections.clear();
      
      // Close server
      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }
}

module.exports = {
  CursorFlowMCPServer
}; 