import type {
  ParticipantRecord,
  DecisionRecord,
  MemoRecord,
  ChatRecord,
  EventRecord,
  RatingRecord,
  ComputedScoreRecord
} from './analysisData';
import {
  summarizeByGroup,
  buildDesignMatrix,
  olsRegression,
  bootstrapIndirectEffect,
  chiSquareTest,
  oneWayAnova
} from './statsEngine';
import { sampleCorrelation } from 'simple-statistics';

const buildParticipantRow = (
  participant: ParticipantRecord,
  computed: ComputedScoreRecord | null
) => {
  const mode = participant.mode || participant.session_mode || 'C0';
  const llm = mode === 'C1' ? 1 : 0;
  const agentic = mode === 'C2' ? 1 : 0;
  const start = participant.started_at || participant.session_started_at;
  const end = participant.completed_at || participant.session_completed_at;
  const durationMs = start && end ? new Date(end).getTime() - new Date(start).getTime() : null;
  const covariates = participant.covariates || {};

  return {
    participant_id: participant.id,
    mode,
    llm,
    agentic,
    vq_act1: computed?.vq_act1 ?? null,
    vq_act4: computed?.vq_act4 ?? null,
    hq_act4: computed?.hq_act4 ?? null,
    reflexivity_r: computed?.reflexivity_r ?? null,
    short_circuit_s: computed?.short_circuit_s ?? null,
    posttask_vq: computed?.posttask_vq ?? null,
    posttask_hq: computed?.posttask_hq ?? null,
    time_on_task_ms: durationMs,
    time_on_task_min: durationMs !== null ? durationMs / 60000 : null,
    ...covariates
  };
};

const buildInterpretation = (label: string, beta: number, p: number) => {
  const direction = beta > 0 ? 'positive' : beta < 0 ? 'negative' : 'neutral';
  const signif = p < 0.05 ? 'statistically significant' : 'not statistically significant';
  return `${label} shows a ${direction} association with the outcome and is ${signif} (p=${p.toFixed(
    3
  )}).`;
};

const buildEquation = (outcome: string, predictors: string[]) =>
  `${outcome} = β0 + ${predictors.map((p, idx) => `β${idx + 1}${p}`).join(' + ')} + ε`;

const buildTable = (result: ReturnType<typeof olsRegression>) => ({
  coefficients: result.coefficients,
  r2: result.r2,
  n: result.n
});

const correlationMatrix = (rows: Array<Record<string, any>>, vars: string[]) => {
  const matrix: Record<string, Record<string, number | null>> = {};
  vars.forEach(rowVar => {
    matrix[rowVar] = {};
    vars.forEach(colVar => {
      const values = rows
        .map(row => ({ x: Number(row[rowVar]), y: Number(row[colVar]) }))
        .filter(pair => Number.isFinite(pair.x) && Number.isFinite(pair.y));
      if (!values.length) {
        matrix[rowVar][colVar] = null;
        return;
      }
      const xVals = values.map(v => v.x);
      const yVals = values.map(v => v.y);
      matrix[rowVar][colVar] = sampleCorrelation(xVals, yVals);
    });
  });
  return matrix;
};

const buildControls = (rows: Array<Record<string, any>>, exclude: string[]) => {
  const sample = rows[0] || {};
  return Object.keys(sample).filter(
    key => !exclude.includes(key) && typeof sample[key] === 'number' && !Number.isNaN(sample[key])
  );
};

