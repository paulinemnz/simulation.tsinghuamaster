# Pre-Deployment Checklist

This checklist ensures the simulation platform is production-ready for 100 concurrent participants.

## Database Configuration

### Connection Pool
- [x] Connection pool configured with `max=50` connections
- [x] Connection pool configured with `min=5` connections
- [x] Idle timeout set to 30 seconds
- [x] Connection timeout set to 10 seconds
- [x] Pool monitoring/logging implemented

### PostgreSQL Configuration
- [x] `max_connections=200` configured in docker-compose.yml
- [x] `shared_buffers=256MB` configured
- [x] `work_mem=4MB` configured

### Database Indexes
- [x] Composite index on `decisions(simulation_session_id, round)` added
- [x] Composite index on `decision_events(participant_id, act_number)` added
- [x] All critical indexes verified in schema.sql

## Memory Management

- [x] Memory monitoring endpoint created (`/api/admin/memory`)
- [x] Memory monitoring utilities implemented
- [x] Request body size limits set (10MB for JSON and URL-encoded)
- [x] Request timeout handling (30 seconds)
- [x] Memory leak detection implemented

## Error Handling & Resilience

- [x] Retry logic implemented for transient failures
- [x] Circuit breaker pattern implemented for DeepSeek API
- [x] Enhanced error handler with database connection error handling
- [x] Graceful degradation for slow database responses
- [x] Request timeout middleware added

## Rate Limiting

- [x] Rate limiting middleware implemented
- [x] General rate limit: 100 requests/minute per IP
- [x] Rate limit headers added to responses

## Security

### Environment Variables
- [ ] **CRITICAL**: Change `JWT_SECRET` from default `'your-secret-key'` to a strong random secret
- [ ] Verify `DATABASE_URL` is set correctly
- [ ] Verify `DEEPSEEK_API_KEY` is set (if using C1 mode)
- [ ] Verify `ADMIN_SECRET` is set (if using admin endpoints)
- [ ] Verify `CORS_ORIGIN` is set for production frontend URL

### Input Validation
- [x] express-validator used on all endpoints
- [x] UUID validation on ID parameters
- [x] Enum validation on mode and status fields
- [x] Required field validation

### SQL Injection Protection
- [x] All queries use parameterized queries (`$1, $2, ...`)
- [x] No string concatenation in SQL queries
- [x] Input sanitization through express-validator

### CORS Configuration
- [x] CORS middleware configured
- [ ] **VERIFY**: CORS_ORIGIN matches production frontend URL
- [x] Credentials enabled for authenticated requests

## Monitoring & Logging

- [x] Structured logging for critical operations
- [x] Database query logging (with duration)
- [x] Memory monitoring endpoint
- [x] Connection pool statistics logging
- [x] Error logging with stack traces (development only)

## Load Testing

- [x] Load test script created (`tests/load/100-participants.test.ts`)
- [ ] **RUN**: Execute load test: `npm test -- tests/load/100-participants.test.ts`
- [ ] **VERIFY**: Error rate < 5%
- [ ] **VERIFY**: P95 response time < 5 seconds
- [ ] **VERIFY**: Success rate > 95%

## Startup Checks

- [x] Enhanced startup checks implemented
- [x] Connection pool validation
- [x] Memory configuration check
- [x] Database connection check
- [x] Schema validation check

## Pre-Deployment Steps

1. **Environment Variables**
   ```bash
   # Generate a strong JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Set in .env file
   JWT_SECRET=<generated-secret>
   ADMIN_SECRET=<strong-admin-secret>
   CORS_ORIGIN=https://your-production-domain.com
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

2. **Database Migration**
   ```bash
   # Ensure all migrations are applied
   npm run migrate
   ```

3. **Build**
   ```bash
   # Build backend
   cd backend && npm run build
   
   # Build frontend
   cd frontend && npm run build
   ```

4. **Health Check**
   ```bash
   # Verify health endpoint
   curl http://localhost:3001/health
   ```

5. **Load Test**
   ```bash
   # Run load test
   npm test -- tests/load/100-participants.test.ts
   ```

6. **Memory Check**
   ```bash
   # Check memory endpoint (requires admin auth)
   curl http://localhost:3001/api/admin/memory
   ```

## Success Criteria

- ✅ Database handles 100 concurrent connections without errors
- ✅ Response times < 500ms for p95 under load
- ✅ Memory usage stable (no leaks over 1 hour)
- ✅ Zero critical errors in load test
- ✅ All startup checks pass
- ✅ Database connection pool never exhausted
- ✅ All critical endpoints respond within timeout limits
- ✅ Error rate < 5%
- ✅ Success rate > 95%

## Post-Deployment Monitoring

1. Monitor memory usage via `/api/admin/memory`
2. Monitor database connection pool usage
3. Check error logs regularly
4. Monitor response times
5. Track participant completion rates

## Known Issues & Limitations

- Default JWT_SECRET must be changed before production
- CORS_ORIGIN must be configured for production
- Load test should be run before deployment
- Memory monitoring requires admin authentication

## Rollback Plan

If issues are detected:
1. Stop the application
2. Check logs for errors
3. Verify database connectivity
4. Check memory usage
5. Review connection pool statistics
6. Rollback to previous version if necessary
