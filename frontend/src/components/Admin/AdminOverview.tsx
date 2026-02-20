import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './AdminStyles.css';

interface OverviewData {
  totalParticipants: number;
  completedParticipants: number;
  completionRate: number;
  byMode: Record<string, number>;
  avgCompletionMs: Record<string, number>;
  missingDataWarnings: {
    missingDecisions: number;
    missingMemos: number;
  };
}

const AdminOverview: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/admin/overview')
      .then(response => setData(response.data.data))
      .catch(err => setError(err?.response?.data?.message || 'Failed to load overview'));
  }, []);

  if (error) {
    return <div className="admin-page">Error: {error}</div>;
  }

  if (!data) {
    return <div className="admin-page">Loading overview...</div>;
  }

  return (
    <div className="admin-page">
      <h2>Admin Overview</h2>
      <div className="admin-grid">
        <div className="admin-stat">
          <h4>Total Participants</h4>
          <p>{data.totalParticipants}</p>
        </div>
        <div className="admin-stat">
          <h4>Completed</h4>
          <p>
            {data.completedParticipants} ({(data.completionRate * 100).toFixed(1)}%)
          </p>
        </div>
        <div className="admin-stat">
          <h4>Missing Decisions</h4>
          <p>{data.missingDataWarnings.missingDecisions}</p>
        </div>
        <div className="admin-stat">
          <h4>Missing Memos</h4>
          <p>{data.missingDataWarnings.missingMemos}</p>
        </div>
      </div>

      <div className="admin-section">
        <h3>By Mode</h3>
        <div className="admin-grid">
          {Object.entries(data.byMode).map(([mode, count]) => (
            <div key={mode} className="admin-stat">
              <h4>{mode}</h4>
              <p>{count}</p>
              <small>
                Avg time: {Math.round((data.avgCompletionMs[mode] || 0) / 60000)} min
              </small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
