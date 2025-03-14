/**
 * CursorFlow MCP Server - Main Entry Point
 * 
 * This is the entry point for the CursorFlow MCP Server. It imports the server
 * class, loads environment variables, and initializes the server.
 */

// Load environment variables from .env file
require('dotenv').config();

// Import server class
const { CursorFlowMCPServer } = require('./mcp/server');

// Set up environment variables with defaults
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || 'localhost';
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const DATA_DIR = process.env.DATA_DIR || './data';
const MEMORY_BANK_DIR = process.env.MEMORY_BANK_DIR || './data/memory-bank';
const WORKFLOWS_DIR = process.env.WORKFLOWS_DIR || './data/workflows';
const MODES_DIR = process.env.MODES_DIR || './data/modes';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Validate required environment variables
if (!AUTH_TOKEN) {
  console.error('ERROR: AUTH_TOKEN environment variable is required');
  process.exit(1);
}

// Initialize server
const server = new CursorFlowMCPServer({
  port: PORT,
  host: HOST,
  authToken: AUTH_TOKEN,
  memoryBankDir: MEMORY_BANK_DIR,
  workflowsDir: WORKFLOWS_DIR,
  modesDir: MODES_DIR,
  logLevel: LOG_LEVEL
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down server...');
  await server.stop();
  process.exit(0);
});

// Start server
server.start()
  .then(() => {
    console.log(`CursorFlow MCP Server started on ${HOST}:${PORT}`);
    console.log(`Memory Bank Visualizer available at http://${HOST}:${PORT}/`);
  })
  .catch((error) => {
    console.error('Failed to start CursorFlow MCP Server:', error);
    process.exit(1);
  }); 