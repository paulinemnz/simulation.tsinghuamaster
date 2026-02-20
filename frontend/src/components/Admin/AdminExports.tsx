import React, { useState } from 'react';
import api from '../../services/api';
import './AdminStyles.css';

const AdminExports: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [anonymize, setAnonymize] = useState(false);

  const download = async (format: 'json' | 'csv') => {
    setMessage(null);
    const response = await api.get(`/admin/exports?format=${format}&anonymize=${anonymize}`, {
      responseType: format === 'csv' ? 'blob' : 'json'
    });

    if (format === 'csv') {
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'analysis_rows.csv';
      link.click();
      URL.revokeObjectURL(url);
      setMessage('CSV export downloaded.');
    } else {
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'research_export.json';
      link.click();
      URL.revokeObjectURL(url);
      setMessage('JSON export downloaded.');
    }
  };

  return (
    <div className="admin-page">
      <h2>Exports</h2>
      {message && <div className="admin-card">{message}</div>}
      <label>
        <input
          type="checkbox"
          checked={anonymize}
          onChange={event => setAnonymize(event.target.checked)}
        />
        Anonymize participant IDs
      </label>
      <div className="admin-section">
        <button onClick={() => download('json')}>Download JSON Bundle</button>
        <button onClick={() => download('csv')}>Download Analysis CSV</button>
      </div>
    </div>
  );
};

export default AdminExports;
