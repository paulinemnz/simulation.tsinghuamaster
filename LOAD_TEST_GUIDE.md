# Load Testing Guide

This guide explains how to run load tests to verify your deployment can handle 100 concurrent participants.

## Prerequisites

1. Backend server must be running and accessible
2. Database must be set up and migrations run
3. Node.js and npm installed

## Running Load Tests

### Option 1: Using npm test

```bash
# From project root
npm test -- tests/load/100-participants.test.ts
```

### Option 2: Using Jest directly

```bash
# From project root
npx jest tests/load/100-participants.test.ts
```

### Option 3: With custom API URL

```bash
# If your backend is not on localhost:3001
API_URL=http://your-backend-url:3001/api npm test -- tests/load/100-participants.test.ts
```

## What the Load Test Does

The load test simulates **100 concurrent participants** going through the complete simulation:

1. **Start simulation** - Creates a new simulation session
2. **Act 1** - Retrieves Act 1 content and submits a decision
3. **Act 2** - Retrieves Act 2 content and submits a decision
4. **Act 3** - Retrieves Act 3 content and submits a decision
5. **Act 4** - Retrieves Act 4 content

Participants are distributed across modes:
- ~33 participants in C0 mode
- ~33 participants in C1 mode
- ~33 participants in C2 mode

## Success Criteria

The test will **PASS** if:

- ✅ **Error rate < 5%** - Less than 5% of participants encounter errors
- ✅ **P95 response time < 5 seconds** - 95% of requests complete within 5 seconds
- ✅ **Success rate > 95%** - At least 95% of participants complete successfully

## Understanding the Results

The test outputs detailed statistics:

```
📊 LOAD TEST RESULTS
═══════════════════════════════════════════════════════════

Total Participants: 100
Successful: 98 (98.00%)
Failed: 2 (2.00%)

Test Duration: 45.23s
Average Participant Duration: 12.34s

Response Time Percentiles:
  P50: 8.50s
  P95: 4.20s
  P99: 4.80s

Operation Statistics:
  START:
    Success Rate: 100.00%
    Avg Duration: 250ms
    P50: 200ms, P95: 400ms, P99: 500ms
  
  ACT1:
    Success Rate: 99.00%
    Avg Duration: 1200ms
    P50: 1000ms, P95: 2500ms, P99: 3000ms
```

### Key Metrics Explained

- **P50 (Median)**: Half of requests complete faster than this
- **P95**: 95% of requests complete faster than this (most important for user experience)
- **P99**: 99% of requests complete faster than this
- **Error Rate**: Percentage of participants that encountered errors
- **Success Rate**: Percentage of participants that completed successfully

## Troubleshooting

### Test fails with connection errors

**Problem**: Cannot connect to backend
**Solution**: 
- Verify backend is running: `curl http://localhost:3001/health`
- Check API_URL environment variable matches your backend URL

### High error rate (>5%)

**Possible causes**:
1. Database connection pool exhausted
2. Memory issues
3. Backend not handling concurrent requests properly

**Solutions**:
- Check backend logs for errors
- Verify database connection pool settings (max=50)
- Check memory usage: `curl http://localhost:3001/api/admin/memory` (requires admin auth)
- Consider increasing database max_connections

### High P95 response time (>5 seconds)

**Possible causes**:
1. Database queries are slow
2. Network latency
3. Backend processing is slow

**Solutions**:
- Check database indexes are created
- Monitor database query performance
- Check backend CPU/memory usage
- Consider database query optimization

### Test timeout

**Problem**: Test takes longer than 5 minutes
**Solution**:
- Increase timeout in test file (currently 300000ms = 5 minutes)
- Check for slow database queries
- Verify backend is not blocking requests

## Running Tests Against Production

**⚠️ Warning**: Only run load tests against production with caution!

```bash
# Set production URLs
API_URL=https://api.yourdomain.com/api \
HEALTH_URL=https://api.yourdomain.com/health \
npm test -- tests/load/100-participants.test.ts
```

**Recommendations**:
- Run during low-traffic periods
- Monitor production metrics closely
- Consider running with fewer participants first (modify NUM_PARTICIPANTS in test file)
- Have a rollback plan ready

## Interpreting Results for Deployment

### ✅ Ready to Deploy

- Error rate < 2%
- P95 < 3 seconds
- Success rate > 98%
- All operations show consistent performance

### ⚠️ Needs Optimization

- Error rate 2-5%
- P95 3-5 seconds
- Success rate 95-98%
- Some operations show high variance

**Actions**:
- Review slow operations
- Check database indexes
- Optimize queries
- Consider caching

### ❌ Not Ready to Deploy

- Error rate > 5%
- P95 > 5 seconds
- Success rate < 95%

**Actions**:
- Fix critical errors
- Optimize database queries
- Increase resources (CPU, memory, database connections)
- Review architecture for bottlenecks

## Customizing the Load Test

To test with different parameters, edit `tests/load/100-participants.test.ts`:

```typescript
// Change number of participants
const NUM_PARTICIPANTS = 50; // or 200, etc.

// Test specific mode only
const MODES: Array<'C0' | 'C1' | 'C2'> = ['C0'];

// Adjust timeout
}, 600000); // 10 minutes instead of 5
```

## Continuous Monitoring

After deployment, monitor:
- Response times in production
- Error rates
- Database connection pool usage
- Memory usage
- Participant completion rates

Compare production metrics to load test results to ensure consistency.
