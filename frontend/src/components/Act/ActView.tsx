import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './ActView.css';

interface ActSection {
  id: string;
  title: string;
  content: string;
  collapsible?: boolean;
}

interface ActDocument {
  id: string;
  title: string;
  content: string;
  type?: 'memo' | 'financial' | 'letter' | 'brief' | 'report';
}

interface ActOption {
  id: string;
  title: string;
  description: string;
  implications?: string[];
}

interface ActConfig {
  actNumber: number;
  title: string;
  context: {
    sections: ActSection[];
    stakeholderPerspectives?: ActSection[];
  };
  documents: ActDocument[];
  options: ActOption[];
}

interface ActViewProps {
  actNumber: number;
}

const ActView: React.FC<ActViewProps> = ({ actNumber }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [actConfig, setActConfig] = useState<ActConfig | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [openDocuments, setOpenDocuments] = useState<Set<string>>(new Set());
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justification, setJustification] = useState<string>('');

  useEffect(() => {
    loadActData();
  }, [sessionId, actNumber]);

  const loadActData = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await api.get(`/sim/${sessionId}/act/${actNumber}`);
      
      if (response.data.status === 'success') {
        setActConfig(response.data.data.act);
        setIsCompleted(response.data.data.isCompleted);
        
        if (response.data.data.decision) {
          setSelectedOption(response.data.data.decision.option_id);
        }
      }
    } catch (err: any) {
      console.error('Error loading act data:', err);
      setError(err.response?.data?.message || 'Failed to load act data');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentOpen = async (documentId: string) => {
    if (!sessionId) return;

    setOpenDocuments(prev => new Set(prev).add(documentId));
    setActiveDocument(documentId);

    try {
      await api.post('/sim/doc/event', {
        sessionId,
        actNumber,
        documentId,
        eventType: 'open'
      });
    } catch (err) {
      console.error('Error logging document open:', err);
    }
  };

  const handleDocumentClose = async (documentId: string) => {
    if (!sessionId) return;

    setActiveDocument(null);

    try {
      await api.post('/sim/doc/event', {
        sessionId,
        actNumber,
        documentId,
        eventType: 'close'
      });
    } catch (err) {
      console.error('Error logging document close:', err);
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleOptionSelect = (optionId: string) => {
    if (isCompleted) return;
    setSelectedOption(optionId);
  };

  const handleSubmit = async () => {
    if (!selectedOption || !sessionId) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post('/sim/act/submit', {
        sessionId,
        actNumber,
        optionId: selectedOption,
        justification: justification.trim() || null
      });

      if (response.data.status === 'success') {
        setIsCompleted(true);
        setShowConfirmModal(false);

        // Navigate to next act or completion page
        if (actNumber < 4 && response.data.data.nextAct) {
          setTimeout(() => {
            navigate(`/sim/${sessionId}/act/${response.data.data.nextAct}`);
          }, 1500);
        } else {
          // Act IV completed - could navigate to completion page
          navigate(`/sim/${sessionId}/complete`);
        }
      }
    } catch (err: any) {
      console.error('Error submitting decision:', err);
      setError(err.response?.data?.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="act-view-loading">
        <div className="loading-spinner"></div>
        <p>Loading Act {actNumber}...</p>
      </div>
    );
  }

  if (error && !actConfig) {
    return (
      <div className="act-view-error">
        <p>Error: {error}</p>
        <button onClick={() => navigate('/')}>Return to Home</button>
      </div>
    );
  }

  if (!actConfig) {
    return (
      <div className="act-view-error">
        <p>Act {actNumber} not found</p>
        <button onClick={() => navigate('/')}>Return to Home</button>
      </div>
    );
  }

  return (
    <div className="act-view">
      <div className="act-header">
        <div className="act-progress">
          <span className="progress-text">Act {actNumber} of 4</span>
        </div>
        <h1 className="act-title">{actConfig.title}</h1>
        {isCompleted && (
          <div className="act-completed-badge">Completed</div>
        )}
      </div>

      <div className="act-content">
        <div className="act-main-panel">
          {/* Context Sections */}
          <div className="context-section">
            <h2>Context</h2>
            {actConfig.context.sections.map(section => (
              <div key={section.id} className="context-item">
                <div 
                  className={`context-header ${section.collapsible ? 'collapsible' : ''}`}
                  onClick={() => section.collapsible && toggleSection(section.id)}
                >
                  <h3>{section.title}</h3>
                  {section.collapsible && (
                    <span className="collapse-icon">
                      {collapsedSections.has(section.id) ? '▼' : '▲'}
                    </span>
                  )}
                </div>
                {(!section.collapsible || !collapsedSections.has(section.id)) && (
                  <div className="context-content">
                    {section.content.split('\n').map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Stakeholder Perspectives */}
            {actConfig.context.stakeholderPerspectives && actConfig.context.stakeholderPerspectives.length > 0 && (
              <div className="stakeholder-section">
                <h2>Stakeholder Perspectives</h2>
                {actConfig.context.stakeholderPerspectives.map(section => (
                  <div key={section.id} className="context-item">
                    <div 
                      className={`context-header ${section.collapsible ? 'collapsible' : ''}`}
                      onClick={() => section.collapsible && toggleSection(section.id)}
                    >
                      <h3>{section.title}</h3>
                      {section.collapsible && (
                        <span className="collapse-icon">
                          {collapsedSections.has(section.id) ? '▼' : '▲'}
                        </span>
                      )}
                    </div>
                    {(!section.collapsible || !collapsedSections.has(section.id)) && (
                      <div className="context-content">
                        {section.content.split('\n').map((para, idx) => (
                          <p key={idx}>{para}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents Panel */}
          {actConfig.documents.length > 0 && (
            <div className="documents-section">
              <h2>Supporting Documents</h2>
              <div className="documents-grid">
                {actConfig.documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className={`document-card ${activeDocument === doc.id ? 'active' : ''}`}
                    onClick={() => {
                      if (activeDocument === doc.id) {
                        handleDocumentClose(doc.id);
                      } else {
                        handleDocumentOpen(doc.id);
                      }
                    }}
                  >
                    <div className="document-icon">
                      {doc.type === 'memo' && '📄'}
                      {doc.type === 'financial' && '💰'}
                      {doc.type === 'letter' && '✉️'}
                      {doc.type === 'brief' && '📊'}
                      {!doc.type && '📑'}
                    </div>
                    <h3>{doc.title}</h3>
                    {activeDocument === doc.id && (
                      <div className="document-viewer">
                        <div className="document-content">
                          {doc.content.split('\n').map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))}
                        </div>
                        <button 
                          className="close-document-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentClose(doc.id);
                          }}
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Options */}
          {!isCompleted && actConfig.options.length > 0 && (
            <div className="options-section">
              <h2>Your Decision</h2>
              <p className="options-instruction">Select one option below. You cannot change your decision after submission.</p>
              <div className="options-grid">
                {actConfig.options.map(option => (
                  <div
                    key={option.id}
                    className={`option-card ${selectedOption === option.id ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(option.id)}
                  >
                    <div className="option-header">
                      <div className="option-id">{option.id}</div>
                      <h3>{option.title}</h3>
                    </div>
                    <p className="option-description">{option.description}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="error-message">{error}</div>
              )}

              <button
                className="submit-button"
                onClick={() => setShowConfirmModal(true)}
                disabled={!selectedOption || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Decision'}
              </button>
            </div>
          )}

          {isCompleted && (
            <div className="completed-message">
              <p>✓ You have completed Act {actNumber}.</p>
              <p>Your decision: Option {selectedOption}</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => {
          setShowConfirmModal(false);
          setJustification('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{actNumber === 4 ? 'Confirm Strategic Trajectory' : 'Confirm Your Decision'}</h2>
            {actNumber === 4 ? (
              <>
                <p>You are finalizing Terraform’s strategic direction for the next 2–4 years.</p>
                <p>This decision will define priorities, trade-offs, and organizational identity.</p>
                <p className="warning-text">⚠️ This decision cannot be changed.</p>
              </>
            ) : (
              <>
                <p>You are about to submit your decision for Act {actNumber}.</p>
                <p className="warning-text">⚠️ You cannot change your decision after submission.</p>
              </>
            )}
            {selectedOption && (
              <div className="selected-option-preview">
                <strong>Selected Option: {selectedOption}</strong>
                <p>{actConfig.options.find(opt => opt.id === selectedOption)?.title}</p>
              </div>
            )}
            <div className="justification-section">
              <label htmlFor="justification-textarea">
                <strong>Justification</strong>
                <p className="justification-hint">Please explain the reasons for choosing this option:</p>
              </label>
              <textarea
                id="justification-textarea"
                className="justification-textarea"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Enter your reasoning for this decision..."
                rows={5}
              />
            </div>
            <div className="modal-actions">
              <button
                className="modal-button cancel"
                onClick={() => {
                  setShowConfirmModal(false);
                  setJustification('');
                }}
              >
                Cancel
              </button>
              <button
                className="modal-button confirm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : actNumber === 4 ? 'Confirm Strategy' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActView;
