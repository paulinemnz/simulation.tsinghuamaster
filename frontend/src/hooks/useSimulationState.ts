/**
 * Centralized simulation state management hook
 * Provides single source of truth with 2-layer persistence
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  SimulationState,
  SimulationEvent,
  rebuildStateFromEvents,
  ActNumber,
  Act1Choice,
  Act2Choice,
  Act3Choice,
  Act4Choice
} from '../types/simulation.types';

const STORAGE_KEY_PREFIX = 'simulation_state_';

interface UseSimulationStateReturn {
  state: SimulationState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateDecision: (act: ActNumber, optionId: string) => Promise<void>;
  syncToServer: () => Promise<void>;
}

/**
 * Get localStorage key for a session
 */
function getStorageKey(sessionId: string | null): string {
  return sessionId ? `${STORAGE_KEY_PREFIX}${sessionId}` : `${STORAGE_KEY_PREFIX}preview`;
}

/**
 * Load state from localStorage
 */
function loadStateFromLocalStorage(sessionId: string | null): SimulationState | null {
  try {
    const key = getStorageKey(sessionId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimulationState;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save state to localStorage
 */
function saveStateToLocalStorage(sessionId: string | null, state: SimulationState): void {
  try {
    const key = getStorageKey(sessionId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
}

/**
 * Load state from server
 */
async function loadStateFromServer(sessionId: string): Promise<SimulationState | null> {
  try {
    const response = await api.get(`/sim/${sessionId}/state`);
    if (response.data.status === 'success') {
      return response.data.data.state as SimulationState;
    }
    return null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Hook for managing simulation state
 */
export function useSimulationState(
  participantId: string,
  sessionId: string | null,
  mode: 'C0' | 'C1' | 'C2'
): UseSimulationStateReturn {
  const [state, setState] = useState<SimulationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load state with 2-layer persistence:
   * 1. Try server first
   * 2. Fallback to localStorage
   * 3. Create new state if neither exists
   */
  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let loadedState: SimulationState | null = null;

      // Layer A: Try server first
      if (sessionId && sessionId !== 'preview') {
        try {
          loadedState = await loadStateFromServer(sessionId);
        } catch (serverError: any) {
          console.warn('Server load failed, trying localStorage:', serverError);
          // Fallback to localStorage
          loadedState = loadStateFromLocalStorage(sessionId);
        }
      } else {
        // Preview mode: clear existing state first, then create fresh state
        // This ensures each preview session starts clean
        const previewKey = getStorageKey(null);
        localStorage.removeItem(previewKey);
        // Also clear any preview cache keys
        const previewCacheKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('preview-act-') || 
          key.startsWith('c2Justification:preview:')
        );
        previewCacheKeys.forEach(key => localStorage.removeItem(key));
        // Don't load old state - always start fresh in preview
        loadedState = null;
      }

      // Layer B: Fallback to localStorage if server failed
      if (!loadedState && sessionId && sessionId !== 'preview') {
        loadedState = loadStateFromLocalStorage(sessionId);
      }

      // Create new state if nothing found
      if (!loadedState) {
        loadedState = {
          participantId,
          sessionId,
          mode,
          startedAt: new Date().toISOString(),
          currentAct: 1,
          decisions: {},
          derived: {
            act2Branch: null,
            act3ContextGroup: null,
            act4Track: null
          },
          events: [],
          version: 1
        };
      }

      setState(loadedState);
      // Save to localStorage as backup
      saveStateToLocalStorage(sessionId, loadedState);
    } catch (err: any) {
      setError(err.message || 'Failed to load simulation state');
      console.error('Error loading simulation state:', err);
    } finally {
      setLoading(false);
    }
  }, [participantId, sessionId, mode]);

  /**
   * Refresh state from server
   */
  const refresh = useCallback(async () => {
    await loadState();
  }, [loadState]);

  /**
   * Update decision and rebuild state
   */
  const updateDecision = useCallback(async (
    act: ActNumber,
    optionId: string
  ) => {
    if (!state) return;

    // Create decision event
    const event: SimulationEvent = {
      timestamp: new Date().toISOString(),
      type: 'decision',
      act,
      payload: { optionId }
    };

    // Add event to state
    const updatedEvents = [...state.events, event];

    // Rebuild state from events (this will automatically compute derived state)
    const updatedState = rebuildStateFromEvents(
      state.participantId,
      state.sessionId,
      state.mode,
      state.startedAt,
      updatedEvents
    );

    setState(updatedState);
    saveStateToLocalStorage(sessionId, updatedState);

    // Sync to server in background
    if (sessionId && sessionId !== 'preview') {
      syncToServer(updatedState).catch(err => {
        console.warn('Background sync failed:', err);
      });
    }
  }, [state, sessionId]);

  /**
   * Sync state to server
   */
  const syncToServer = useCallback(async (stateToSync?: SimulationState) => {
    const stateToSave = stateToSync || state;
    if (!stateToSave || !sessionId || sessionId === 'preview') {
      return;
    }

    try {
      await api.post(`/sim/${sessionId}/state/snapshot`, {
        stateSnapshot: stateToSave
      });
    } catch (err: any) {
      console.warn('Failed to sync state to server:', err);
      // Don't throw - localStorage backup is sufficient
    }
  }, [state, sessionId]);

  // Load state on mount and when dependencies change
  useEffect(() => {
    loadState();
  }, [loadState]);

  return {
    state,
    loading,
    error,
    refresh,
    updateDecision,
    syncToServer
  };
}
