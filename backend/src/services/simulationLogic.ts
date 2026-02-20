/**
 * Deterministic simulation branching logic
 * This file contains pure functions that compute branches from decisions.
 * NO branching logic should exist in UI components - all routing here.
 */

import {
  Act1Choice,
  Act2Choice,
  Act3Choice,
  Act2Branch,
  Act3ContextGroup,
  Act4Track,
  deriveAct2Branch,
  deriveAct3ContextGroup,
  deriveAct4Track
} from '../../shared/types/simulation.types';

/**
 * Derive Act II branch from Act I choice
 * Act I: A/B/C → Act II: A-path/B-path/C-path
 */
export function getAct2Branch(act1Choice: Act1Choice | null | undefined): Act2Branch | null {
  return deriveAct2Branch(act1Choice);
}

/**
 * Derive Act III context group from Act II choice
 * Mapping:
 * - Efficiency-first: A1, C3
 * - Balanced: A2, A3, B2, C1
 * - Tradition-first: B1, C2
 */
export function getAct3ContextGroup(act2Choice: Act2Choice | null | undefined): Act3ContextGroup | null {
  return deriveAct3ContextGroup(act2Choice);
}

/**
 * Derive Act IV track from Act III choice
 * Mapping:
 * - X → Efficiency at Scale
 * - Y → Managed Adaptation
 * - Z → Relational Foundation
 */
export function getAct4Track(act3Choice: Act3Choice | null | undefined): Act4Track | null {
  return deriveAct4Track(act3Choice);
}

/**
 * Validate decision sequence
 * Returns error message if invalid, null if valid
 */
export function validateDecisionSequence(
  actNumber: number,
  optionId: string,
  previousDecisions: { act1?: string; act2?: string; act3?: string }
): string | null {
  if (actNumber === 1) {
    if (!['A', 'B', 'C'].includes(optionId)) {
      return `Invalid Act I option: ${optionId}. Must be A, B, or C.`;
    }
  } else if (actNumber === 2) {
    if (!previousDecisions.act1) {
      return 'Cannot submit Act II: Act I must be completed first.';
    }
    const act1Choice = previousDecisions.act1 as Act1Choice;
    const validOptions = act1Choice === 'A' 
      ? ['A1', 'A2', 'A3']
      : act1Choice === 'B'
      ? ['B1', 'B2', 'B3']
      : ['C1', 'C2', 'C3'];
    if (!validOptions.includes(optionId)) {
      return `Invalid Act II option: ${optionId}. For Act I choice ${act1Choice}, valid options are: ${validOptions.join(', ')}`;
    }
  } else if (actNumber === 3) {
    if (!previousDecisions.act2) {
      return 'Cannot submit Act III: Act II must be completed first.';
    }
    if (!['X', 'Y', 'Z'].includes(optionId)) {
      return `Invalid Act III option: ${optionId}. Must be X, Y, or Z.`;
    }
  } else if (actNumber === 4) {
    if (!previousDecisions.act3) {
      return 'Cannot submit Act IV: Act III must be completed first.';
    }
    if (!['Innovation', 'Ecosystem', 'Efficiency'].includes(optionId)) {
      return `Invalid Act IV option: ${optionId}. Must be Innovation, Ecosystem, or Efficiency.`;
    }
  }
  
  return null;
}
