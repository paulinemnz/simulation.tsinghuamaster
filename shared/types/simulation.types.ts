/**
 * Core simulation types - shared between frontend and backend
 * This defines the contract for the 4-act simulation
 */

export type SimulationMode = 'C0' | 'C1' | 'C2';
export type ActNumber = 1 | 2 | 3 | 4;
export type Act1Choice = 'A' | 'B' | 'C';
export type Act2Choice = 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3';
export type Act3Choice = 'X' | 'Y' | 'Z';
export type Act4Choice = 'Innovation' | 'Ecosystem' | 'Efficiency';
export type Act2Branch = 'A' | 'B' | 'C';
export type Act3ContextGroup = 'EFFICIENCY_FIRST' | 'BALANCED' | 'TRADITION_FIRST';
export type Act4Track = 'Efficiency at Scale' | 'Managed Adaptation' | 'Relational Foundation';

export interface SimulationState {
  participantId: string;
  sessionId: string | null;
  mode: SimulationMode;
  startedAt: string; // ISO string
  currentAct: ActNumber;
  decisions: {
    act1?: Act1Choice;
    act2?: Act2Choice;
    act3?: Act3Choice;
    act4?: Act4Choice;
  };
  derived: {
    act2Branch: Act2Branch | null;
    act3ContextGroup: Act3ContextGroup | null;
    act4Track: Act4Track | null;
  };
  events: SimulationEvent[];
  version: number; // For migrations
}

export interface SimulationEvent {
  timestamp: string; // ISO string
  type: 'decision' | 'act_started' | 'act_completed' | 'state_sync' | 'error';
  act: ActNumber;
  payload: Record<string, any>;
}

/**
 * Deterministic branching functions
 * These MUST be pure and testable
 */
export function deriveAct2Branch(act1Choice: Act1Choice | null | undefined): Act2Branch | null {
  if (!act1Choice) return null;
  return act1Choice; // Act I choice directly determines Act II branch
}

export function deriveAct3ContextGroup(act2Choice: Act2Choice | null | undefined): Act3ContextGroup | null {
  if (!act2Choice) return null;
  const normalized = act2Choice.toUpperCase();
  
  // Efficiency-first: A1, C3
  if (normalized === 'A1' || normalized === 'C3') {
    return 'EFFICIENCY_FIRST';
  }
  
  // Tradition-first: B1, C2
  if (normalized === 'B1' || normalized === 'C2') {
    return 'TRADITION_FIRST';
  }
  
  // Balanced: A2, A3, B2, C1
  if (['A2', 'A3', 'B2', 'C1'].includes(normalized)) {
    return 'BALANCED';
  }
  
  return null;
}

export function deriveAct4Track(act3Choice: Act3Choice | null | undefined): Act4Track | null {
  if (!act3Choice) return null;
  const normalized = act3Choice.toUpperCase();
  
  // X → Efficiency at Scale
  if (normalized === 'X') {
    return 'Efficiency at Scale';
  }
  
  // Y → Managed Adaptation
  if (normalized === 'Y') {
    return 'Managed Adaptation';
  }
  
  // Z → Relational Foundation
  if (normalized === 'Z') {
    return 'Relational Foundation';
  }
  
  return null;
}

/**
 * Rebuild state from events (event sourcing)
 */
export function rebuildStateFromEvents(
  participantId: string,
  sessionId: string | null,
  mode: SimulationMode,
  startedAt: string,
  events: SimulationEvent[]
): SimulationState {
  const state: SimulationState = {
    participantId,
    sessionId,
    mode,
    startedAt,
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
  
  // Process events in chronological order
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  for (const event of sortedEvents) {
    if (event.type === 'decision') {
      const act = event.act;
      const optionId = event.payload.optionId as string;
      
      if (act === 1 && ['A', 'B', 'C'].includes(optionId)) {
        state.decisions.act1 = optionId as Act1Choice;
        state.currentAct = 2;
        state.derived.act2Branch = deriveAct2Branch(optionId as Act1Choice);
      } else if (act === 2 && ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].includes(optionId)) {
        state.decisions.act2 = optionId as Act2Choice;
        state.currentAct = 3;
        state.derived.act3ContextGroup = deriveAct3ContextGroup(optionId as Act2Choice);
      } else if (act === 3 && ['X', 'Y', 'Z'].includes(optionId)) {
        state.decisions.act3 = optionId as Act3Choice;
        state.currentAct = 4;
        state.derived.act4Track = deriveAct4Track(optionId as Act3Choice);
      } else if (act === 4 && ['Innovation', 'Ecosystem', 'Efficiency'].includes(optionId)) {
        state.decisions.act4 = optionId as Act4Choice;
        state.currentAct = 4; // Stay at 4, simulation complete
      }
    } else if (event.type === 'act_started') {
      // Track act progression
      if (event.act > state.currentAct) {
        state.currentAct = event.act;
      }
    }
    
    state.events.push(event);
  }
  
  return state;
}
