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
# #region agent log
RUN node -e "const fs=require('fs'); const logPath='/tmp/tsconfig-debug.log'; const log=(msg,data)=>{const entry={timestamp:Date.now(),message:msg,data:data||{}}; console.log(JSON.stringify(entry)); try{fs.appendFileSync(logPath,JSON.stringify(entry)+'\n');}catch(e){}}; const ts=JSON.parse(fs.readFileSync('tsconfig.json')); log('BEFORE_MODIFICATION',{allowImportingTsExtensions:ts.compilerOptions.allowImportingTsExtensions,noEmit:ts.compilerOptions.noEmit,rootDir:ts.compilerOptions.rootDir}); delete ts.compilerOptions.rootDir; ts.compilerOptions.noEmit=false; delete ts.compilerOptions.allowImportingTsExtensions; if (!ts.include) ts.include=[]; if (!ts.include.includes('src/**/*')) ts.include.push('src/**/*'); if (!ts.include.includes('shared/**/*')) ts.include.push('shared/**/*'); log('AFTER_MODIFICATION',{allowImportingTsExtensions:ts.compilerOptions.allowImportingTsExtensions,noEmit:ts.compilerOptions.noEmit,rootDir:ts.compilerOptions.rootDir}); fs.writeFileSync('tsconfig.json',JSON.stringify(ts,null,2)); log('AFTER_WRITE',{fileExists:fs.existsSync('tsconfig.json')});"
# #endregion

# Build TypeScript (from backend directory)
RUN npm run build

# #region agent log
# Instrumentation: Check build output structure
RUN node -e "const fs=require('fs'); const path=require('path'); const distPath='/app/backend/dist'; const checkPath=(p)=>{try{const stats=fs.statSync(p); return{exists:true,isFile:stats.isFile(),isDir:stats.isDirectory()};}catch(e){return{exists:false,error:e.message};}}; const listDir=(dir)=>{try{return fs.readdirSync(dir).map(f=>{const full=path.join(dir,f); const info=checkPath(full); return{name:f,...info};});}catch(e){return[];}}; console.log('BUILD_OUTPUT_CHECK:',JSON.stringify({distExists:checkPath(distPath),distContents:listDir(distPath)})); const serverPaths=['dist/server.js','dist/src/server.js'].map(p=>path.join('/app/backend',p)); serverPaths.forEach(p=>{const info=checkPath(p); console.log('SERVER_PATH_CHECK:',JSON.stringify({path:p,...info}));});"
# #endregion

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

# #region agent log
# Instrumentation: Verify copied files in final stage
RUN node -e "const fs=require('fs'); const path=require('path'); const logPath='/tmp/final-stage-check.log'; const log=(msg,data)=>{const entry={timestamp:Date.now(),message:msg,data:data||{}}; console.log(JSON.stringify(entry)); try{fs.appendFileSync(logPath,JSON.stringify(entry)+'\n');}catch(e){}}; log('FINAL_STAGE_CHECK',{distExists:fs.existsSync('/app/dist'),distContents:fs.existsSync('/app/dist')?fs.readdirSync('/app/dist').map(f=>{const full=path.join('/app/dist',f); try{const s=fs.statSync(full); return{name:f,isFile:s.isFile(),isDir:s.isDirectory()};}catch(e){return{name:f,error:e.message};}}).slice(0,20):[],serverJsExists:fs.existsSync('/app/dist/server.js'),serverJsInSrcExists:fs.existsSync('/app/dist/src/server.js')});"
# #endregion

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

# #region agent log
# Create startup check script to log file structure before starting
RUN echo 'const fs=require("fs");const path=require("path");const log=(msg,data)=>{const entry={timestamp:Date.now(),message:msg,data:data||{}};console.log(JSON.stringify(entry));};const check={cmdPath:"dist/src/server.js",cmdPathExists:fs.existsSync("/app/dist/src/server.js"),altPath:"dist/server.js",altPathExists:fs.existsSync("/app/dist/server.js"),distStructure:fs.existsSync("/app/dist")?fs.readdirSync("/app/dist").map(f=>{const full=path.join("/app/dist",f);try{const s=fs.statSync(full);if(s.isDirectory()){return{name:f,type:"dir",contents:fs.readdirSync(full).slice(0,10)};}return{name:f,type:"file"};}catch(e){return{name:f,error:e.message};}}).slice(0,20):[]};log("STARTUP_CHECK",check);' > /app/check-startup.js
# #endregion

# Start the server (using package.json path: dist/server.js)
# The instrumentation will log the actual file structure
CMD ["sh", "-c", "node /app/check-startup.js; node dist/server.js"]
