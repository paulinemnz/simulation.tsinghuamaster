import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './EthicalAgreement.css';

const EthicalAgreement: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const handleAgree = () => {
    if (sessionId) {
      navigate(`/sim/${sessionId}/pre-simulation`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="ethical-agreement-page">
      <div className="ethical-agreement-container">
        <div className="ethical-agreement-header">
          <h1>Research Information and Participation Statement</h1>
        </div>

        <div className="ethical-agreement-content">
          <div style={{
            backgroundColor: '#fee',
            border: '2px solid #f00',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '30px',
            color: '#c00',
            fontSize: '16px',
            fontWeight: 'bold',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: 0, color: '#c00' }}>
              <strong style={{ color: '#c00' }}>IMPORTANT:</strong> No other help should be used during the simulation. 
              You must rely solely on what the simulation provides. No external tools should be used. 
              Otherwise, the experiment will not have relevance.
            </p>
          </div>
          <section className="agreement-section">
            <h2>1. Identification</h2>
            <p>
              My name is Pauline Menez, and this study is conducted as part of my Master's thesis in Management at Tsinghua University. 
              The research is carried out within the academic framework of the university and under faculty supervision. 
              Tsinghua University is a leading research institution committed to rigorous academic standards and ethical research practices. 
              Further information about the university can be found at{' '}
              <a href="https://www.tsinghua.edu.cn" target="_blank" rel="noopener noreferrer">
                https://www.tsinghua.edu.cn
              </a>.
            </p>
            <p>
              This simulation is part of an academic investigation into executive and strategic decision-making processes.
            </p>
          </section>

          <section className="agreement-section">
            <h2>2. Why You Were Selected</h2>
            <p>
              You have been invited to participate because of your experience in leadership, executive decision-making, 
              or the management of organizations and startups. This study focuses specifically on individuals operating 
              at CEO, founder, senior management, or organizational leadership levels. Your professional background makes 
              your perspective particularly valuable for understanding how complex strategic decisions are approached in 
              real-world contexts.
            </p>
            <p>
              The research aims to reflect authentic managerial reasoning. Therefore, participation from individuals with 
              substantial responsibility in leading teams, ventures, or organizations is essential to the integrity and 
              relevance of the study.
            </p>
          </section>

          <section className="agreement-section">
            <h2>3. Purpose of the Study</h2>
            <p>
              The purpose of this research is to examine how experienced leaders navigate complex strategic scenarios 
              involving uncertainty, competing stakeholder interests, and evolving organizational constraints. The simulation 
              is designed to replicate a realistic executive environment in which participants must evaluate information, 
              make strategic choices, and justify their reasoning.
            </p>
            <p>
              The findings will contribute to academic research in strategic management and leadership studies. Results 
              may be included in scholarly publications, academic conferences, and the final Master's thesis. All results 
              will be analyzed at an aggregate level to identify broader patterns in executive decision-making. Individual 
              participants will not be identifiable in any published work.
            </p>
          </section>

          <section className="agreement-section">
            <h2>4. Time Commitment</h2>
            <p>
              The simulation is designed to take less than one hour to complete. The exact duration may vary depending 
              on the depth of your responses and the time you choose to spend reflecting on each decision. Participants 
              are encouraged to complete the simulation in one uninterrupted session to preserve the realism of the 
              executive scenario.
            </p>
          </section>

          <section className="agreement-section">
            <h2>5. Data Privacy and Confidentiality</h2>
            <p>
              Your responses will be treated as strictly confidential. The study does not request sensitive personal data 
              such as financial records, identification numbers, or proprietary company information. Data collected during 
              the simulation may include your strategic choices, written explanations, response timing, and interaction 
              patterns within the simulation environment.
            </p>
            <p>
              All data will be stored securely on password-protected systems accessible only to the research team. Responses 
              will be anonymized prior to analysis, and findings will be reported exclusively in aggregate form. No 
              individual-level results will be disclosed.
            </p>
            <p>
              Data will be retained solely for academic research purposes and handled in accordance with applicable research 
              ethics standards and data protection principles. If you have any questions regarding data privacy or wish to 
              withdraw your participation prior to completion, you may contact the researcher directly.
            </p>
          </section>

          <section className="agreement-section agreement-consent">
            <p>
              Participation in this study is entirely voluntary. By proceeding with the simulation, you acknowledge that 
              you have read and understood this statement and consent to participate in this academic research project.
            </p>
          </section>
        </div>

        <div className="ethical-agreement-actions">
          <button 
            className="agree-button" 
            onClick={handleAgree}
          >
            I Agree and Start the Simulation
          </button>
        </div>
      </div>
    </div>
  );
};

export default EthicalAgreement;
