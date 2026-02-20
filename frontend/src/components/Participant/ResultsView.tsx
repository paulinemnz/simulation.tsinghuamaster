import React from 'react';
import { Outcome, OutcomeMetrics } from '../../types/outcome';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ResultsView.css';

interface ResultsViewProps {
  outcomes: Outcome[];
  currentRound?: number;
}

const ResultsView: React.FC<ResultsViewProps> = ({ outcomes, currentRound }) => {
  if (!outcomes || outcomes.length === 0) {
    return (
      <div className="results-view">
        <p>No results available yet. Complete a round to see outcomes.</p>
      </div>
    );
  }

  const outcomesArray = Array.isArray(outcomes) ? outcomes : [outcomes];
  const sortedOutcomes = [...outcomesArray].sort((a, b) => a.round - b.round);

  // Prepare data for charts
  const financialData = sortedOutcomes.map((outcome) => ({
    round: outcome.round,
    revenue: outcome.metrics.financials.revenue,
    profit: outcome.metrics.financials.profit,
    cash: outcome.metrics.financials.cash,
    expenses: outcome.metrics.financials.expenses,
  }));

  const marketData = sortedOutcomes.map((outcome) => ({
    round: outcome.round,
    marketShare: outcome.metrics.marketPosition.marketShare,
    brandValue: outcome.metrics.marketPosition.brandValue,
    customerSatisfaction: outcome.metrics.marketPosition.customerSatisfaction,
  }));

  const currentOutcome = currentRound
    ? sortedOutcomes.find((o) => o.round === currentRound - 1)
    : sortedOutcomes[sortedOutcomes.length - 1];

  return (
    <div className="results-view">
      <h2>Simulation Results</h2>

      {currentOutcome && (
        <div className="current-round-summary">
          <h3>Round {currentOutcome.round} Summary</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Financials</h4>
              <div className="metric-values">
                <div>
                  <span className="metric-label">Revenue:</span>
                  <span className="metric-value">${currentOutcome.metrics.financials.revenue.toLocaleString()}</span>
                </div>
                <div>
                  <span className="metric-label">Profit:</span>
                  <span className="metric-value">${currentOutcome.metrics.financials.profit.toLocaleString()}</span>
                </div>
                <div>
                  <span className="metric-label">Cash:</span>
                  <span className="metric-value">${currentOutcome.metrics.financials.cash.toLocaleString()}</span>
                </div>
                {currentOutcome.metrics.financials.roi && (
                  <div>
                    <span className="metric-label">ROI:</span>
                    <span className="metric-value">{currentOutcome.metrics.financials.roi.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="metric-card">
              <h4>Market Position</h4>
              <div className="metric-values">
                <div>
                  <span className="metric-label">Market Share:</span>
                  <span className="metric-value">{(currentOutcome.metrics.marketPosition.marketShare * 100).toFixed(2)}%</span>
                </div>
                <div>
                  <span className="metric-label">Brand Value:</span>
                  <span className="metric-value">{currentOutcome.metrics.marketPosition.brandValue.toFixed(2)}</span>
                </div>
                <div>
                  <span className="metric-label">Customer Satisfaction:</span>
                  <span className="metric-value">{currentOutcome.metrics.marketPosition.customerSatisfaction.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {currentOutcome.metrics.performance && (
              <div className="metric-card">
                <h4>Performance</h4>
                <div className="metric-values">
                  {currentOutcome.metrics.performance.overallScore && (
                    <div>
                      <span className="metric-label">Overall Score:</span>
                      <span className="metric-value">{currentOutcome.metrics.performance.overallScore.toFixed(2)}</span>
                    </div>
                  )}
                  {currentOutcome.metrics.performance.growthRate && (
                    <div>
                      <span className="metric-label">Growth Rate:</span>
                      <span className="metric-value">{currentOutcome.metrics.performance.growthRate.toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {sortedOutcomes.length > 1 && (
        <div className="charts-section">
          <div className="chart-container">
            <h3>Financial Performance Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="round" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
                <Line type="monotone" dataKey="cash" stroke="#ffc658" name="Cash" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Market Position Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="round" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="marketShare" fill="#8884d8" name="Market Share" />
                <Bar dataKey="brandValue" fill="#82ca9d" name="Brand Value" />
                <Bar dataKey="customerSatisfaction" fill="#ffc658" name="Customer Satisfaction" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;