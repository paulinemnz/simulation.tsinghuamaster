# Frontend Dockerfile - Multi-stage build
# Version: 2.1 - Added SSL proxy directives for Railway HTTPS backend (cache-bust: 2026-02-21-06:30)
# FORCE CLEAN BUILD - $(date +%s)
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY public/ ./public/
COPY src/ ./src/

# Set build-time environment variable (can be overridden)
ARG REACT_APP_API_URL=http://localhost:3001
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the React app
RUN npm run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create nginx config template directory and file
RUN mkdir -p /etc/nginx/templates && \
    echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Enhanced error logging for SSL debugging \
    error_log /var/log/nginx/error.log warn; \
    access_log /var/log/nginx/access.log combined; \
    \
    # Proxy API requests to backend \
    location /api { \
        proxy_pass $BACKEND_URL/api; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_ssl_verify off; \
        proxy_ssl_server_name on; \
        proxy_ssl_protocols TLSv1.2 TLSv1.3; \
        proxy_ssl_ciphers HIGH:!aNULL:!MD5; \
        proxy_cache_bypass $http_upgrade; \
        proxy_read_timeout 300s; \
        proxy_connect_timeout 75s; \
        proxy_buffering off; \
    } \
    \
    # Proxy simulations routes directly (for compatibility with existing frontend code) \
    location /simulations { \
        proxy_pass $BACKEND_URL/api/simulations; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_ssl_verify off; \
        proxy_ssl_server_name on; \
        proxy_ssl_protocols TLSv1.2 TLSv1.3; \
        proxy_ssl_ciphers HIGH:!aNULL:!MD5; \
        proxy_cache_bypass $http_upgrade; \
        proxy_read_timeout 300s; \
        proxy_connect_timeout 75s; \
        proxy_buffering off; \
    } \
    \
    # Health check endpoint (also proxy to backend) \
    location /health { \
        proxy_pass $BACKEND_URL/health; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_ssl_verify off; \
        proxy_ssl_server_name on; \
        proxy_ssl_protocols TLSv1.2 TLSv1.3; \
        proxy_ssl_ciphers HIGH:!aNULL:!MD5; \
        proxy_connect_timeout 10s; \
        proxy_send_timeout 10s; \
        proxy_read_timeout 10s; \
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503; \
        proxy_buffering off; \
    } \
    \
    # SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Static assets caching \
    location /static { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/templates/default.conf.template

# Set default backend URL (should be overridden in Railway with backend service URL)
# Format: https://your-backend-service-name.up.railway.app
# Do NOT include /api in the URL - nginx will add it
ENV BACKEND_URL=""

# Expose port
EXPOSE 80

# Create startup script that validates BACKEND_URL and generates nginx config
RUN echo '#!/bin/sh' > /start-nginx.sh && \
    echo 'set -e' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Debug: Print all environment variables starting with BACKEND' >> /start-nginx.sh && \
    echo 'echo "=== Environment Debug ==="' >> /start-nginx.sh && \
    echo 'env | grep -i backend || echo "No BACKEND variables found"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Export BACKEND_URL to ensure it is available' >> /start-nginx.sh && \
    echo 'export BACKEND_URL="${BACKEND_URL:-}"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Validate BACKEND_URL' >> /start-nginx.sh && \
    echo 'if [ -z "$BACKEND_URL" ] || [ "$BACKEND_URL" = "" ]; then' >> /start-nginx.sh && \
    echo '  echo "========================================"' >> /start-nginx.sh && \
    echo '  echo "ERROR: BACKEND_URL environment variable is not set!"' >> /start-nginx.sh && \
    echo '  echo "========================================"' >> /start-nginx.sh && \
    echo '  echo ""' >> /start-nginx.sh && \
    echo '  echo "To fix this in Railway:"' >> /start-nginx.sh && \
    echo '  echo "1. Go to your Railway project dashboard"' >> /start-nginx.sh && \
    echo '  echo "2. Select the FRONTEND service"' >> /start-nginx.sh && \
    echo '  echo "3. Go to Variables tab"' >> /start-nginx.sh && \
    echo '  echo "4. Add environment variable: BACKEND_URL"' >> /start-nginx.sh && \
    echo '  echo "5. Set value to your backend service'\''s Railway URL"' >> /start-nginx.sh && \
    echo '  echo "   Example: https://your-backend-service-name.up.railway.app"' >> /start-nginx.sh && \
    echo '  echo "   (Get this from your backend service'\''s Settings > Domains)"' >> /start-nginx.sh && \
    echo '  echo "6. Redeploy the frontend service"' >> /start-nginx.sh && \
    echo '  echo ""' >> /start-nginx.sh && \
    echo '  echo "Without BACKEND_URL, nginx cannot proxy requests and will return 503 errors."' >> /start-nginx.sh && \
    echo '  exit 1' >> /start-nginx.sh && \
    echo 'fi' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo 'echo "Using BACKEND_URL: $BACKEND_URL"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Normalize BACKEND_URL: ensure it has a protocol prefix' >> /start-nginx.sh && \
    echo 'ORIGINAL_BACKEND_URL="$BACKEND_URL"' >> /start-nginx.sh && \
    echo 'if echo "$BACKEND_URL" | grep -qE "^https?://"; then' >> /start-nginx.sh && \
    echo '  echo "BACKEND_URL already has protocol prefix: $BACKEND_URL"' >> /start-nginx.sh && \
    echo '  # For Railway internal service-to-service communication, use HTTP instead of HTTPS' >> /start-nginx.sh && \
    echo '  # This avoids SSL handshake errors (503 with SSL routines::unexpected eof)' >> /start-nginx.sh && \
    echo '  if echo "$BACKEND_URL" | grep -qE "^https://.*\.railway\.app"; then' >> /start-nginx.sh && \
    echo '    echo "INFO: Detected Railway HTTPS URL - converting to HTTP for internal service communication"' >> /start-nginx.sh && \
    echo '    echo "This prevents SSL connection errors when services communicate within Railway'\''s network"' >> /start-nginx.sh && \
    echo '    BACKEND_URL=$(echo "$BACKEND_URL" | sed "s|^https://|http://|")' >> /start-nginx.sh && \
    echo '    echo "Converted BACKEND_URL to: $BACKEND_URL"' >> /start-nginx.sh && \
    echo '    export BACKEND_URL' >> /start-nginx.sh && \
    echo '  fi' >> /start-nginx.sh && \
    echo 'else' >> /start-nginx.sh && \
    echo '  echo "Adding https:// prefix to BACKEND_URL (original: $BACKEND_URL)"' >> /start-nginx.sh && \
    echo '  export BACKEND_URL="https://$BACKEND_URL"' >> /start-nginx.sh && \
    echo '  echo "Normalized BACKEND_URL: $BACKEND_URL"' >> /start-nginx.sh && \
    echo 'fi' >> /start-nginx.sh && \
    echo 'echo "Final BACKEND_URL for nginx config: $BACKEND_URL"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Generate nginx config with substituted BACKEND_URL' >> /start-nginx.sh && \
    echo '# envsubst replaces $VARIABLE or ${VARIABLE} in the template' >> /start-nginx.sh && \
    echo 'envsubst '"'"'$BACKEND_URL'"'"' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Debug: Show generated config (showing proxy_pass lines)' >> /start-nginx.sh && \
    echo 'echo "=== Generated nginx config (proxy_pass directives) ==="' >> /start-nginx.sh && \
    echo 'grep -n "proxy_pass" /etc/nginx/conf.d/default.conf || echo "No proxy_pass found"' >> /start-nginx.sh && \
    echo 'echo "=== Full generated nginx config ==="' >> /start-nginx.sh && \
    echo 'cat /etc/nginx/conf.d/default.conf' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Test backend connectivity' >> /start-nginx.sh && \
    echo 'echo "=== Testing backend connectivity ==="' >> /start-nginx.sh && \
    echo 'if command -v wget >/dev/null 2>&1; then' >> /start-nginx.sh && \
    echo '  echo "Testing: $BACKEND_URL/health"' >> /start-nginx.sh && \
    echo '  TEST_OUTPUT=$(wget --spider --timeout=5 --tries=1 "$BACKEND_URL/health" 2>&1)' >> /start-nginx.sh && \
    echo '  TEST_EXIT=$?' >> /start-nginx.sh && \
    echo '  echo "$TEST_OUTPUT"' >> /start-nginx.sh && \
    echo '  if [ $TEST_EXIT -ne 0 ]; then' >> /start-nginx.sh && \
    echo '    echo "WARNING: Backend health check failed (exit code: $TEST_EXIT)"' >> /start-nginx.sh && \
    echo '    echo "This may cause 503 errors. Check nginx error logs for SSL connection details."' >> /start-nginx.sh && \
    echo '  fi' >> /start-nginx.sh && \
    echo 'elif command -v curl >/dev/null 2>&1; then' >> /start-nginx.sh && \
    echo '  echo "Testing: $BACKEND_URL/health"' >> /start-nginx.sh && \
    echo '  TEST_OUTPUT=$(curl -v --max-time 5 "$BACKEND_URL/health" 2>&1)' >> /start-nginx.sh && \
    echo '  TEST_EXIT=$?' >> /start-nginx.sh && \
    echo '  echo "$TEST_OUTPUT"' >> /start-nginx.sh && \
    echo '  if [ $TEST_EXIT -ne 0 ]; then' >> /start-nginx.sh && \
    echo '    echo "WARNING: Backend health check failed (exit code: $TEST_EXIT)"' >> /start-nginx.sh && \
    echo '    echo "This may cause 503 errors. Check nginx error logs for SSL connection details."' >> /start-nginx.sh && \
    echo '  fi' >> /start-nginx.sh && \
    echo 'else' >> /start-nginx.sh && \
    echo '  echo "WARNING: Cannot test backend connectivity (wget/curl not available)"' >> /start-nginx.sh && \
    echo 'fi' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Log nginx error log location for debugging' >> /start-nginx.sh && \
    echo 'echo "=== Nginx Error Log Location ==="' >> /start-nginx.sh && \
    echo 'echo "Nginx error logs will be written to: /var/log/nginx/error.log"' >> /start-nginx.sh && \
    echo 'echo "View logs with: docker exec <container> tail -f /var/log/nginx/error.log"' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Validate generated config' >> /start-nginx.sh && \
    echo 'echo "=== Validating nginx config ==="' >> /start-nginx.sh && \
    echo 'nginx -t' >> /start-nginx.sh && \
    echo '' >> /start-nginx.sh && \
    echo '# Start nginx' >> /start-nginx.sh && \
    echo 'echo "=== Starting nginx ==="' >> /start-nginx.sh && \
    echo 'exec nginx -g "daemon off;"' >> /start-nginx.sh && \
    chmod +x /start-nginx.sh

CMD ["/start-nginx.sh"]
