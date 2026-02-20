/**
 * Debug HUD component
 * Shows simulation state information in dev mode
 * Toggle with ?debug=1 query parameter
 */

import React, { useState, useEffect } from 'react';
import { useSimulationState } from '../../hooks/useSimulationState';
import { useParams } from 'react-router-dom';

const DebugHUD: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { sessionId } = useParams<{ sessionId: string }>();
  
  // Get participant info
  const participantId = localStorage.getItem('participantId') || '';
  const mode = (localStorage.getItem('simulationMode') as 'C0' | 'C1' | 'C2') || 'C0';
  
  const { state } = useSimulationState(participantId, sessionId || null, mode);

  useEffect(() => {
    // Check for ?debug=1 in URL - only show when explicitly requested
    const params = new URLSearchParams(window.location.search);
    const debugParam = params.get('debug');
    setIsVisible(debugParam === '1');
  }, []);

  if (!isVisible || !state) return null;

  const stateSource = sessionId && sessionId !== 'preview' ? 'database' : 'localStorage';

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#0f0',
        padding: '1rem',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 10000,
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '1px solid #0f0'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <strong>DEBUG HUD</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: '1px solid #0f0',
            color: '#0f0',
            cursor: 'pointer',
            padding: '2px 6px'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Participant ID:</strong> {state.participantId || 'N/A'}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Mode:</strong> {state.mode}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Session ID:</strong> {state.sessionId || 'preview'}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Current Act:</strong> {state.currentAct}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Decisions:</strong>
        <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
          <li>Act I: {state.decisions.act1 || '—'}</li>
          <li>Act II: {state.decisions.act2 || '—'}</li>
          <li>Act III: {state.decisions.act3 || '—'}</li>
          <li>Act IV: {state.decisions.act4 || '—'}</li>
        </ul>
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Derived Branches:</strong>
        <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
          <li>Act II Branch: {state.derived.act2Branch || '—'}</li>
          <li>Act III Context: {state.derived.act3ContextGroup || '—'}</li>
          <li>Act IV Track: {state.derived.act4Track || '—'}</li>
        </ul>
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>State Source:</strong> {stateSource}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Events:</strong> {state.events.length}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Started At:</strong> {new Date(state.startedAt).toLocaleString()}
      </div>
      
      <div style={{ marginTop: '0.5rem', fontSize: '10px', color: '#888' }}>
        Toggle with ?debug=1
      </div>
    </div>
  );
};

export default DebugHUD;
