FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for native modules (if needed)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs public/pdfs

# Build/compile if needed (for TypeScript or native modules)
# RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]
