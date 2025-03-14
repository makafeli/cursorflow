/**
 * CursorFlow MCP Server - Performance Benchmark Tests
 * 
 * This test suite measures the performance metrics of the MCP server,
 * including response times, memory usage, and concurrency handling.
 */

const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { performance } = require('perf_hooks');
const { Server: WebSocketServer } = require('ws');
const WebSocket = require('ws');
const { CursorFlowMCPServer } = require('../../src/mcp/server');
const { MemoryBankManager } = require('../../src/memory-bank');

// Test configuration
const TEST_PORT = 4000;
const TEST_HOST = 'localhost';
const TEST_AUTH_TOKEN = 'test-auth-token';
const TEST_MEMORY_SIZE = 1000; // KB
const TEST_CONCURRENT_CLIENTS = 10;
const TEST_REQUESTS_PER_CLIENT = 50;
const TEST_DATA_DIR = path.join(os.tmpdir(), 'cursorflow-perf-test-' + Date.now());
const TEST_MEMORY_BANK_DIR = path.join(TEST_DATA_DIR, 'memory-bank');
const TEST_WORKFLOWS_DIR = path.join(TEST_DATA_DIR, 'workflows');
const TEST_MODES_DIR = path.join(TEST_DATA_DIR, 'modes');

// Test data
const TEST_COMPONENT_CONTENT = 'x'.repeat(TEST_MEMORY_SIZE);

