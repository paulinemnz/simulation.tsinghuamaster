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
    startedAt: string;
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
    version: number;
}
export interface SimulationEvent {
    timestamp: string;
    type: 'decision' | 'act_started' | 'act_completed' | 'state_sync' | 'error';
    act: ActNumber;
    payload: Record<string, any>;
}
/**
 * Deterministic branching functions
 * These MUST be pure and testable
 */
export declare function deriveAct2Branch(act1Choice: Act1Choice | null | undefined): Act2Branch | null;
export declare function deriveAct3ContextGroup(act2Choice: Act2Choice | null | undefined): Act3ContextGroup | null;
export declare function deriveAct4Track(act3Choice: Act3Choice | null | undefined): Act4Track | null;
/**
 * Rebuild state from events (event sourcing)
 */
export declare function rebuildStateFromEvents(participantId: string, sessionId: string | null, mode: SimulationMode, startedAt: string, events: SimulationEvent[]): SimulationState;
//# sourceMappingURL=simulation.types.d.ts.map