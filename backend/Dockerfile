# Backend Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files to backend directory to maintain structure
COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/

# Copy shared directory to root level
COPY shared/ ./shared/

# Install dependencies
WORKDIR /app/backend
RUN npm install

# Copy source code
COPY backend/src/ ./src/

# Create symlink so ../../shared/ paths work from src/models/ and src/services/
RUN ln -s ../shared ./shared

# Update tsconfig.json for production build: remove rootDir, enable emit, update includes
RUN node -e "const fs=require('fs'); const ts=JSON.parse(fs.readFileSync('tsconfig.json')); delete ts.compilerOptions.rootDir; ts.compilerOptions.noEmit=false; if (!ts.include) ts.include=[]; if (!ts.include.includes('src/**/*')) ts.include.push('src/**/*'); if (!ts.include.includes('shared/**/*')) ts.include.push('shared/**/*'); fs.writeFileSync('tsconfig.json',JSON.stringify(ts,null,2));"

# Build TypeScript (from backend directory)
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/src/data ./src/data
# Copy SQL files needed for migrations (to match dist structure)
COPY --from=builder /app/backend/src/database/*.sql ./dist/src/database/
COPY --from=builder /app/backend/src/database/migrations/*.sql ./dist/src/database/migrations/

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
