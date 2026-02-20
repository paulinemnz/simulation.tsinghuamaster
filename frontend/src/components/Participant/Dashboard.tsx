import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scenario } from '../../types/scenario';
import { simulationService } from '../../services/simulation';
import './Dashboard.css';

interface SimulationSession {
  id: string;
  participant_id: string;
  scenario_id: string;
  current_round: number;
  total_rounds: number;
  status: string;
  state_snapshot?: Record<string, any>;
}

const Dashboard: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentSession, setCurrentSession] = useState<SimulationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        return;
      }

      setParticipantId(userId);
      
      // Load available scenarios
      const availableScenarios = await simulationService.getScenarios();
      setScenarios(availableScenarios);

      // Check for active simulation
      try {
        const sessionData = await simulationService.getCurrentSimulation(userId);
        setCurrentSession(sessionData.session);
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Error loading session:', error);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulation = async (scenarioId: string) => {
    if (!participantId) return;

    try {
      const session = await simulationService.startSimulation(scenarioId, participantId);
      setCurrentSession(session);
      navigate(`/participant/simulation/${session.id}`);
    } catch (error) {
      console.error('Error starting simulation:', error);
      alert('Failed to start simulation. Please try again.');
    }
  };

  const handleContinueSimulation = () => {
    if (currentSession) {
      navigate(`/participant/simulation/${currentSession.id}`);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Business Simulation Dashboard</h1>
        <p>Welcome to Tsinghua SEM Business Simulation Platform</p>
      </header>

      {currentSession ? (
        <div className="current-session">
          <h2>Active Simulation</h2>
          <div className="session-info">
            <p>Round: {currentSession.current_round} / {currentSession.total_rounds}</p>
            <p>Status: {currentSession.status}</p>
            <button onClick={handleContinueSimulation} className="btn-primary">
              Continue Simulation
            </button>
          </div>
        </div>
      ) : (
        <div className="scenarios-section">
          <h2>Available Scenarios</h2>
          <div className="scenarios-grid">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="scenario-card">
                <h3>{scenario.name}</h3>
                <p>{scenario.description}</p>
                <div className="scenario-meta">
                  <span>Rounds: {scenario.config.rounds}</span>
                  <span>Categories: {scenario.config.decisionCategories.length}</span>
                </div>
                <button
                  onClick={() => handleStartSimulation(scenario.id)}
                  className="btn-primary"
                >
                  Start Simulation
                </button>
              </div>
            ))}
          </div>
          {scenarios.length === 0 && (
            <p className="no-scenarios">No scenarios available at this time.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;