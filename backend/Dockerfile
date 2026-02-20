# Backend Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code and data files
COPY backend/src/ ./src/
COPY shared/ ./shared/

# Update tsconfig.json to include shared directory and remove rootDir restriction
RUN node -e "const fs=require('fs'); const ts=JSON.parse(fs.readFileSync('tsconfig.json')); delete ts.compilerOptions.rootDir; if (!ts.include) ts.include=[]; if (!ts.include.includes('src/**/*')) ts.include.push('src/**/*'); if (!ts.include.includes('shared/**/*')) ts.include.push('shared/**/*'); fs.writeFileSync('tsconfig.json',JSON.stringify(ts,null,2));"

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/data ./src/data
# Copy SQL files needed for migrations (to match dist structure)
COPY --from=builder /app/src/database/*.sql ./dist/src/database/
COPY --from=builder /app/src/database/migrations/*.sql ./dist/src/database/migrations/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "dist/src/server.js"]
