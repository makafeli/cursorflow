# CursorFlow MCP Server Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create data directories
RUN mkdir -p /usr/src/app/data/memory-bank
RUN mkdir -p /usr/src/app/data/workflows
RUN mkdir -p /usr/src/app/data/modes

# Production stage
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/data
ENV MEMORY_BANK_DIR=/data/memory-bank
ENV WORKFLOWS_DIR=/data/workflows
ENV MODES_DIR=/data/modes
ENV LOG_LEVEL=info

# Create app directory
WORKDIR /usr/src/app

# Copy from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/public ./public
COPY --from=build /usr/src/app/package*.json ./

# Create data directories
RUN mkdir -p /data/memory-bank
RUN mkdir -p /data/workflows
RUN mkdir -p /data/modes

# Add a non-root user
RUN addgroup -g 1001 -S cursorflow && \
    adduser -u 1001 -S cursorflow -G cursorflow

# Set ownership
RUN chown -R cursorflow:cursorflow /usr/src/app
RUN chown -R cursorflow:cursorflow /data

# Switch to non-root user
USER cursorflow

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run the application
CMD ["node", "src/index.js"] 