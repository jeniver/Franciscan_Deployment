FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Install build dependencies and ODBC driver for msnodesqlv8
ENV ACCEPT_EULA=Y
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    apt-transport-https \
    python3 \
    make \
    g++ \
    unixodbc-dev \
  && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /usr/share/keyrings/microsoft.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/11/prod bullseye main" > /etc/apt/sources.list.d/microsoft-prod.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends msodbcsql18 \
  && rm -rf /var/lib/apt/lists/*

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

# Create non-root user (Debian useradd/groupadd)
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m -s /bin/bash nodejs

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
