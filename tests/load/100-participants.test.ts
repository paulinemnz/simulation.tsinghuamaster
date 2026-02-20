/**
 * Load Test: 100 Concurrent Participants
 * Simulates 100 participants using the simulation simultaneously
 * 
 * Run with: npm test -- tests/load/100-participants.test.ts
 * Or: npx jest tests/load/100-participants.test.ts
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';
const HEALTH_CHECK_URL = process.env.HEALTH_URL || 'http://localhost:3001/health';

interface ParticipantMetrics {
  participantId: string;
  sessionId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  errors: string[];
  operations: {
    start: { success: boolean; duration: number; error?: string };
    act1?: { success: boolean; duration: number; error?: string };
    act2?: { success: boolean; duration: number; error?: string };
    act3?: { success: boolean; duration: number; error?: string };
    act4?: { success: boolean; duration: number; error?: string };
  };
}

interface LoadTestResults {
  totalParticipants: number;
  successful: number;
  failed: number;
  totalDuration: number;
  averageDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  errors: Array<{ participantId: string; error: string }>;
  operationStats: {
    [key: string]: {
      total: number;
      successful: number;
      failed: number;
      avgDuration: number;
      p50: number;
      p95: number;
      p99: number;
    };
  };
}

/**
 * Simulate a single participant going through the simulation
 */
