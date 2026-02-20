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

# Update tsconfig.json for production build: remove rootDir (let TypeScript infer from includes), enable emit, update includes
# #region agent log
RUN node -e "const fs=require('fs'); const logPath='/tmp/tsconfig-debug.log'; const log=(msg,data)=>{const entry={timestamp:Date.now(),message:msg,data:data||{}}; console.log(JSON.stringify(entry)); try{fs.appendFileSync(logPath,JSON.stringify(entry)+'\n');}catch(e){}}; const ts=JSON.parse(fs.readFileSync('tsconfig.json')); log('BEFORE_MODIFICATION',{allowImportingTsExtensions:ts.compilerOptions.allowImportingTsExtensions,noEmit:ts.compilerOptions.noEmit,rootDir:ts.compilerOptions.rootDir}); delete ts.compilerOptions.rootDir; ts.compilerOptions.noEmit=false; delete ts.compilerOptions.allowImportingTsExtensions; if (!ts.include) ts.include=[]; if (!ts.include.includes('src/**/*')) ts.include.push('src/**/*'); if (!ts.include.includes('shared/**/*')) ts.include.push('shared/**/*'); log('AFTER_MODIFICATION',{allowImportingTsExtensions:ts.compilerOptions.allowImportingTsExtensions,noEmit:ts.compilerOptions.noEmit,rootDir:ts.compilerOptions.rootDir}); fs.writeFileSync('tsconfig.json',JSON.stringify(ts,null,2)); log('AFTER_WRITE',{fileExists:fs.existsSync('tsconfig.json')});"
# #endregion

# Build TypeScript (from backend directory)
RUN npm run build || (echo "BUILD_FAILED" && exit 1)

# #region agent log
# Instrumentation: Check build output structure comprehensively
RUN node -e "const fs=require('fs');const path=require('path');const findFiles=(dir,pattern,results=[])=>{try{if(!fs.existsSync(dir))return results;const items=fs.readdirSync(dir);for(const item of items){const fullPath=path.join(dir,item);try{const stat=fs.statSync(fullPath);if(stat.isDirectory()){findFiles(fullPath,pattern,results);}else if(item.match(pattern)){results.push(fullPath);}}catch(e){}}return results;}catch(e){return results;}};const distPath='/app/backend/dist';const checkPath=(p)=>{try{const stats=fs.statSync(p);return{exists:true,isFile:stats.isFile(),isDir:stats.isDirectory()};}catch(e){return{exists:false,error:e.message};}};const listDir=(dir,depth=0)=>{if(depth>3)return[];try{return fs.readdirSync(dir).map(f=>{const full=path.join(dir,f);const info=checkPath(full);const result={name:f,path:full.replace('/app/backend/',''),...info};if(info.isDir&&depth<2){result.contents=listDir(full,depth+1).slice(0,5);}return result;});}catch(e){return[];}};const check={distExists:checkPath(distPath),distContents:listDir(distPath),allServerJs:findFiles(distPath,'server\\.js$'),allJsFiles:findFiles(distPath,'\\.js$').slice(0,20)};console.error('BUILD_OUTPUT_CHECK:'+JSON.stringify(check));"
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
# Copy SQL files needed for migrations (to match dist structure: dist/backend/src/...)
COPY --from=builder /app/backend/src/database/*.sql ./dist/backend/src/database/
COPY --from=builder /app/backend/src/database/migrations/*.sql ./dist/backend/src/database/migrations/

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
# Create comprehensive startup check script to find server.js
RUN echo 'const fs=require("fs");const path=require("path");const findFiles=(dir,pattern,results=[])=>{try{if(!fs.existsSync(dir))return results;const items=fs.readdirSync(dir);for(const item of items){const fullPath=path.join(dir,item);try{const stat=fs.statSync(fullPath);if(stat.isDirectory()){findFiles(fullPath,pattern,results);}else if(item.match(pattern)){results.push(fullPath.replace("/app/",""));}}catch(e){}}return results;}catch(e){return results;}};const log=(msg,data)=>{const entry={timestamp:Date.now(),message:msg,data:data||{}};console.error(JSON.stringify(entry));};const check={distExists:fs.existsSync("/app/dist"),distContents:fs.existsSync("/app/dist")?fs.readdirSync("/app/dist").map(f=>{const full=path.join("/app/dist",f);try{const s=fs.statSync(full);return{name:f,type:s.isDirectory()?"dir":"file"};}catch(e){return{name:f,error:e.message};}}):[],serverJsFiles:findFiles("/app","server\\.js$"),allDistFiles:findFiles("/app/dist",".*\\.js$").slice(0,30)};log("STARTUP_CHECK",check);' > /app/check-startup.js
# #endregion

# Start the server with path detection (try dist/backend/src/server.js first based on STARTUP_CHECK logs)
# #region agent log
CMD ["sh", "-c", "node /app/check-startup.js 2>&1; if [ -f /app/dist/backend/src/server.js ]; then exec node dist/backend/src/server.js; elif [ -f /app/dist/src/server.js ]; then exec node dist/src/server.js; elif [ -f /app/dist/server.js ]; then exec node dist/server.js; else echo 'ERROR: server.js not found. Check STARTUP_CHECK logs above for actual file locations.'; exit 1; fi"]
# #endregion
