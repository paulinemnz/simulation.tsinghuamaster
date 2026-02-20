"use strict";
/**
 * Core simulation types - shared between frontend and backend
 * This defines the contract for the 4-act simulation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveAct2Branch = deriveAct2Branch;
exports.deriveAct3ContextGroup = deriveAct3ContextGroup;
exports.deriveAct4Track = deriveAct4Track;
exports.rebuildStateFromEvents = rebuildStateFromEvents;
/**
 * Deterministic branching functions
 * These MUST be pure and testable
 */
function deriveAct2Branch(act1Choice) {
    if (!act1Choice)
        return null;
    return act1Choice; // Act I choice directly determines Act II branch
}
function deriveAct3ContextGroup(act2Choice) {
    if (!act2Choice)
        return null;
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
function deriveAct4Track(act3Choice) {
    if (!act3Choice)
        return null;
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
function rebuildStateFromEvents(participantId, sessionId, mode, startedAt, events) {
    const state = {
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
    const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (const event of sortedEvents) {
        if (event.type === 'decision') {
            const act = event.act;
            const optionId = event.payload.optionId;
            if (act === 1 && ['A', 'B', 'C'].includes(optionId)) {
                state.decisions.act1 = optionId;
                state.currentAct = 2;
                state.derived.act2Branch = deriveAct2Branch(optionId);
            }
            else if (act === 2 && ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].includes(optionId)) {
                state.decisions.act2 = optionId;
                state.currentAct = 3;
                state.derived.act3ContextGroup = deriveAct3ContextGroup(optionId);
            }
            else if (act === 3 && ['X', 'Y', 'Z'].includes(optionId)) {
                state.decisions.act3 = optionId;
                state.currentAct = 4;
                state.derived.act4Track = deriveAct4Track(optionId);
            }
            else if (act === 4 && ['Innovation', 'Ecosystem', 'Efficiency'].includes(optionId)) {
                state.decisions.act4 = optionId;
                state.currentAct = 4; // Stay at 4, simulation complete
            }
        }
        else if (event.type === 'act_started') {
            // Track act progression
            if (event.act > state.currentAct) {
                state.currentAct = event.act;
            }
        }
        state.events.push(event);
    }
    return state;
}
//# sourceMappingURL=simulation.types.js.map