import { create, all } from 'mathjs';

const math = create(all, {});

export interface RegressionResult {
  coefficients: Array<{
    name: string;
    beta: number;
    se: number;
    t: number;
    p: number;
    ciLow: number;
    ciHigh: number;
  }>;
  r2: number;
  n: number;
  df: number;
}

export interface DesignMatrix {
  y: number[];
  X: number[][];
  names: string[];
}

export interface ChiSquareResult {
  chi2: number;
  df: number;
  p: number;
}

export interface AnovaResult {
  f: number;
  df1: number;
  df2: number;
  p: number;
}

export const summarizeByGroup = (
  rows: Array<Record<string, any>>,
  groupVar: string,
  metrics: string[]
) => {
  const groups: Record<string, Array<Record<string, any>>> = {};
  rows.forEach(row => {
    const key = String(row[groupVar] ?? 'unknown');
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  return Object.entries(groups).map(([group, items]) => {
    const summary: Record<string, any> = { group, n: items.length };
    metrics.forEach(metric => {
      const values = items.map(item => Number(item[metric])).filter(v => !Number.isNaN(v));
      const mean = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
      const variance = values.length
        ? values.reduce((s, v) => s + Math.pow(v - (mean || 0), 2), 0) / values.length
        : null;
      summary[`${metric}_mean`] = mean;
      summary[`${metric}_sd`] = variance !== null ? Math.sqrt(variance) : null;
    });
    return summary;
  });
};

const normalCdf = (x: number) => 0.5 * (1 + math.erf(x / Math.sqrt(2)));

const chiSquareCdf = (x: number, df: number) => {
  try {
    if (typeof (math as any).gammainc === 'function') {
      const lower = (math as any).gammainc(x / 2, df / 2, true);
      return Number(lower);
    }
  } catch {
    // fall through
  }
  return normalCdf((x - df) / Math.sqrt(2 * df));
};

const fCdf = (x: number, df1: number, df2: number) => {
  try {
    if (typeof (math as any).betainc === 'function') {
      const z = (df1 * x) / (df1 * x + df2);
      const value = (math as any).betainc(z, df1 / 2, df2 / 2);
      return Number(value);
    }
  } catch {
    // fall through
  }
  return normalCdf((Math.log(x) - 0) / 1);
};

export const olsRegression = (design: DesignMatrix, robust = false): RegressionResult => {
  const { X, y, names } = design;
  const n = y.length;
  const k = X[0]?.length || 0;
  const Xmat = math.matrix(X);
  const ymat = math.matrix(y);
  const Xt = math.transpose(Xmat);
  const XtX = math.multiply(Xt, Xmat) as any;
  const XtXInv = math.inv(XtX) as any;
  const XtY = math.multiply(Xt, ymat) as any;
  const betaMat = math.multiply(XtXInv, XtY) as any;
  const betas = betaMat.toArray() as number[];

  const yHat = math.multiply(Xmat, betaMat) as any;
  const residuals = math.subtract(ymat, yHat) as any;
  const residualArray = residuals.toArray() as number[];

  const sse = residualArray.reduce((s, r) => s + r * r, 0);
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  const sst = y.reduce((s, v) => s + Math.pow(v - meanY, 2), 0);
  const r2 = sst === 0 ? 0 : 1 - sse / sst;
  const df = n - k;

  let varBeta: number[][];
  if (!robust) {
    const sigma2 = sse / df;
    varBeta = math.multiply(XtXInv, sigma2) as any;
  } else {
    const hat = math.multiply(math.multiply(Xmat, XtXInv), Xt) as any;
    const hDiag = math.diag(hat) as any;
    const hArr = hDiag.toArray() as number[];
    const weights = residualArray.map((res, i) => {
      const denom = Math.max(1e-6, 1 - hArr[i]);
      return (res * res) / (denom * denom);
    });
    const W = math.diag(weights) as any;
    const XtW = math.multiply(Xt, W) as any;
    varBeta = math.multiply(math.multiply(XtXInv, XtW), math.transpose(XtXInv)) as any;
  }

  const varBetaArray = (varBeta as any).toArray() as number[][];
  const coeffs = betas.map((beta, idx) => {
    const se = Math.sqrt(Math.max(1e-12, varBetaArray[idx][idx]));
    const t = se === 0 ? 0 : beta / se;
    const p = 2 * (1 - normalCdf(Math.abs(t)));
    const ciLow = beta - 1.96 * se;
    const ciHigh = beta + 1.96 * se;
    return { name: names[idx], beta, se, t, p, ciLow, ciHigh };
  });

  return { coefficients: coeffs, r2, n, df };
};

export const buildDesignMatrix = (
  rows: Array<Record<string, any>>,
  yVar: string,
  xVars: string[]
): DesignMatrix => {
  const cleanRows = rows.filter(row =>
    Number.isFinite(Number(row[yVar])) && xVars.every(x => Number.isFinite(Number(row[x])))
  );
  const y = cleanRows.map(row => Number(row[yVar]));
  const X = cleanRows.map(row => [1, ...xVars.map(x => Number(row[x]))]);
  return { y, X, names: ['Intercept', ...xVars] };
};

export const bootstrapIndirectEffect = (
  rows: Array<Record<string, any>>,
  xVars: string[],
  mediatorVar: string,
  yVar: string,
  nResamples: number
) => {
  const effects: number[] = [];
  for (let i = 0; i < nResamples; i += 1) {
    const sample = rows.map(() => rows[Math.floor(Math.random() * rows.length)]);
    const mDesign = buildDesignMatrix(sample, mediatorVar, xVars);
    const mResult = olsRegression(mDesign);
    const a = mResult.coefficients.find(c => c.name === xVars[0])?.beta || 0;

    const yDesign = buildDesignMatrix(sample, yVar, [mediatorVar, ...xVars]);
    const yResult = olsRegression(yDesign);
    const b = yResult.coefficients.find(c => c.name === mediatorVar)?.beta || 0;
    effects.push(a * b);
  }
  effects.sort((a, b) => a - b);
  const lower = effects[Math.floor(nResamples * 0.025)] || null;
  const upper = effects[Math.floor(nResamples * 0.975)] || null;
  return { effects, ciLow: lower, ciHigh: upper };
};

export const predictInteraction = (
  result: RegressionResult,
  base: Record<string, number>,
  interactionVars: string[],
  levels: number[]
) => {
  const coeffMap = result.coefficients.reduce<Record<string, number>>((acc, coef) => {
    acc[coef.name] = coef.beta;
    return acc;
  }, {});

  return levels.map(level => {
    const row: Record<string, number> = { ...base };
    interactionVars.forEach(name => {
      row[name] = level;
    });
    let prediction = coeffMap.Intercept || 0;
    Object.entries(row).forEach(([name, value]) => {
      prediction += (coeffMap[name] || 0) * value;
    });
    return { level, prediction };
  });
};

export const chiSquareTest = (observed: number[][]): ChiSquareResult => {
  const rows = observed.length;
  const cols = observed[0]?.length || 0;
  const rowTotals = observed.map(row => row.reduce((s, v) => s + v, 0));
  const colTotals = new Array(cols).fill(0).map((_, colIdx) =>
    observed.reduce((sum, row) => sum + row[colIdx], 0)
  );
  const total = rowTotals.reduce((s, v) => s + v, 0);
  let chi2 = 0;
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const expected = (rowTotals[i] * colTotals[j]) / total;
      if (expected > 0) {
        chi2 += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
  }
  const df = (rows - 1) * (cols - 1);
  const p = 1 - chiSquareCdf(chi2, df);
  return { chi2, df, p };
};

export const oneWayAnova = (groups: Record<string, number[]>): AnovaResult => {
  const groupValues = Object.values(groups).filter(values => values.length > 0);
  const k = groupValues.length;
  const n = groupValues.reduce((sum, values) => sum + values.length, 0);
  const grandMean = groupValues.flat().reduce((s, v) => s + v, 0) / n;

  let ssBetween = 0;
  let ssWithin = 0;
  groupValues.forEach(values => {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    ssBetween += values.length * Math.pow(mean - grandMean, 2);
    ssWithin += values.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
  });

  const df1 = k - 1;
  const df2 = n - k;
  const msBetween = ssBetween / Math.max(1, df1);
  const msWithin = ssWithin / Math.max(1, df2);
  const f = msWithin === 0 ? 0 : msBetween / msWithin;
  const p = 1 - fCdf(f, df1, df2);
  return { f, df1, df2, p };
};
