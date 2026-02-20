import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import './AdminStyles.css';

const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/admin/analytics')
      .then(response => setData(response.data.data))
      .catch(err => setError(err?.response?.data?.message || 'Failed to load analytics'));
  }, []);

  if (error) {
    return <div className="admin-page">Error: {error}</div>;
  }

  if (!data) {
    return <div className="admin-page">Loading analytics...</div>;
  }

  const interaction = data.hypotheses?.h2?.interactionPlots;
  const buildPlotData = (series: any[]) => {
    if (!series) return [];
    return interaction.rLevels.map((rValue: number, idx: number) => ({
      r: rValue.toFixed(2),
      ...series.reduce((acc: any, s: any) => {
        acc[s.mode] = s.values[idx].y;
        return acc;
      }, {})
    }));
  };

  return (
    <div className="admin-page">
      <h2>Analytics</h2>
      <div className="admin-section">
        <h3>Descriptive Stats</h3>
        <pre>{JSON.stringify(data.descriptive, null, 2)}</pre>
      </div>
      <div className="admin-section">
        <h3>Correlation Matrix</h3>
        <pre>{JSON.stringify(data.correlations, null, 2)}</pre>
      </div>
      <div className="admin-section">
        <h3>Hypotheses</h3>
        <pre>{JSON.stringify(data.hypotheses, null, 2)}</pre>
      </div>
      {interaction && (
        <div className="admin-section">
          <h3>H2 Interaction Plot (VQ)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={buildPlotData(interaction.vq)}>
              <XAxis dataKey="r" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="C0" stroke="#8884d8" />
              <Line type="monotone" dataKey="C1" stroke="#82ca9d" />
              <Line type="monotone" dataKey="C2" stroke="#ff7300" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