async function simulateParticipant(
  participantId: string,
  mode: 'C0' | 'C1' | 'C2' = 'C0'
): Promise<ParticipantMetrics> {
  const metrics: ParticipantMetrics = {
    participantId,
    startTime: Date.now(),
    errors: [],
    operations: {
      start: { success: false, duration: 0 }
    }
  };

  const api: AxiosInstance = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    validateStatus: () => true // Don't throw on any status
  });

  try {
    // 1. Start simulation
    const startTime = Date.now();
    const startResponse = await api.post('/simulations/start-with-mode', {
      participant_id: participantId,
      mode
    });
    metrics.operations.start.duration = Date.now() - startTime;
    
    if (startResponse.status === 201 && startResponse.data?.ok && startResponse.data?.sessionId) {
      metrics.operations.start.success = true;
      metrics.sessionId = startResponse.data.sessionId;
    } else {
      metrics.operations.start.success = false;
      metrics.operations.start.error = `Status: ${startResponse.status}, Data: ${JSON.stringify(startResponse.data)}`;
      metrics.errors.push(`Failed to start: ${metrics.operations.start.error}`);
      return metrics;
    }

    // 2. Get Act 1
    const act1Start = Date.now();
    const act1Response = await api.get(`/sim/${metrics.sessionId}/act/1`);
    metrics.operations.act1 = {
      success: act1Response.status === 200,
      duration: Date.now() - act1Start,
      error: act1Response.status !== 200 ? `Status: ${act1Response.status}` : undefined
    };
    if (!metrics.operations.act1.success) {
      metrics.errors.push(`Act 1 failed: ${metrics.operations.act1.error}`);
      return metrics;
    }

    // 3. Submit Act 1 decision
    const act1DecisionStart = Date.now();
    const act1DecisionResponse = await api.post(`/sim/${metrics.sessionId}/act/1/decision`, {
      option_id: 'A',
      decision_time_ms: 5000,
      confidence: 7
    });
    const act1DecisionDuration = Date.now() - act1DecisionStart;
    if (act1DecisionResponse.status !== 200) {
      metrics.errors.push(`Act 1 decision failed: Status ${act1DecisionResponse.status}`);
      return metrics;
    }

    // 4. Get Act 2
    const act2Start = Date.now();
    const act2Response = await api.get(`/sim/${metrics.sessionId}/act/2`);
    metrics.operations.act2 = {
      success: act2Response.status === 200,
      duration: Date.now() - act2Start,
      error: act2Response.status !== 200 ? `Status: ${act2Response.status}` : undefined
    };
    if (!metrics.operations.act2.success) {
      metrics.errors.push(`Act 2 failed: ${metrics.operations.act2.error}`);
      return metrics;
    }

    // 5. Submit Act 2 decision
    const act2DecisionStart = Date.now();
    const act2DecisionResponse = await api.post(`/sim/${metrics.sessionId}/act/2/decision`, {
      option_id: 'A1',
      decision_time_ms: 6000,
      confidence: 6
    });
    if (act2DecisionResponse.status !== 200) {
      metrics.errors.push(`Act 2 decision failed: Status ${act2DecisionResponse.status}`);
      return metrics;
    }

    // 6. Get Act 3
    const act3Start = Date.now();
    const act3Response = await api.get(`/sim/${metrics.sessionId}/act/3`);
    metrics.operations.act3 = {
      success: act3Response.status === 200,
      duration: Date.now() - act3Start,
      error: act3Response.status !== 200 ? `Status: ${act3Response.status}` : undefined
    };
    if (!metrics.operations.act3.success) {
      metrics.errors.push(`Act 3 failed: ${metrics.operations.act3.error}`);
      return metrics;
    }

    // 7. Submit Act 3 decision
    const act3DecisionStart = Date.now();
    const act3DecisionResponse = await api.post(`/sim/${metrics.sessionId}/act/3/decision`, {
      option_id: 'X',
      decision_time_ms: 7000,
      confidence: 8
    });
    if (act3DecisionResponse.status !== 200) {
      metrics.errors.push(`Act 3 decision failed: Status ${act3DecisionResponse.status}`);
      return metrics;
    }

    // 8. Get Act 4
    const act4Start = Date.now();
    const act4Response = await api.get(`/sim/${metrics.sessionId}/act/4`);
    metrics.operations.act4 = {
      success: act4Response.status === 200,
      duration: Date.now() - act4Start,
      error: act4Response.status !== 200 ? `Status: ${act4Response.status}` : undefined
    };
    if (!metrics.operations.act4.success) {
      metrics.errors.push(`Act 4 failed: ${metrics.operations.act4.error}`);
      return metrics;
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;

  } catch (error: any) {
    metrics.errors.push(`Unexpected error: ${error.message}`);
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
  }

  return metrics;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

/**
 * Analyze load test results
 */
function analyzeResults(results: ParticipantMetrics[]): LoadTestResults {
  const successful = results.filter(r => r.errors.length === 0 && r.duration);
  const failed = results.filter(r => r.errors.length > 0 || !r.duration);
  
  const durations = successful.map(r => r.duration!).sort((a, b) => a - b);
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;
  
  // Collect operation durations
  const operationStats: LoadTestResults['operationStats'] = {};
  
  ['start', 'act1', 'act2', 'act3', 'act4'].forEach(op => {
    const opDurations = results
      .map(r => r.operations[op as keyof typeof r.operations])
      .filter(op => op && op.success)
      .map(op => op!.duration)
      .sort((a, b) => a - b);
    
    if (opDurations.length > 0) {
      const total = results.length;
      const successful = opDurations.length;
      const failed = total - successful;
      const avgDuration = opDurations.reduce((sum, d) => sum + d, 0) / opDurations.length;
      
      operationStats[op] = {
        total,
        successful,
        failed,
        avgDuration,
        p50: percentile(opDurations, 50),
        p95: percentile(opDurations, 95),
        p99: percentile(opDurations, 99)
      };
    }
  });
  
  return {
    totalParticipants: results.length,
    successful: successful.length,
    failed: failed.length,
    totalDuration,
    averageDuration,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    errorRate: (failed.length / results.length) * 100,
    errors: results
      .filter(r => r.errors.length > 0)
      .map(r => ({ participantId: r.participantId, error: r.errors.join('; ') })),
    operationStats
  };
}

describe('Load Test: 100 Concurrent Participants', () => {
  const NUM_PARTICIPANTS = 100;
  const MODES: Array<'C0' | 'C1' | 'C2'> = ['C0', 'C1', 'C2'];
  
  // Health check before running load test
  test('Health check', async () => {
    const response = await axios.get(HEALTH_CHECK_URL);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
  }, 10000);

  test(`Simulate ${NUM_PARTICIPANTS} concurrent participants`, async () => {
    console.log(`\n🚀 Starting load test with ${NUM_PARTICIPANTS} concurrent participants...\n`);
    
    const startTime = Date.now();
    const participantIds = Array.from({ length: NUM_PARTICIPANTS }, (_, i) => 
      `load_test_${Date.now()}_${i}`
    );
    
    // Distribute participants across modes
    const participants = participantIds.map((id, index) => ({
      id,
      mode: MODES[index % MODES.length] as 'C0' | 'C1' | 'C2'
    }));
    
    // Run all participants concurrently
    console.log('Starting all participants simultaneously...');
    const results = await Promise.allSettled(
      participants.map(p => simulateParticipant(p.id, p.mode))
    );
    
    const metrics: ParticipantMetrics[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          participantId: participants[index].id,
          startTime: Date.now(),
          errors: [`Promise rejected: ${result.reason}`],
          operations: {
            start: { success: false, duration: 0, error: result.reason?.message || 'Unknown error' }
          }
        };
      }
    });
    
    const testDuration = Date.now() - startTime;
    const analysis = analyzeResults(metrics);
    
    // Print results
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 LOAD TEST RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total Participants: ${analysis.totalParticipants}`);
    console.log(`Successful: ${analysis.successful} (${100 - analysis.errorRate.toFixed(2)}%)`);
    console.log(`Failed: ${analysis.failed} (${analysis.errorRate.toFixed(2)}%)`);
    console.log(`\nTest Duration: ${(testDuration / 1000).toFixed(2)}s`);
    console.log(`Average Participant Duration: ${(analysis.averageDuration / 1000).toFixed(2)}s`);
    console.log(`\nResponse Time Percentiles:`);
    console.log(`  P50: ${(analysis.p50 / 1000).toFixed(2)}s`);
    console.log(`  P95: ${(analysis.p95 / 1000).toFixed(2)}s`);
    console.log(`  P99: ${(analysis.p99 / 1000).toFixed(2)}s`);
    
    console.log(`\nOperation Statistics:`);
    Object.entries(analysis.operationStats).forEach(([op, stats]) => {
      console.log(`\n  ${op.toUpperCase()}:`);
      console.log(`    Success Rate: ${((stats.successful / stats.total) * 100).toFixed(2)}%`);
      console.log(`    Avg Duration: ${stats.avgDuration.toFixed(0)}ms`);
      console.log(`    P50: ${stats.p50.toFixed(0)}ms, P95: ${stats.p95.toFixed(0)}ms, P99: ${stats.p99.toFixed(0)}ms`);
    });
    
    if (analysis.errors.length > 0) {
      console.log(`\n⚠️  Errors (showing first 10):`);
      analysis.errors.slice(0, 10).forEach(({ participantId, error }) => {
        console.log(`  ${participantId}: ${error}`);
      });
      if (analysis.errors.length > 10) {
        console.log(`  ... and ${analysis.errors.length - 10} more errors`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    // Assertions
    expect(analysis.errorRate).toBeLessThan(5); // Less than 5% error rate
    expect(analysis.p95).toBeLessThan(5000); // P95 response time < 5 seconds
    expect(analysis.successful).toBeGreaterThan(NUM_PARTICIPANTS * 0.95); // At least 95% success rate
    
  }, 300000); // 5 minute timeout
});
