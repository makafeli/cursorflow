/**
 * CursorFlow MCP Server - Authentication Tests
 * 
 * Tests for the MCP server authentication middleware.
 */

// Import the Authentication implementation
const MCPAuthentication = require('../../../src/mcp/auth');

describe('MCP Authentication', () => {
  describe('Initialization', () => {
    it('should disable authentication when no API key is provided', () => {
      const auth = new MCPAuthentication();
      expect(auth.enabled).toBe(false);
    });
    
    it('should enable authentication when an API key is provided', () => {
      const auth = new MCPAuthentication({ apiKey: 'test-api-key' });
      expect(auth.enabled).toBe(true);
    });
  });
  
  describe('Token Management', () => {
    let auth;
    
    beforeEach(() => {
      auth = new MCPAuthentication({ apiKey: 'test-api-key' });
    });
    
    it('should generate a valid token', () => {
      const tokenInfo = auth.generateToken('test-client');
      expect(tokenInfo).toBeDefined();
      expect(tokenInfo.token).toBeDefined();
      expect(tokenInfo.expires).toBeInstanceOf(Date);
    });
    
    it('should validate a generated token', () => {
      const tokenInfo = auth.generateToken('test-client');
      const isValid = auth.validateToken(tokenInfo.token);
      expect(isValid).toBe(true);
    });
    
    it('should return false for an invalid token', () => {
      const isValid = auth.validateToken('invalid-token');
      expect(isValid).toBe(false);
    });
    
    it('should revoke a token', () => {
      const tokenInfo = auth.generateToken('test-client');
      const wasRevoked = auth.revokeToken(tokenInfo.token);
      expect(wasRevoked).toBe(true);
      
      const isValid = auth.validateToken(tokenInfo.token);
      expect(isValid).toBe(false);
    });
    
    it('should return true when revoking a token in disabled mode', () => {
      const disabledAuth = new MCPAuthentication();
      const wasRevoked = disabledAuth.revokeToken('any-token');
      expect(wasRevoked).toBe(true);
    });
    
    it('should clean up expired tokens', () => {
      // Create a token that expires immediately
      const auth = new MCPAuthentication({ 
        apiKey: 'test-api-key',
        tokenExpiryMinutes: -1 // Set to expire in the past
      });
      
      const tokenInfo = auth.generateToken('test-client');
      
      // Manually trigger cleanup
      auth.cleanupExpiredTokens();
      
      // Token should no longer be valid
      const isValid = auth.validateToken(tokenInfo.token);
      expect(isValid).toBe(false);
    });
  });
  
  describe('Express Middleware', () => {
    let auth;
    let req;
    let res;
    let next;
    
    beforeEach(() => {
      auth = new MCPAuthentication({ apiKey: 'test-api-key' });
      req = {
        headers: {},
        query: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });
    
    it('should call next() when authentication is disabled', () => {
      const disabledAuth = new MCPAuthentication();
      disabledAuth.middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should return 401 when no token is provided', () => {
      auth.middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 when an invalid token is provided', () => {
      req.headers.authorization = 'Bearer invalid-token';
      auth.middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should call next() when a valid token is provided in the Authorization header', () => {
      const tokenInfo = auth.generateToken('test-client');
      req.headers.authorization = `Bearer ${tokenInfo.token}`;
      auth.middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should call next() when a valid token is provided in the query parameters', () => {
      const tokenInfo = auth.generateToken('test-client');
      req.query.token = tokenInfo.token;
      auth.middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
  
  describe('WebSocket Authentication', () => {
    let auth;
    let info;
    let callback;
    
    beforeEach(() => {
      auth = new MCPAuthentication({ apiKey: 'test-api-key' });
      info = {
        req: {
          url: '/socket',
          headers: {
            host: 'localhost:3000'
          }
        }
      };
      callback = jest.fn();
    });
    
    it('should call callback(true) when authentication is disabled', () => {
      const disabledAuth = new MCPAuthentication();
      disabledAuth.wsAuthenticate(info, callback);
      expect(callback).toHaveBeenCalledWith(true);
    });
    
    it('should call callback(false, 401) when no token is provided', () => {
      auth.wsAuthenticate(info, callback);
      expect(callback).toHaveBeenCalledWith(false, 401, expect.any(String));
    });
    
    it('should call callback(false, 403) when an invalid token is provided', () => {
      info.req.url = '/socket?token=invalid-token';
      auth.wsAuthenticate(info, callback);
      expect(callback).toHaveBeenCalledWith(false, 403, expect.any(String));
    });
    
    it('should call callback(true) when a valid token is provided', () => {
      const tokenInfo = auth.generateToken('test-client');
      info.req.url = `/socket?token=${tokenInfo.token}`;
      auth.wsAuthenticate(info, callback);
      expect(callback).toHaveBeenCalledWith(true);
    });
  });
  
  describe('Resource Cleanup', () => {
    it('should clean up resources when cleanup() is called', () => {
      const auth = new MCPAuthentication({ apiKey: 'test-api-key' });
      const originalInterval = auth.cleanupInterval;
      
      expect(originalInterval).toBeDefined();
      
      auth.cleanup();
      
      expect(auth.cleanupInterval).toBeNull();
    });
  });
}); 