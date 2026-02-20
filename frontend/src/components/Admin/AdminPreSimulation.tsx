import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './AdminStyles.css';

interface PreSimulationData {
  id: string;
  participant_code: string | null;
  mode: string | null;
  participant_status: string | null;
  created_at: string;
  started_at: string | null;
  // Demographics
  professionalExperience: string | null;
  managementExperience: string | null;
  education: string | null;
  age: number | null;
  gender: string | null;
  industryOrStudies: string | null;
  // Baseline Strategic Decision Quality
  tradeOffs: string | null;
  strategicOptions: string | null;
  recommendation: string | null;
  // Cognitive Reflection Test
  crt1: string | null;
  crt2: string | null;
  crt3: string | null;
}

const AdminPreSimulation: React.FC = () => {
  const [preSimulationData, setPreSimulationData] = useState<PreSimulationData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/pre-simulation')
      .then(response => {
        console.log('[AdminPreSimulation] Received response:', {
          status: response.data.status,
          dataLength: response.data.data?.length,
          firstParticipant: response.data.data?.[0]
        });
        setPreSimulationData(response.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('[AdminPreSimulation] Error loading pre-simulation data:', err);
        setError(err?.response?.data?.message || 'Failed to load pre-simulation data');
        setLoading(false);
      });
  }, []);

  const getAnswer = (data: PreSimulationData, key: string): string => {
    const value = data[key as keyof PreSimulationData];
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  };

  if (loading) {
    return <div className="admin-page">Loading pre-simulation data...</div>;
  }

  if (error) {
    return <div className="admin-page">Error: {error}</div>;
  }

  const columns = [
    { key: 'participant_code', label: 'Participant Code' },
    { key: 'mode', label: 'Mode' },
    { key: 'participant_status', label: 'Status' },
    { key: 'professionalExperience', label: 'Professional Experience' },
    { key: 'managementExperience', label: 'Management Experience' },
    { key: 'education', label: 'Education' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'industryOrStudies', label: 'Industry/Studies' },
    { key: 'tradeOffs', label: 'Trade-offs' },
    { key: 'strategicOptions', label: 'Strategic Options' },
    { key: 'recommendation', label: 'Recommendation' },
    { key: 'crt1', label: 'CRT Q1' },
    { key: 'crt2', label: 'CRT Q2' },
    { key: 'crt3', label: 'CRT Q3' },
  ];

  return (
    <div className="admin-page">
      <h2 style={{ marginBottom: '1rem' }}>Pre-Simulation Data</h2>
      <p style={{ color: '#667085', marginBottom: '1rem' }}>
        Total participants: {preSimulationData.length}
      </p>

      {preSimulationData.length === 0 ? (
        <div className="admin-card">
          <p>No pre-simulation data available yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', fontSize: '0.9em' }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} style={{ padding: '0.75rem', textAlign: 'left', background: '#f9fafb' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preSimulationData.map((row) => (
                <tr key={row.id}>
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb', wordBreak: 'break-word', maxWidth: '300px' }}>
                      {getAnswer(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPreSimulation;
