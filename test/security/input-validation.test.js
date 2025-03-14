/**
 * CursorFlow MCP Server - Security Tests for Input Validation
 * 
 * This test suite verifies that the MCP server properly validates 
 * and sanitizes input to prevent security vulnerabilities.
 */

const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const WebSocket = require('ws');
const { CursorFlowMCPServer } = require('../../src/mcp/server');

// Test configuration
const TEST_PORT = 4001;
const TEST_HOST = 'localhost';
const TEST_AUTH_TOKEN = 'test-auth-token';
const TEST_DATA_DIR = path.join(os.tmpdir(), 'cursorflow-security-test-' + Date.now());
const TEST_MEMORY_BANK_DIR = path.join(TEST_DATA_DIR, 'memory-bank');
const TEST_WORKFLOWS_DIR = path.join(TEST_DATA_DIR, 'workflows');
const TEST_MODES_DIR = path.join(TEST_DATA_DIR, 'modes');

describe('MCP Server Security Tests - Input Validation', () => {
  let server;
  let serverUrl;

  beforeAll(async () => {
    // Create test directories
    await fs.ensureDir(TEST_MEMORY_BANK_DIR);
    await fs.ensureDir(TEST_WORKFLOWS_DIR);
    await fs.ensureDir(TEST_MODES_DIR);

    // Initialize server
    server = new CursorFlowMCPServer({
      port: TEST_PORT,
      host: TEST_HOST,
      authToken: TEST_AUTH_TOKEN,
      memoryBankDir: TEST_MEMORY_BANK_DIR,
      workflowsDir: TEST_WORKFLOWS_DIR,
      modesDir: TEST_MODES_DIR,
      testing: true
    });

    // Start server
    await server.start();
    serverUrl = `ws://${TEST_HOST}:${TEST_PORT}`;
  }, 10000);

  afterAll(async () => {
    // Stop server
    if (server) {
      await server.stop();
    }

    // Clean up test directories
    await fs.remove(TEST_DATA_DIR);
  }, 10000);

  // Helper function to create a WebSocket client
  const createClient = async (withAuth = true) => {
    const client = new WebSocket(serverUrl);
    
    // Wait for connection
    await new Promise(resolve => {
      client.on('open', resolve);
    });
    
    // Handle authentication
    if (withAuth) {
      await new Promise(resolve => {
        client.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'welcome') {
            client.send(JSON.stringify({
              type: 'authenticate',
              requestId: 'auth-request',
              token: TEST_AUTH_TOKEN
            }));
          } else if (message.type === 'authenticationResult' && message.success) {
            resolve();
          }
        });
      });
    }
    
    return client;
  };

  // Helper function to get a response
  const getResponse = async (client, requestMsg) => {
    const responsePromise = new Promise(resolve => {
      const onMessage = (data) => {
        const message = JSON.parse(data);
        if (
          (message.type === 'resource' && message.requestId === requestMsg.requestId) ||
          (message.type === 'toolExecution' && message.requestId === requestMsg.requestId) ||
          (message.type === 'error')
        ) {
          client.removeListener('message', onMessage);
          resolve(message);
        }
      };
      
      client.on('message', onMessage);
    });
    
    client.send(JSON.stringify(requestMsg));
    
    return responsePromise;
  };

  describe('Authentication Validation', () => {
    test('Should reject invalid authentication tokens', async () => {
      const client = await createClient(false);
      
      const response = await getResponse(client, {
        type: 'authenticate',
        requestId: 'auth-test',
        token: 'invalid-token'
      });
      
      expect(response.type).toBe('authenticationResult');
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      
      client.close();
    });

    test('Should reject requests without authentication', async () => {
      const client = await createClient(false);
      
      const response = await getResponse(client, {
        type: 'getResource',
        requestId: 'unauth-test',
        resourceId: 'memory-bank'
      });
      
      expect(response.type).toBe('error');
      expect(response.error).toContain('authentication');
      
      client.close();
    });
  });

  describe('Resource Request Validation', () => {
    test('Should reject requests with invalid resource IDs', async () => {
      const client = await createClient();
      
      const response = await getResponse(client, {
        type: 'getResource',
        requestId: 'invalid-resource-test',
        resourceId: '../../etc/passwd'
      });
      
      expect(response.type).toBe('error');
      expect(response.error).toBeDefined();
      
      client.close();
    });

    test('Should reject requests with non-existent resources', async () => {
      const client = await createClient();
      
      const response = await getResponse(client, {
        type: 'getResource',
        requestId: 'nonexistent-resource-test',
        resourceId: 'non-existent-resource'
      });
      
      expect(response.type).toBe('error');
      expect(response.error).toBeDefined();
      
      client.close();
    });

    test('Should validate resource parameters', async () => {
      const client = await createClient();
      
      const response = await getResponse(client, {
        type: 'getResource',
        requestId: 'invalid-param-test',
        resourceId: 'memory-bank',
        params: {
          componentName: '../../../etc/passwd'
        }
      });
      
      // The server should either return an error or sanitize the path
      if (response.type === 'error') {
        expect(response.error).toBeDefined();
      } else {
        // If it doesn't return an error, ensure the data doesn't contain sensitive information
        expect(response.data).not.toContain('root:');
      }
      
      client.close();
    });
  });

  describe('Tool Execution Validation', () => {
    test('Should reject requests with invalid tool IDs', async () => {
      const client = await createClient();
      
      const response = await getResponse(client, {
        type: 'executeTool',
        requestId: 'invalid-tool-test',
        toolId: 'non-existent-tool',
        params: {}
      });
      
      expect(response.type).toBe('error');
      expect(response.error).toBeDefined();
      
      client.close();
    });

    test('Should validate tool parameters', async () => {
      const client = await createClient();
      
      // Test with missing required parameters
      const responseMissing = await getResponse(client, {
        type: 'executeTool',
        requestId: 'missing-param-test',
        toolId: 'updateMemoryBank',
        params: {
          // Missing componentName or content
        }
      });
      
      expect(responseMissing.type).toBe('error');
      expect(responseMissing.error).toBeDefined();
      
      // Test with invalid parameter types
      const responseInvalidType = await getResponse(client, {
        type: 'executeTool',
        requestId: 'invalid-type-test',
        toolId: 'updateMemoryBank',
        params: {
          componentName: 123, // Should be a string
          content: {}        // Should be a string
        }
      });
      
      expect(responseInvalidType.type).toBe('error');
      expect(responseInvalidType.error).toBeDefined();
      
      // Test with potentially malicious parameters
      const responseMalicious = await getResponse(client, {
        type: 'executeTool',
        requestId: 'malicious-param-test',
        toolId: 'updateMemoryBank',
        params: {
          componentName: '../../../etc/passwd',
          content: 'Test content'
        }
      });
      
      // The server should either return an error or sanitize the path
      if (responseMalicious.type === 'error') {
        expect(responseMalicious.error).toBeDefined();
      } else {
        // If it doesn't return an error, make sure it sanitized the path
        expect(responseMalicious.result).toBeDefined();
        expect(responseMalicious.result.component.id).not.toContain('../');
      }
      
      client.close();
    });
  });

  describe('Message Format Validation', () => {
    test('Should reject malformed messages', async () => {
      const client = await createClient();
      
      // Send invalid JSON
      client.send('this is not json');
      
      // Wait for error response
      const errorResponse = await new Promise(resolve => {
        client.once('message', (data) => {
          resolve(JSON.parse(data));
        });
      });
      
      expect(errorResponse.type).toBe('error');
      expect(errorResponse.error).toBeDefined();
      
      client.close();
    });

    test('Should reject messages with missing required fields', async () => {
      const client = await createClient();
      
      const response = await getResponse(client, {
        // Missing 'type' field
        requestId: 'missing-type-test'
      });
      
      expect(response.type).toBe('error');
      expect(response.error).toBeDefined();
      
      client.close();
    });

    test('Should handle oversized messages', async () => {
      const client = await createClient();
      
      // Create a very large message
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      // This may throw an error on the client side due to WebSocket limits
      try {
        await getResponse(client, {
          type: 'executeTool',
          requestId: 'oversized-test',
          toolId: 'updateMemoryBank',
          params: {
            componentName: 'testComponent',
            content: largeContent
          }
        });
      } catch (error) {
        // Expected - WebSocket may close the connection
        expect(error).toBeDefined();
      }
      
      // The server should either handle it gracefully or close the connection
      // Either way, we shouldn't be able to crash the server
      
      client.close();
    });
  });

  describe('Protocol Validation', () => {
    test('Should reject unsupported message types', async () => {
      const client = await createClient();
      
      const response = await getResponse(client, {
        type: 'unsupportedMessageType',
        requestId: 'unsupported-type-test'
      });
      
      expect(response.type).toBe('error');
      expect(response.error).toBeDefined();
      
      client.close();
    });

    test('Should handle concurrent requests with the same ID', async () => {
      const client = await createClient();
      
      // Send two requests with the same ID
      const requestId = 'duplicate-id-test';
      
      client.send(JSON.stringify({
        type: 'getResource',
        requestId: requestId,
        resourceId: 'memory-bank'
      }));
      
      client.send(JSON.stringify({
        type: 'getResource',
        requestId: requestId,
        resourceId: 'workflows'
      }));
      
      // Collect responses
      const responses = [];
      
      await new Promise(resolve => {
        const onMessage = (data) => {
          const message = JSON.parse(data);
          if (message.requestId === requestId) {
            responses.push(message);
            if (responses.length >= 2) {
              client.removeListener('message', onMessage);
              resolve();
            }
          }
        };
        
        client.on('message', onMessage);
        
        // Timeout after 5 seconds
        setTimeout(resolve, 5000);
      });
      
      // Server should handle this gracefully (either by responding to both or returning an error)
      expect(responses.length).toBeGreaterThan(0);
      
      client.close();
    });
  });
}); 