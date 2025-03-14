/**
 * CursorFlow MCP Server - Authentication Middleware
 * 
 * This module provides authentication functionality for the MCP server.
 */

const crypto = require('crypto');

/**
 * Authentication middleware class for the MCP server
 */
class MCPAuthentication {
  /**
   * Create a new authentication middleware
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - API key for authentication (if null, authentication is disabled)
   * @param {number} options.tokenExpiryMinutes - Token expiry time in minutes
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.tokenExpiryMinutes = options.tokenExpiryMinutes || 60;
    this.tokens = new Map();
    
    // If no API key is provided, authentication is disabled
    this.enabled = !!this.apiKey;
    
    // Set up token cleanup interval
    if (this.enabled) {
      this.cleanupInterval = setInterval(() => this.cleanupExpiredTokens(), 60000);
    }
  }
  
  /**
   * Generate a new authentication token
   * @param {string} clientId - Client identifier
   * @returns {Object} Token information
   */
  generateToken(clientId) {
    if (!this.enabled) {
      return { token: 'authentication-disabled', expires: null };
    }
    
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiry time
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + this.tokenExpiryMinutes);
    
    // Store the token
    this.tokens.set(token, {
      clientId,
      expires
    });
    
    return {
      token,
      expires
    };
  }
  
  /**
   * Validate an authentication token
   * @param {string} token - The token to validate
   * @returns {boolean} Whether the token is valid
   */
  validateToken(token) {
    if (!this.enabled) {
      return true;
    }
    
    // Check if the token exists
    if (!this.tokens.has(token)) {
      return false;
    }
    
    // Check if the token has expired
    const tokenInfo = this.tokens.get(token);
    if (tokenInfo.expires < new Date()) {
      this.tokens.delete(token);
      return false;
    }
    
    // Token is valid
    return true;
  }
  
  /**
   * Revoke an authentication token
   * @param {string} token - The token to revoke
   * @returns {boolean} Whether the token was revoked
   */
  revokeToken(token) {
    if (!this.enabled) {
      return true;
    }
    
    // Check if the token exists
    if (!this.tokens.has(token)) {
      return false;
    }
    
    // Revoke the token
    this.tokens.delete(token);
    return true;
  }
  
  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens() {
    if (!this.enabled) {
      return;
    }
    
    const now = new Date();
    
    // Remove expired tokens
    for (const [token, tokenInfo] of this.tokens.entries()) {
      if (tokenInfo.expires < now) {
        this.tokens.delete(token);
      }
    }
  }
  
  /**
   * Express middleware for authenticating requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  middleware(req, res, next) {
    if (!this.enabled) {
      // Authentication is disabled
      next();
      return;
    }
    
    // Check for the token in the Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
    
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (queryToken) {
      token = queryToken;
    }
    
    // If no token was provided, require authentication
    if (!token) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }
    
    // Validate the token
    if (!this.validateToken(token)) {
      res.status(403).json({
        error: 'Invalid or expired token'
      });
      return;
    }
    
    // Token is valid, proceed
    next();
  }
  
  /**
   * WebSocket authentication function
   * @param {Object} info - Connection info
   * @param {Function} callback - Callback function
   */
  wsAuthenticate(info, callback) {
    if (!this.enabled) {
      // Authentication is disabled
      callback(true);
      return;
    }
    
    // Get the token from the query parameter
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const token = url.searchParams.get('token');
    
    // If no token was provided, reject the connection
    if (!token) {
      callback(false, 401, 'Authentication required');
      return;
    }
    
    // Validate the token
    if (!this.validateToken(token)) {
      callback(false, 403, 'Invalid or expired token');
      return;
    }
    
    // Token is valid, accept the connection
    callback(true);
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = MCPAuthentication; 