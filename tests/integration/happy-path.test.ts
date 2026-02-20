/**
 * Integration test for the happy path:
 * Landing → Start → Act 1 → Save decision → Act 2 loads correct branch → Act 3 → Act 4 → Refresh preserves state
 * 
 * Run with: npm test -- tests/integration/happy-path.test.ts
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';
const TEST_PARTICIPANT_ID = `test_${Date.now()}`;
const TEST_MODE = 'C0';

describe('Happy Path Integration Test', () => {
  let sessionId: string;

  test('1. Health check', async () => {
    const response = await axios.get(`${API_BASE.replace('/api', '')}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
  });

  test('2. Start simulation', async () => {
    const response = await axios.post(`${API_BASE}/simulations/start-with-mode`, {
      participant_id: TEST_PARTICIPANT_ID,
      mode: TEST_MODE
    });

    expect(response.status).toBe(201);
    expect(response.data.ok).toBe(true);
    expect(response.data.sessionId).toBeDefined();
    expect(typeof response.data.sessionId).toBe('string');
    
    sessionId = response.data.sessionId;
    console.log(`Session created: ${sessionId}`);
  });

  test('3. Get session state', async () => {
    const response = await axios.get(`${API_BASE}/sim/${sessionId}/state`);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.state.currentAct).toBe(1);
    expect(response.data.data.state.sessionId).toBe(sessionId);
  });

  test('4. Load Act 1', async () => {
    const response = await axios.get(`${API_BASE}/sim/${sessionId}/act/1`);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.act).toBeDefined();
    expect(response.data.data.act.actNumber).toBe(1);
    expect(response.data.data.isCompleted).toBe(false);
  });

  test('5. Submit Act 1 decision', async () => {
    const response = await axios.post(`${API_BASE}/sim/${sessionId}/act/1/decision`, {
      option_id: 'A',
      decision_time_ms: 5000,
      confidence: 7
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.nextAct).toBe(2);
  });

  test('6. Load Act 2 with correct branch (A)', async () => {
    const response = await axios.get(`${API_BASE}/sim/${sessionId}/act/2`);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.act).toBeDefined();
    expect(response.data.data.act.actNumber).toBe(2);
    // Act 2 should show content based on Act 1 decision A
  });

  test('7. Submit Act 2 decision', async () => {
    const response = await axios.post(`${API_BASE}/sim/${sessionId}/act/2/decision`, {
      option_id: 'A1', // Example option for Act 2
      decision_time_ms: 6000,
      confidence: 6
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.nextAct).toBe(3);
  });

  test('8. Load Act 3 with correct context', async () => {
    const response = await axios.get(`${API_BASE}/sim/${sessionId}/act/3`);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.act).toBeDefined();
    expect(response.data.data.act.actNumber).toBe(3);
  });

  test('9. Submit Act 3 decision', async () => {
    const response = await axios.post(`${API_BASE}/sim/${sessionId}/act/3/decision`, {
      option_id: 'X', // Example option
      decision_time_ms: 7000,
      confidence: 8
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.nextAct).toBe(4);
  });

  test('10. Load Act 4', async () => {
    const response = await axios.get(`${API_BASE}/sim/${sessionId}/act/4`);
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    expect(response.data.data.act).toBeDefined();
    expect(response.data.data.act.actNumber).toBe(4);
  });

  test('11. Refresh preserves state - reload Act 2', async () => {
    const response = await axios.get(`${API_BASE}/sim/${sessionId}/act/2`);
    
    expect(response.status).toBe(200);
    expect(response.data.data.isCompleted).toBe(true);
    expect(response.data.data.decision).toBeDefined();
    expect(response.data.data.decision.option_id).toBe('A1');
  });

  test('12. Session state persists after refresh', async () => {
    const response = await axios.get(`${API_BASE}/sim/${sessionId}/state`);
    
    expect(response.status).toBe(200);
    expect(response.data.data.state.currentAct).toBe(4);
    expect(response.data.data.state.actDecisions.act1Decision).toBe('A');
    expect(response.data.data.state.actDecisions.act2Decision).toBe('A1');
    expect(response.data.data.state.actDecisions.act3Decision).toBe('X');
  });
});
