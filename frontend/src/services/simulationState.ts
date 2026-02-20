export type SimulationMode = 'real' | 'preview';
export type IdentityTrack = 'Efficiency at Scale' | 'Managed Adaptation' | 'Relational Foundation';

export interface SimulationState {
  participantId: string;
  sessionId: string | null;
  mode: SimulationMode;
  currentAct: number;
  actDecisions: {
    act1Decision: string | null;
    act2Decision: string | null;
    act3Decision: string | null;
    act4Decision: string | null;
  };
  derivedIdentityTrack: IdentityTrack | null;
}

const STORAGE_KEY = 'simulationState';

const defaultState: SimulationState = {
  participantId: '',
  sessionId: null,
  mode: 'real',
  currentAct: 1,
  actDecisions: {
    act1Decision: null,
    act2Decision: null,
    act3Decision: null,
    act4Decision: null
  },
  derivedIdentityTrack: null
};

const normalizeState = (state: Partial<SimulationState> | null): SimulationState => {
  const next: SimulationState = {
    ...defaultState,
    ...state,
    actDecisions: {
      ...defaultState.actDecisions,
      ...(state?.actDecisions || {})
    }
  };

  if (!Number.isFinite(next.currentAct) || next.currentAct < 1 || next.currentAct > 4) {
    next.currentAct = 1;
  }

  if (next.mode !== 'real' && next.mode !== 'preview') {
    next.mode = 'real';
  }

  return next;
};

export const loadSimulationState = (): SimulationState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultState };
    }
    const parsed = JSON.parse(raw) as Partial<SimulationState>;
    return normalizeState(parsed);
  } catch {
    return { ...defaultState };
  }
};

export const saveSimulationState = (state: SimulationState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage failures should not crash the app.
  }
};

type SimulationStateUpdate = Omit<Partial<SimulationState>, 'actDecisions'> & {
  actDecisions?: Partial<SimulationState['actDecisions']>;
};

export const updateSimulationState = (updates: SimulationStateUpdate) => {
  const current = loadSimulationState();
  const next = normalizeState({
    ...current,
    ...updates,
    actDecisions: {
      ...current.actDecisions,
      ...(updates.actDecisions || {})
    }
  });
  saveSimulationState(next);
  return next;
};

export const resetSimulationState = (overrides?: Partial<SimulationState>) => {
  const next = normalizeState({
    ...defaultState,
    ...overrides
  });
  saveSimulationState(next);
  return next;
};
