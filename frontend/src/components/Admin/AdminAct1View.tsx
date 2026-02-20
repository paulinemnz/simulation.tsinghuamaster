import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './AdminStyles.css';

interface Act1DataRow {
  participant_id: string;
  participant_code: string | null;
  mode: string | null;
  status: string | null;
  // ALL CONDITIONS
  act1_choice: string | null;
  act1_justification: string | null;
  act1_submitted_at: string | null;
  act1_decision_time_ms: number | null;
  // GENAI ONLY (C1)
  act1_ai_queries_count?: number;
  act1_ai_query_1_text?: string | null;
  act1_ai_query_2_text?: string | null;
  act1_ai_query_3_text?: string | null;
  act1_ai_query_1_length_chars?: number | null;
  act1_ai_query_2_length_chars?: number | null;
  act1_ai_query_3_length_chars?: number | null;
  // AGENTIC ONLY (C2)
  act1_ai_discussions_count?: number;
  act1_ai_discussion_log?: string | null;
  act1_ai_discussion_total_length_chars?: number | null;
}

const AdminAct1View: React.FC = () => {
  const [data, setData] = useState<Act1DataRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/act1')
      .then(response => {
        setData(response.data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err?.response?.data?.message || 'Failed to load Act 1 data');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="admin-page">Loading Act 1 data...</div>;
  }

  if (error) {
    return <div className="admin-page">Error: {error}</div>;
  }

  // Separate data by mode
  const c0Data = data.filter(row => row.mode === 'C0');
  const c1Data = data.filter(row => row.mode === 'C1');
  const c2Data = data.filter(row => row.mode === 'C2');

  const renderC0Table = () => (
    <div style={{ marginTop: '30px' }}>
      <h3 style={{ color: '#666', marginBottom: '15px' }}>C0 Mode - Control (No AI Assistance)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Participant Code</th>
              <th>Status</th>
              <th>Choice</th>
              <th>Justification</th>
              <th>Decision Time</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {c0Data.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                  No C0 participants yet
                </td>
              </tr>
            ) : (
              c0Data.map((row) => (
                <tr key={row.participant_id}>
                  <td>{row.participant_code || row.participant_id.slice(0, 8)}</td>
                  <td>{row.status || '-'}</td>
                  <td><strong>{row.act1_choice || '-'}</strong></td>
                  <td style={{ maxWidth: '300px', wordBreak: 'break-word' }}>
                    {row.act1_justification || '-'}
                  </td>
                  <td>{row.act1_decision_time_ms ? `${Math.round(row.act1_decision_time_ms / 1000)}s` : '-'}</td>
                  <td>
                    {row.act1_submitted_at
                      ? new Date(row.act1_submitted_at).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderC1Table = () => (
    <div style={{ marginTop: '30px' }}>
      <h3 style={{ color: '#666', marginBottom: '15px' }}>C1 Mode - GENAI (AI Assist - Up to 3 Queries)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              <th>Participant Code</th>
              <th>Status</th>
              <th>Choice</th>
              <th>Justification</th>
              <th>Decision Time</th>
              <th>Submitted At</th>
              <th>AI Queries Count</th>
              <th>Query 1 Text</th>
              <th>Query 1 Length</th>
              <th>Query 2 Text</th>
              <th>Query 2 Length</th>
              <th>Query 3 Text</th>
              <th>Query 3 Length</th>
            </tr>
          </thead>
          <tbody>
            {c1Data.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: '20px' }}>
                  No C1 participants yet
                </td>
              </tr>
            ) : (
              c1Data.map((row) => (
                <tr key={row.participant_id}>
                  <td>{row.participant_code || row.participant_id.slice(0, 8)}</td>
                  <td>{row.status || '-'}</td>
                  <td><strong>{row.act1_choice || '-'}</strong></td>
                  <td style={{ maxWidth: '200px', wordBreak: 'break-word' }}>
                    {row.act1_justification || '-'}
                  </td>
                  <td>{row.act1_decision_time_ms ? `${Math.round(row.act1_decision_time_ms / 1000)}s` : '-'}</td>
                  <td>
                    {row.act1_submitted_at
                      ? new Date(row.act1_submitted_at).toLocaleString()
                      : '-'}
                  </td>
                  <td><strong>{row.act1_ai_queries_count ?? 0}</strong></td>
                  <td style={{ maxWidth: '250px', wordBreak: 'break-word', fontSize: '0.9em' }}>
                    {row.act1_ai_query_1_text || '-'}
                  </td>
                  <td>{row.act1_ai_query_1_length_chars ?? '-'}</td>
                  <td style={{ maxWidth: '250px', wordBreak: 'break-word', fontSize: '0.9em' }}>
                    {row.act1_ai_query_2_text || '-'}
                  </td>
                  <td>{row.act1_ai_query_2_length_chars ?? '-'}</td>
                  <td style={{ maxWidth: '250px', wordBreak: 'break-word', fontSize: '0.9em' }}>
                    {row.act1_ai_query_3_text || '-'}
                  </td>
                  <td>{row.act1_ai_query_3_length_chars ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderC2Table = () => (
    <div style={{ marginTop: '30px' }}>
      <h3 style={{ color: '#666', marginBottom: '15px' }}>C2 Mode - AGENTIC (AI Copilot - Full Discussion)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ minWidth: '1000px' }}>
          <thead>
            <tr>
              <th>Participant Code</th>
              <th>Status</th>
              <th>Choice</th>
              <th>Justification</th>
              <th>Decision Time</th>
              <th>Submitted At</th>
              <th>Discussions Count</th>
              <th>Discussion Log</th>
              <th>Total Length (chars)</th>
            </tr>
          </thead>
          <tbody>
            {c2Data.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '20px' }}>
                  No C2 participants yet
                </td>
              </tr>
            ) : (
              c2Data.map((row) => (
                <tr key={row.participant_id}>
                  <td>{row.participant_code || row.participant_id.slice(0, 8)}</td>
                  <td>{row.status || '-'}</td>
                  <td><strong>{row.act1_choice || '-'}</strong></td>
                  <td style={{ maxWidth: '200px', wordBreak: 'break-word' }}>
                    {row.act1_justification || '-'}
                  </td>
                  <td>{row.act1_decision_time_ms ? `${Math.round(row.act1_decision_time_ms / 1000)}s` : '-'}</td>
                  <td>
                    {row.act1_submitted_at
                      ? new Date(row.act1_submitted_at).toLocaleString()
                      : '-'}
                  </td>
                  <td><strong>{row.act1_ai_discussions_count ?? 0}</strong></td>
                  <td style={{ maxWidth: '400px', wordBreak: 'break-word', fontSize: '0.85em' }}>
                    {row.act1_ai_discussion_log ? (
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#0066cc', fontWeight: 'bold' }}>
                          View Discussion ({row.act1_ai_discussions_count} turns)
                        </summary>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap', 
                          maxHeight: '300px', 
                          overflow: 'auto',
                          marginTop: '10px',
                          padding: '10px',
                          backgroundColor: '#f5f5f5',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontSize: '0.85em',
                          lineHeight: '1.4'
                        }}>
                          {row.act1_ai_discussion_log}
                        </pre>
                      </details>
                    ) : '-'}
                  </td>
                  <td><strong>{row.act1_ai_discussion_total_length_chars ?? '-'}</strong></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="admin-page">
      <h2>Act 1 View - Data Collection</h2>
      <p className="admin-description">
        Hypothesis H1: AI sophistication → decision quality<br />
        Decision Screen: How should Terraform respond to the SCOS AI proposal?<br />
        Choices: A. Full AI Adoption | B. Human-Centric Strategy | C. Pilot / Hybrid Approach
      </p>

      {renderC0Table()}
      {renderC1Table()}
      {renderC2Table()}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>Data Collection Summary</h3>
        <p>
          <strong>Total Participants:</strong> {data.length}<br />
          <strong>With Act 1 Decision:</strong> {data.filter(d => d.act1_choice).length}<br />
          <strong>C0 Mode (Control):</strong> {c0Data.length}<br />
          <strong>C1 Mode (GENAI):</strong> {c1Data.length}<br />
          <strong>C2 Mode (AGENTIC):</strong> {c2Data.length}
        </p>
      </div>
    </div>
  );
};

export default AdminAct1View;