export const buildAnalytics = (params: {
  participants: ParticipantRecord[];
  computedScores: ComputedScoreRecord[];
}) => {
  const { participants, computedScores } = params;
  const computedMap = new Map(computedScores.map(score => [score.participant_id, score]));
  const rows = participants.map(participant => buildParticipantRow(participant, computedMap.get(participant.id) || null));

  const metrics = ['vq_act1', 'vq_act4', 'hq_act4', 'reflexivity_r', 'short_circuit_s', 'time_on_task_min'];
  const descriptive = summarizeByGroup(rows, 'mode', metrics);
  const pooled = summarizeByGroup(rows, 'mode', metrics).reduce((acc, row) => {
    acc.total = (acc.total || 0) + row.n;
    return acc;
  }, {} as Record<string, any>);

  const correlationVars = ['vq_act1', 'vq_act4', 'hq_act4', 'reflexivity_r', 'short_circuit_s', 'time_on_task_min'];
  const correlations = correlationMatrix(rows, correlationVars);

  const controls = buildControls(rows, [
    'participant_id',
    'mode',
    'llm',
    'agentic',
    'vq_act1',
    'vq_act4',
    'hq_act4',
    'reflexivity_r',
    'short_circuit_s',
    'posttask_vq',
    'posttask_hq',
    'time_on_task_ms',
    'time_on_task_min'
  ]);

  const balanceChecks = (() => {
    const exclude = new Set([
      'participant_id',
      'mode',
      'llm',
      'agentic',
      'vq_act1',
      'vq_act4',
      'hq_act4',
      'reflexivity_r',
      'short_circuit_s',
      'posttask_vq',
      'posttask_hq',
      'time_on_task_ms',
      'time_on_task_min'
    ]);

    const keys = Array.from(
      rows.reduce<Set<string>>((acc, row) => {
        Object.keys(row).forEach(key => acc.add(key));
        return acc;
      }, new Set<string>())
    ).filter(key => !exclude.has(key));

    const numeric: any[] = [];
    const categorical: any[] = [];

    keys.forEach(key => {
      const values = rows.map(row => row[key]).filter(v => v !== null && v !== undefined);
      if (!values.length) return;
      const isNumeric = values.every(v => typeof v === 'number' && !Number.isNaN(v));
      const isCategorical = values.every(v => typeof v === 'string' || typeof v === 'boolean');
      if (isNumeric) {
        const groups = rows.reduce<Record<string, number[]>>((acc, row) => {
          const mode = row.mode || 'unknown';
          if (!acc[mode]) acc[mode] = [];
          if (typeof row[key] === 'number' && !Number.isNaN(row[key])) {
            acc[mode].push(row[key]);
          }
          return acc;
        }, {});
        const anova = oneWayAnova(groups);
        numeric.push({
          variable: key,
          means: Object.fromEntries(
            Object.entries(groups).map(([mode, vals]) => [
              mode,
              vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
            ])
          ),
          anova
        });
      } else if (isCategorical) {
        const categories = Array.from(new Set(values.map(String)));
        const modes = Array.from(new Set(rows.map(r => r.mode || 'unknown')));
        const table = modes.map(mode =>
          categories.map(cat =>
            rows.filter(row => (row.mode || 'unknown') === mode && String(row[key]) === cat).length
          )
        );
        const chi2 = chiSquareTest(table);
        categorical.push({
          variable: key,
          categories,
          modes,
          table,
          chi2
        });
      }
    });

    return { numeric, categorical };
  })();

  const h1aPredictors = ['llm', 'agentic', ...controls];
  const h1aAct1 = olsRegression(buildDesignMatrix(rows, 'vq_act1', h1aPredictors));
  const h1aAct4 = olsRegression(buildDesignMatrix(rows, 'vq_act4', h1aPredictors));

  const h1bPredictors = ['llm', 'agentic', ...controls];
  const h1b = olsRegression(buildDesignMatrix(rows, 'hq_act4', h1bPredictors));

  const h2Predictors = ['llm', 'agentic', 'reflexivity_r', 'llm_r', 'agentic_r', ...controls];
  const rowsWithInteractions = rows.map(row => ({
    ...row,
    llm_r: row.llm * (row.reflexivity_r ?? 0),
    agentic_r: row.agentic * (row.reflexivity_r ?? 0)
  }));
  const h2VQ = olsRegression(buildDesignMatrix(rowsWithInteractions, 'vq_act4', h2Predictors));
  const h2HQ = olsRegression(buildDesignMatrix(rowsWithInteractions, 'hq_act4', h2Predictors));

  const rValues = rows.map(row => row.reflexivity_r).filter((v): v is number => typeof v === 'number');
  const rMean = rValues.length ? rValues.reduce((s, v) => s + v, 0) / rValues.length : 0;
  const rStd = rValues.length
    ? Math.sqrt(rValues.reduce((s, v) => s + Math.pow(v - rMean, 2), 0) / rValues.length)
    : 1;
  const rLevels = [rMean - rStd, rMean + rStd];
  const controlMeans = controls.reduce<Record<string, number>>((acc, key) => {
    const values = rows.map(row => row[key]).filter((v): v is number => typeof v === 'number');
    acc[key] = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return acc;
  }, {});

  const buildInteractionPoints = (model: ReturnType<typeof olsRegression>) => {
    const coeffMap = model.coefficients.reduce<Record<string, number>>((acc, coef) => {
      acc[coef.name] = coef.beta;
      return acc;
    }, {});

    const predict = (llm: number, agentic: number, r: number) => {
      const base = {
        llm,
        agentic,
        reflexivity_r: r,
        llm_r: llm * r,
        agentic_r: agentic * r,
        ...controlMeans
      };
      return Object.entries(base).reduce((sum, [key, value]) => {
        return sum + (coeffMap[key] || 0) * value;
      }, coeffMap.Intercept || 0);
    };

    return [
      { mode: 'C0', values: rLevels.map(r => ({ r, y: predict(0, 0, r) })) },
      { mode: 'C1', values: rLevels.map(r => ({ r, y: predict(1, 0, r) })) },
      { mode: 'C2', values: rLevels.map(r => ({ r, y: predict(0, 1, r) })) }
    ];
  };

  const h3MediatorPredictors = ['reflexivity_r', 'llm', 'agentic', ...controls];
  const h3Mediator = olsRegression(buildDesignMatrix(rows, 'short_circuit_s', h3MediatorPredictors));
  const h3Outcome = olsRegression(buildDesignMatrix(rows, 'vq_act4', ['short_circuit_s', ...h3MediatorPredictors]));
  const h3Bootstrap = bootstrapIndirectEffect(rows, h3MediatorPredictors, 'short_circuit_s', 'vq_act4', 500);

  const h4Available = rows.some(row => row.posttask_vq !== null);
  const h4 = h4Available
    ? olsRegression(buildDesignMatrix(rows, 'posttask_vq', ['llm', 'agentic', 'reflexivity_r', 'llm_r', 'agentic_r', ...controls]))
    : null;

  return {
    descriptive,
    pooled,
    correlations,
    balanceChecks,
    controls,
    hypotheses: {
      h1a: {
        equation: buildEquation('VQ_act1 / VQ_act4', h1aPredictors),
        act1: buildTable(h1aAct1),
        act4: buildTable(h1aAct4),
        interpretation: buildInterpretation('LLM', h1aAct4.coefficients[1].beta, h1aAct4.coefficients[1].p)
      },
      h1b: {
        equation: buildEquation('HQ_act4', h1bPredictors),
        model: buildTable(h1b),
        interpretation: buildInterpretation('Agentic', h1b.coefficients[2].beta, h1b.coefficients[2].p)
      },
      h2: {
        equation: buildEquation('VQ_act4 / HQ_act4', h2Predictors),
        vq: buildTable(h2VQ),
        hq: buildTable(h2HQ),
        interactionPlots: {
          rLevels,
          vq: buildInteractionPoints(h2VQ),
          hq: buildInteractionPoints(h2HQ)
        }
      },
      h3: {
        equation: {
          a: buildEquation('S', h3MediatorPredictors),
          b: buildEquation('VQ_act4', ['S', ...h3MediatorPredictors])
        },
        mediator: buildTable(h3Mediator),
        outcome: buildTable(h3Outcome),
        indirect: {
          ciLow: h3Bootstrap.ciLow,
          ciHigh: h3Bootstrap.ciHigh
        }
      },
      h4: h4Available
        ? {
            equation: buildEquation('PostTask_VQ', ['llm', 'agentic', 'reflexivity_r', 'llm_r', 'agentic_r', ...controls]),
            model: buildTable(h4!)
          }
        : { message: 'H4 not testable with current dataset.' }
    }
  };
};

export const buildAnalysisRows = (params: {
  participants: ParticipantRecord[];
  computedScores: ComputedScoreRecord[];
}) => {
  const { participants, computedScores } = params;
  const computedMap = new Map(computedScores.map(score => [score.participant_id, score]));
  return participants.map(participant => buildParticipantRow(participant, computedMap.get(participant.id) || null));
};