// Test suite
describe('MCP Server Performance Tests', () => {
  let server;
  let serverUrl;
  let memoryUsageStart;

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
    
    // Record initial memory usage
    memoryUsageStart = process.memoryUsage();

    // Set up test data
    const memoryBank = new MemoryBankManager({
      basePath: TEST_MEMORY_BANK_DIR
    });
    await memoryBank.initialize();
    await memoryBank.updateComponent('testComponent', TEST_COMPONENT_CONTENT);
  }, 10000);

  afterAll(async () => {
    // Stop server
    if (server) {
      await server.stop();
    }

    // Clean up test directories
    await fs.remove(TEST_DATA_DIR);
  }, 10000);

  describe('Response Time Benchmarks', () => {
    test('Should measure getResource response time', async () => {
      const client = new WebSocket(serverUrl);
      
      // Wait for connection
      await new Promise(resolve => {
        client.on('open', resolve);
      });

      // Measure response time for getResource
      const startTime = performance.now();
      
      const responsePromise = new Promise(resolve => {
        client.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'resource' && message.resourceId === 'memory-bank') {
            resolve(performance.now() - startTime);
          }
        });
      });
      
      client.send(JSON.stringify({
        type: 'getResource',
        requestId: 'test-request',
        resourceId: 'memory-bank'
      }));
      
      const responseTime = await responsePromise;
      console.log(`getResource response time: ${responseTime.toFixed(2)}ms`);
      
      expect(responseTime).toBeLessThan(500); // Response should be under 500ms
      
      client.close();
    }, 5000);

    test('Should measure executeTool response time', async () => {
      const client = new WebSocket(serverUrl);
      
      // Wait for connection
      await new Promise(resolve => {
        client.on('open', resolve);
      });

      // Measure response time for executeTool
      const startTime = performance.now();
      
      const responsePromise = new Promise(resolve => {
        client.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'toolExecution' && message.toolId === 'queryMemoryBank') {
            resolve(performance.now() - startTime);
          }
        });
      });
      
      client.send(JSON.stringify({
        type: 'executeTool',
        requestId: 'test-request',
        toolId: 'queryMemoryBank',
        params: {
          query: 'test'
        }
      }));
      
      const responseTime = await responsePromise;
      console.log(`executeTool response time: ${responseTime.toFixed(2)}ms`);
      
      expect(responseTime).toBeLessThan(1000); // Response should be under 1000ms
      
      client.close();
    }, 5000);
  });

  describe('Memory Usage Tests', () => {
    test('Should measure memory usage after operations', async () => {
      // Create a client and perform operations
      const client = new WebSocket(serverUrl);
      
      // Wait for connection
      await new Promise(resolve => {
        client.on('open', resolve);
      });
      
      // Perform some operations
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => {
          client.send(JSON.stringify({
            type: 'getResource',
            requestId: `test-request-${i}`,
            resourceId: 'memory-bank'
          }));
          
          client.once('message', () => {
            resolve();
          });
        });
      }
      
      // Measure memory usage
      const memoryUsageEnd = process.memoryUsage();
      const heapDiff = memoryUsageEnd.heapUsed - memoryUsageStart.heapUsed;
      const heapDiffMB = heapDiff / (1024 * 1024);
      
      console.log(`Memory usage increased by ${heapDiffMB.toFixed(2)}MB`);
      
      // Memory increase should be reasonable, adjust this threshold based on your needs
      expect(heapDiffMB).toBeLessThan(100); // Less than 100MB increase
      
      client.close();
    }, 10000);
  });

  describe('Concurrency Tests', () => {
    test('Should handle multiple concurrent clients', async () => {
      // Create multiple clients
      const clients = [];
      const responses = [];
      
      // Connect clients
      for (let i = 0; i < TEST_CONCURRENT_CLIENTS; i++) {
        const client = new WebSocket(serverUrl);
        clients.push(client);
        
        // Wait for connection
        await new Promise(resolve => {
          client.on('open', resolve);
        });
        
        // Listen for messages
        client.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'resource' || message.type === 'toolExecution') {
            responses.push(message);
          }
        });
      }
      
      // Start time
      const startTime = performance.now();
      
      // Send requests from all clients
      const requestPromises = [];
      
      for (let i = 0; i < TEST_CONCURRENT_CLIENTS; i++) {
        for (let j = 0; j < TEST_REQUESTS_PER_CLIENT; j++) {
          const requestPromise = new Promise(resolve => {
            setTimeout(() => {
              const requestType = Math.random() > 0.5 ? 'getResource' : 'executeTool';
              
              if (requestType === 'getResource') {
                clients[i].send(JSON.stringify({
                  type: 'getResource',
                  requestId: `client-${i}-request-${j}`,
                  resourceId: 'memory-bank'
                }));
              } else {
                clients[i].send(JSON.stringify({
                  type: 'executeTool',
                  requestId: `client-${i}-request-${j}`,
                  toolId: 'queryMemoryBank',
                  params: {
                    query: 'test'
                  }
                }));
              }
              
              resolve();
            }, Math.random() * 1000); // Randomize request timing
          });
          
          requestPromises.push(requestPromise);
        }
      }
      
      // Wait for all requests to be sent
      await Promise.all(requestPromises);
      
      // Wait for responses (with timeout)
      await new Promise(resolve => {
        const checkResponses = () => {
          if (responses.length >= TEST_CONCURRENT_CLIENTS * TEST_REQUESTS_PER_CLIENT * 0.9) {
            // We consider the test successful if at least 90% of requests receive responses
            resolve();
          } else {
            setTimeout(checkResponses, 100);
          }
        };
        
        setTimeout(() => {
          // Timeout after 30 seconds
          resolve();
        }, 30000);
        
        checkResponses();
      });
      
      // Calculate time
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const requestsPerSecond = (responses.length / totalTime) * 1000;
      
      console.log(`Handled ${responses.length} responses in ${totalTime.toFixed(2)}ms`);
      console.log(`Throughput: ${requestsPerSecond.toFixed(2)} requests/second`);
      
      // Expect reasonable throughput (adjust based on your hardware)
      expect(requestsPerSecond).toBeGreaterThan(10); // At least 10 requests per second
      
      // Close all clients
      for (const client of clients) {
        client.close();
      }
    }, 60000);
  });

  describe('Load Testing', () => {
    test('Should handle a burst of requests', async () => {
      // Create a client
      const client = new WebSocket(serverUrl);
      
      // Wait for connection
      await new Promise(resolve => {
        client.on('open', resolve);
      });
      
      // Count responses
      let responseCount = 0;
      client.on('message', () => {
        responseCount++;
      });
      
      // Send a burst of requests
      const BURST_COUNT = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < BURST_COUNT; i++) {
        client.send(JSON.stringify({
          type: 'getResource',
          requestId: `burst-request-${i}`,
          resourceId: 'memory-bank'
        }));
      }
      
      // Wait for responses
      await new Promise(resolve => {
        const checkResponses = () => {
          if (responseCount >= BURST_COUNT * 0.9) {
            // We consider the test successful if at least 90% of requests receive responses
            resolve();
          } else {
            setTimeout(checkResponses, 100);
          }
        };
        
        setTimeout(() => {
          // Timeout after 30 seconds
          resolve();
        }, 30000);
        
        checkResponses();
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`Handled ${responseCount} burst requests in ${totalTime.toFixed(2)}ms`);
      console.log(`Average response time: ${(totalTime / responseCount).toFixed(2)}ms per request`);
      
      expect(responseCount).toBeGreaterThanOrEqual(BURST_COUNT * 0.9);
      
      client.close();
    }, 30000);
  });
}); 