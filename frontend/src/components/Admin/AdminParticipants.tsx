import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './AdminStyles.css';

interface ParticipantRow {
  id: string;
  participantCode: string | null;
  mode: string | null;
  status: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMs: number | null;
  decisions: boolean[];
  memos: boolean[];
}

const AdminParticipants: React.FC = () => {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/admin/participants')
      .then(response => setRows(response.data.data))
      .catch(err => setError(err?.response?.data?.message || 'Failed to load participants'));
  }, []);

  if (error) {
    return <div className="admin-page">Error: {error}</div>;
  }

  return (
    <div className="admin-page">
      <h2>Participants</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Mode</th>
            <th>Status</th>
            <th>Start</th>
            <th>End</th>
            <th>Duration</th>
            <th>Act1</th>
            <th>Act2</th>
            <th>Act3</th>
            <th>Act4</th>
            <th>Memo</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>{row.participantCode || row.id.slice(0, 8)}</td>
              <td>{row.mode}</td>
              <td>{row.status}</td>
              <td>{row.startTime ? new Date(row.startTime).toLocaleString() : '-'}</td>
              <td>{row.endTime ? new Date(row.endTime).toLocaleString() : '-'}</td>
              <td>{row.durationMs ? Math.round(row.durationMs / 60000) + 'm' : '-'}</td>
              {row.decisions.map((act, idx) => (
                <td key={`d-${row.id}-${idx}`}>{act ? '✓' : '–'}</td>
              ))}
              <td>{row.memos.some(memo => memo) ? '✓' : '–'}</td>
              <td>
                <Link to={`/admin/participants/${row.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminParticipants;
