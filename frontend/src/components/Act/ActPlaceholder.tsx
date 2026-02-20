import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ActPlaceholder.css';

interface ActPlaceholderProps {
  actNumber: number;
}

const ActPlaceholder: React.FC<ActPlaceholderProps> = ({ actNumber }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  return (
    <div className="act-placeholder">
      <div className="placeholder-content">
        <h1>Act {actNumber}</h1>
        <div className="coming-soon-badge">Coming Soon</div>
        <p className="placeholder-message">
          Act {actNumber} content will be implemented based on your previous decisions.
        </p>
        <p className="placeholder-note">
          Your path through the simulation is being prepared based on the choices you've made so far.
        </p>
        <button 
          className="return-button"
          onClick={() => navigate('/')}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default ActPlaceholder;
