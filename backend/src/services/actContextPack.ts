import fs from 'fs/promises';
import path from 'path';
import { DecisionEventData } from '../models/DecisionEvent';
import { deriveIdentityTrackFromAct2Decision, IdentityTrack } from '../config/actConfig';

export type ActContextPack = {
  actId: 1 | 2 | 3 | 4;
  title: string;
  timeContext: string;
  firmFacts: Record<string, string | number | boolean | Array<string | number>>;
  operationalSignals?: Record<string, string | number>;
  stakeholderVoices?: Array<{ name: string; role: string; stance: string; quote: string }>;
  externalSignals?: Array<{ source: string; keyPoints: string[] }>;
  decisionOptions: Array<{ id: string; title: string; shortLabel: string; implications: string[] }>;
  constraints: string[];
  pathHistory?: { act1Choice?: string; act2Choice?: string; act3Choice?: string };
};

type ContextPackVariant =
  | 'act1'
  | 'act2A'
  | 'act2B'
  | 'act2C'
  | 'act3V1'
  | 'act3V2'
  | 'act3V3'
  | 'act4Efficiency'
  | 'act4ManagedAdaptation'
  | 'act4RelationalFoundation';

const VARIANT_FILES: Record<ContextPackVariant, string> = {
  act1: 'act1.json',
  act2A: 'act2A.json',
  act2B: 'act2B.json',
  act2C: 'act2C.json',
  act3V1: 'act3V1.json',
  act3V2: 'act3V2.json',
  act3V3: 'act3V3.json',
  act4Efficiency: 'act4Efficiency.json',
  act4ManagedAdaptation: 'act4ManagedAdaptation.json',
  act4RelationalFoundation: 'act4RelationalFoundation.json'
};

const dataDirectoryCandidates = (): string[] => [
  path.join(process.cwd(), 'backend', 'src', 'data', 'acts'),
  path.join(process.cwd(), 'src', 'data', 'acts'),
  path.join(__dirname, '..', 'data', 'acts'),
  path.join(__dirname, '../../src/data/acts')
];

const resolveDataDirectory = async (): Promise<string> => {
  for (const candidate of dataDirectoryCandidates()) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error('ActContextPack data directory not found.');
};

const loadPackFile = async (variant: ContextPackVariant): Promise<ActContextPack> => {
  const baseDir = await resolveDataDirectory();
  const filePath = path.join(baseDir, VARIANT_FILES[variant]);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as ActContextPack;
};

const inferAct1DecisionFromOptions = (optionIds: string[]): string | null => {
  if (optionIds.some(id => id.startsWith('A'))) return 'A';
  if (optionIds.some(id => id.startsWith('B'))) return 'B';
  if (optionIds.some(id => id.startsWith('C'))) return 'C';
  return null;
};

const inferAct3VariantFromScenario = (scenarioText?: string): ContextPackVariant | null => {
  if (!scenarioText) return null;
  const lower = scenarioText.toLowerCase();
  if (lower.includes('termination notice') || lower.includes('high-risk/high-cost')) {
    return 'act3V1';
  }
  if (lower.includes('cost volatility risk') || lower.includes('reduced to a data point')) {
    return 'act3V2';
  }
  if (lower.includes('15% price increase') || lower.includes('q3 profit projections')) {
    return 'act3V3';
  }
  return null;
};

const inferAct4TrackFromScenario = (scenarioText?: string): IdentityTrack | null => {
  if (!scenarioText) return null;
  if (scenarioText.includes('Discipline')) return 'Efficiency at Scale';
  if (scenarioText.includes('Stability')) return 'Managed Adaptation';
  if (scenarioText.includes('Trust')) return 'Relational Foundation';
  return null;
};

export const resolveActContextPack = async (params: {
  actNumber: number;
  previousDecisions?: DecisionEventData[];
  identityTrack?: IdentityTrack;
  previewContextPack?: { scenario_text?: string; current_decision_options?: Array<{ id: string }> };
}): Promise<ActContextPack> => {
  const { actNumber, previousDecisions, identityTrack, previewContextPack } = params;

  if (actNumber === 1) {
    return loadPackFile('act1');
  }

  if (actNumber === 2) {
    const act1Decision = previousDecisions?.find(decision => decision.act_number === 1)?.option_id
      || inferAct1DecisionFromOptions(previewContextPack?.current_decision_options?.map(option => option.id) || []);
    if (act1Decision === 'A') return loadPackFile('act2A');
    if (act1Decision === 'B') return loadPackFile('act2B');
    if (act1Decision === 'C') return loadPackFile('act2C');
    return loadPackFile('act2A');
  }

  if (actNumber === 3) {
    const act2Decision = previousDecisions?.find(decision => decision.act_number === 2)?.option_id;
    if (act2Decision === 'A1' || act2Decision === 'C3') return loadPackFile('act3V1');
    if (act2Decision === 'B1' || act2Decision === 'C2') return loadPackFile('act3V3');
    if (act2Decision) return loadPackFile('act3V2');
    const inferredVariant = inferAct3VariantFromScenario(previewContextPack?.scenario_text);
    if (inferredVariant) return loadPackFile(inferredVariant);
    return loadPackFile('act3V2');
  }

  if (actNumber === 4) {
    const act2Decision = previousDecisions?.find(decision => decision.act_number === 2)?.option_id;
    const resolvedTrack =
      identityTrack
      || inferAct4TrackFromScenario(previewContextPack?.scenario_text)
      || (act2Decision ? deriveIdentityTrackFromAct2Decision(act2Decision) : undefined)
      || 'Managed Adaptation';
    if (resolvedTrack === 'Efficiency at Scale') return loadPackFile('act4Efficiency');
    if (resolvedTrack === 'Relational Foundation') return loadPackFile('act4RelationalFoundation');
    return loadPackFile('act4ManagedAdaptation');
  }

  return loadPackFile('act1');
};
