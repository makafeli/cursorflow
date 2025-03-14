/**
 * CursorFlow MCP Server - Main Entry Point
 * 
 * This file sets up and starts the CursorFlow MCP server.
 */

// Load environment variables
require('dotenv').config();

// Import the MCP Server
const CursorFlowMCPServer = require('./mcp/server');

// Create server instance with configuration
const server = new CursorFlowMCPServer({
  port: process.env.PORT || 3000,
  memoryBankPath: process.env.MEMORY_BANK_PATH || './memory-bank',
  modesPath: process.env.MODES_PATH || './.cursor'
});

// Start the server
server.start()
  .then(() => {
    console.log('CursorFlow MCP Server started successfully');
  })
  .catch(error => {
    console.error('Failed to start CursorFlow MCP Server:', error);
    process.exit(1);
  });

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down CursorFlow MCP Server...');
  server.stop()
    .then(() => {
      console.log('Server stopped gracefully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error shutting down server:', error);
      process.exit(1);
    });
}); 