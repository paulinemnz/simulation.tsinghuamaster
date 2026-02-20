import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, Navigate } from 'react-router-dom';
import api from '../../services/api';
import AdminLogin from './AdminLogin';
import AdminOverview from './AdminOverview';
import AdminParticipants from './AdminParticipants';
import AdminParticipantDetail from './AdminParticipantDetail';
import AdminExports from './AdminExports';
import AdminAct1View from './AdminAct1View';
import AdminAct2View from './AdminAct2View';
import AdminAct3View from './AdminAct3View';
import AdminAct4View from './AdminAct4View';
import AdminPostSimulation from './AdminPostSimulation';
import AdminPreSimulation from './AdminPreSimulation';
import './AdminStyles.css';

const AdminShell: React.FC = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get('/admin/overview')
      .then(() => setIsAuthed(true))
      .catch(() => setIsAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="admin-page">Checking admin session...</div>;
  }

  if (!isAuthed) {
    return <AdminLogin onLogin={() => setIsAuthed(true)} />;
  }

  return (
    <div className="admin-page">
      <nav className="admin-tabs">
        <Link to="/admin">Overview</Link>
        <Link to="/admin/participants">Participants</Link>
        <Link to="/admin/pre-simulation">Pre-Simulation</Link>
        <Link to="/admin/act1">Act 1 View</Link>
        <Link to="/admin/act2">Act 2 View</Link>
        <Link to="/admin/act3">Act 3 View</Link>
        <Link to="/admin/act4">Act 4 View</Link>
        <Link to="/admin/exports">Exports</Link>
        <Link to="/admin/post-simulation">Post-Simulation</Link>
      </nav>
      <Routes>
        <Route path="/" element={<AdminOverview />} />
        <Route path="/participants" element={<AdminParticipants />} />
        <Route path="/participants/:id" element={<AdminParticipantDetail />} />
        <Route path="/pre-simulation" element={<AdminPreSimulation />} />
        <Route path="/act1" element={<AdminAct1View />} />
        <Route path="/act2" element={<AdminAct2View />} />
        <Route path="/act3" element={<AdminAct3View />} />
        <Route path="/act4" element={<AdminAct4View />} />
        <Route path="/exports" element={<AdminExports />} />
        <Route path="/post-simulation" element={<AdminPostSimulation />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
};

export default AdminShell;
