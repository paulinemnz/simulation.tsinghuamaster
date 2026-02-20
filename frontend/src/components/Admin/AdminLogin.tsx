import React, { useState } from 'react';
import api from '../../services/api';
import './AdminStyles.css';

const AdminLogin: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/admin/login', { secret });
      if (response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
      }
      onLogin();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-card">
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <label>
            Admin Secret
            <input
              type="password"
              value={secret}
              onChange={event => setSecret(event.target.value)}
              placeholder="Enter ADMIN_SECRET"
            />
          </label>
          {error && <div className="admin-error">{error}</div>}
          <button type="submit" disabled={loading || !secret.trim()}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
