import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../../services/api';
import { loadSimulationState, updateSimulationState, resetSimulationState } from '../../services/simulationState';
import type { SimulationState } from '../../services/simulationState';
import './ActDashboard.css';
import AIAssistPanel from './AIAssistPanel';
import C2CopilotPanel from './C2CopilotPanel';
import { copilotService } from '../../services/copilot';
import type { CopilotContextPack } from '../../services/copilot';
// Import logo - handle space in filename
import terraformLogo from '../../assets/images/terraform logo.png';
import emmaThalmanPortrait from '../../assets/images/Emma T.png';
import lauraMoreauPortrait from '../../assets/images/Laura Moreau.png';
import miloGergievPortrait from '../../assets/images/Dr. Milo Gergiev.png';
import davidWernerPortrait from '../../assets/images/David Werner.png';

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

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  message: string;
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

type Act4Track = 'Efficiency at Scale' | 'Managed Adaptation' | 'Relational Foundation';

const act3DecisionToTrack = (decision: string): Act4Track => {
  const normalized = decision.toUpperCase();
  if (normalized === 'A1' || normalized === 'C3') {
    return 'Efficiency at Scale';
  }
  if (normalized === 'B1' || normalized === 'C2') {
    return 'Relational Foundation';
  }
  return 'Managed Adaptation';
};

const validAct2Paths = ['A', 'B', 'C'];
const validAct3Decisions = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
const validAct4Tracks: Act4Track[] = ['Efficiency at Scale', 'Managed Adaptation', 'Relational Foundation'];

const buildFallbackActConfig = (actNumber: number): ActConfig => ({
  actNumber,
  title: `Act ${actNumber} (Preview Fallback)`,
  context: {
    sections: [
      {
        id: 'preview-fallback',
        title: 'Preview Content Unavailable',
        content: 'Preview data could not be loaded. Please retry or start the backend server to view full content.',
      }
    ],
    stakeholderPerspectives: []
  },
  documents: [],
  options: []
});

interface ActDashboardProps {
  actNumber: number;
  sessionId?: string;
}

const ActDashboard: React.FC<ActDashboardProps> = ({ actNumber, sessionId: propSessionId }) => {
  const { sessionId: paramSessionId, path } = useParams<{ sessionId?: string; path?: string }>();
  const sessionId = propSessionId || paramSessionId;
  const navigate = useNavigate();
  
  const [actConfig, setActConfig] = useState<ActConfig | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [activeStakeholder, setActiveStakeholder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const storedMode = localStorage.getItem('simulationMode');
  const isC1Mode = storedMode === 'C1';
  const isC2Mode = storedMode === 'C2';
  const [c2Justification, setC2Justification] = useState('');
  const [c2JustificationSaved, setC2JustificationSaved] = useState(false);
  const [c2PreSubmitTrigger, setC2PreSubmitTrigger] = useState(0);
  const [c2PreSubmitAsked, setC2PreSubmitAsked] = useState(false);
  const C2_MIN_JUSTIFICATION = 40;
  const [justification, setJustification] = useState<string>('');

  // Updated stakeholder data with correct names
  const stakeholders: Stakeholder[] = [
    {
      id: 'cfo-perspective',
      name: 'Emma Thalman',
      role: 'CFO',
      message: 'I understand the potential benefits of SCOS, but I\'m concerned about the €5M upfront investment and hidden change costs. Our margins are already under pressure, and we need to be cautious about large capital expenditures. The ROI timeline of 14-18 months seems optimistic given our current financial constraints.'
    },
    {
      id: 'engineering-perspective',
      name: 'Dr. Milo Gergiev',
      role: 'Head of Engineering',
      message: 'From a competitive standpoint, we need to modernize our supply chain capabilities. HexaBuild\'s success with AI procurement shows we\'re falling behind. SCOS could give us the edge we need to compete effectively. I support moving forward with this initiative.'
    },
    {
      id: 'procurement-perspective',
      name: 'David Werner',
      role: 'Procurement Director',
      message: 'I\'m deeply concerned about supplier trust. We\'ve built relationships over decades, and introducing AI-driven negotiations could damage those partnerships. Our suppliers value transparency and personal relationships. We need to consider the long-term impact on our supply chain stability.'
    },
    {
      id: 'hr-perspective',
      name: 'Laura Moreau',
      role: 'Head of HR',
      message: 'We need to be very careful about change management. The union has already expressed concerns about job security and surveillance. A poorly managed implementation could lead to strikes and significant disruption. We must have a comprehensive communication and transition plan before proceeding.'
    },
    {
      id: 'union-perspective',
      name: 'IG Metall Chapter',
      role: 'Union Representative',
      message: 'We represent 14 employees whose roles could be affected. We need guarantees about job security, retraining opportunities, and transparency about how the system will be used. We request a formal consultation process before any implementation proceeds.'
    }
  ];

  const isPreview = sessionId === 'preview' || !sessionId;
  const showAIAssist = isPreview || isC1Mode || isC2Mode;
  const showC2Copilot = isC2Mode;
  const aiSessionId = isPreview ? undefined : sessionId;
  const decodedPreviewPath = path ? decodeURIComponent(path) : path;
  const previewAct2Path = actNumber === 2
    ? (path && validAct2Paths.includes(path.toUpperCase()) ? path.toUpperCase() : 'B')
    : 'B';
  const previewAct3Decision = actNumber === 3 && path && validAct3Decisions.includes(path.toUpperCase())
    ? path.toUpperCase()
    : undefined;
  const previewAct3TrackFromPath = actNumber === 3 && decodedPreviewPath && validAct4Tracks.includes(decodedPreviewPath as Act4Track)
    ? (decodedPreviewPath as Act4Track)
    : undefined;
  const previewAct3Track = actNumber === 3
    ? (previewAct3TrackFromPath || (previewAct3Decision ? act3DecisionToTrack(previewAct3Decision) : 'Managed Adaptation'))
    : 'Managed Adaptation';
  const previewAct4Track = actNumber === 4
    ? (decodedPreviewPath && validAct4Tracks.includes(decodedPreviewPath as Act4Track)
      ? (decodedPreviewPath as Act4Track)
      : 'Efficiency at Scale')
    : 'Efficiency at Scale';

  // Clear preview-related localStorage only when starting Act 1 in preview mode
  useEffect(() => {
    if (isPreview && actNumber === 1) {
      // Only clear when starting from Act 1 - this allows progression through acts
      const state = loadSimulationState();
      // Only clear if we're not continuing a preview session (check if we have decisions)
      if (!state.actDecisions.act1Decision) {
        // Clear all preview-related localStorage keys
        localStorage.removeItem('simulation_state_preview');
        // Clear any preview cache keys
        const previewCacheKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('preview-act-') || 
          key.startsWith('c2Justification:preview:')
        );
        previewCacheKeys.forEach(key => localStorage.removeItem(key));
        // Reset simulation state for fresh preview
        resetSimulationState({
          mode: 'preview',
          sessionId: 'preview',
          participantId: 'preview',
          currentAct: 1
        });
      }
    }
  }, [isPreview, actNumber]);

  useEffect(() => {
    loadActData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, actNumber]);

  useEffect(() => {
    if (!isC2Mode) return;
    const key = getC2JustificationKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { text: string; saved: boolean };
        setC2Justification(parsed.text || '');
        setC2JustificationSaved(Boolean(parsed.saved));
      } catch {
        setC2Justification('');
        setC2JustificationSaved(false);
      }
    } else {
      setC2Justification('');
      setC2JustificationSaved(false);
    }
    setC2PreSubmitAsked(false);
  }, [actNumber, isC2Mode, sessionId]);

  const getPreviewCacheKey = () => {
    if (actNumber === 2) {
      return `preview-act-2-${previewAct2Path}`;
    }
    if (actNumber === 3) {
      return `preview-act-3-${previewAct3Track}`;
    }
    if (actNumber === 4) {
      return `preview-act-4-${previewAct4Track}`;
    }
    return 'preview-act-1';
  };

  const getC2JustificationKey = () => `c2Justification:${sessionId || 'preview'}:act:${actNumber}`;

  const updateDecisionState = (optionId: string | null) => {
    if (!optionId) return;
    const key =
      actNumber === 1
        ? 'act1Decision'
        : actNumber === 2
          ? 'act2Decision'
          : actNumber === 3
            ? 'act3Decision'
            : 'act4Decision';
    updateSimulationState({
      actDecisions: {
        [key]: optionId
      } as any
    });
  };

  const loadActData = async () => {
    const isPreview = sessionId === 'preview' || !sessionId;
    let apiPath = '';
    
    console.log('[ActDashboard] loadActData called', { actNumber, sessionId, isPreview });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActDashboard.tsx:loadActData-entry',message:'Entered loadActData',data:{actNumber,sessionId,paramSessionId,propSessionId,path,isPreview,decodedPreviewPath},timestamp:Date.now(),sessionId:'debug-session',runId:'act-entry-debug',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (!sessionId && !isPreview) {
      console.error('[ActDashboard] No sessionId provided');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActDashboard.tsx:missing-sessionId',message:'Missing sessionId while not in preview',data:{actNumber,sessionId,paramSessionId,propSessionId,isPreview},timestamp:Date.now(),sessionId:'debug-session',runId:'act-entry-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setError('Session ID is missing. Please return to the landing page and start a new simulation.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // For Act II preview, include path parameter (A, B, or C) in query string
      // For Act III preview, include path parameter (A1, A2, A3, B1, B2, B3, C1, C2, C3) in query string
      apiPath = isPreview 
        ? `/sim/preview/act/${actNumber}`
        : `/sim/${sessionId}/act/${actNumber}`;
      
      // For preview mode, use stored decisions if URL path is missing
      if (isPreview) {
        const state = loadSimulationState();
        
        // Add path query parameter for Act II preview
        if (actNumber === 2) {
          // Use URL path if available, otherwise use stored Act 1 decision
          const act1Decision = path || state.actDecisions.act1Decision || previewAct2Path;
          apiPath += `?path=${act1Decision}`;
        }
        
        // Add identity track query parameter for Act III preview
        if (actNumber === 3) {
          // Use URL path if available, otherwise derive from stored Act 2 decision
          let trackToUse = previewAct3Track;
          if (!path && state.actDecisions.act2Decision) {
            const act2Decision = state.actDecisions.act2Decision;
            const normalized = act2Decision.toUpperCase();
            if (normalized === 'A1' || normalized === 'C3') {
              trackToUse = 'Efficiency at Scale';
            } else if (normalized === 'B1' || normalized === 'C2') {
              trackToUse = 'Relational Foundation';
            } else {
              trackToUse = 'Managed Adaptation';
            }
          }
          apiPath += `?track=${encodeURIComponent(trackToUse)}`;
        }
        
        // Add path query parameter for Act IV preview (identity track)
        if (actNumber === 4) {
          const act4ValidPaths = ['Efficiency at Scale', 'Managed Adaptation', 'Relational Foundation'];
          // Decode path if it comes from URL parameter (React Router automatically decodes, but handle both cases)
          const decodedPath = path ? decodeURIComponent(path) : path;
          
          // Use URL path if available, otherwise derive from stored Act 2 decision
          let trackToUse = decodedPath || previewAct4Track;
          if (!decodedPath) {
            if (state.actDecisions.act2Decision) {
              const act2Decision = state.actDecisions.act2Decision;
              const normalized = act2Decision.toUpperCase();
              if (normalized === 'A1' || normalized === 'C3') {
                trackToUse = 'Efficiency at Scale';
              } else if (normalized === 'B1' || normalized === 'C2') {
                trackToUse = 'Relational Foundation';
              } else {
                trackToUse = 'Managed Adaptation';
              }
            }
          }
          
          if (trackToUse && act4ValidPaths.includes(trackToUse)) {
            apiPath += `?path=${encodeURIComponent(trackToUse)}`;
          }
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActDashboard.tsx:before-api-call',message:'About to make API call',data:{apiPath,actNumber,sessionId,path,isPreview,fullURL:`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}${apiPath}`,apiBaseURL:process.env.REACT_APP_API_URL || 'http://localhost:3001/api'},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('[ActDashboard] Making API call', { apiPath, actNumber, sessionId, path });
      const response = await api.get(apiPath);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActDashboard.tsx:after-api-call',message:'API call completed successfully',data:{status:response.status,hasData:!!response.data,responseStatus:response.data?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('[ActDashboard] API response received', { status: response.status, data: response.data });
      
      if (response.data.status === 'success') {
        const actData = response.data.data;
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActDashboard.tsx:actData-success',message:'Act data loaded successfully',data:{hasAct:!!actData?.act,isCompleted:actData?.isCompleted,decisionOptionId:actData?.decision?.option_id,identityTrack:actData?.identityTrack,redirectTo:actData?.redirectTo,actNumber},timestamp:Date.now(),sessionId:'debug-session',runId:'act-entry-debug',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        if (!actData.act) {
          console.error('[ActDashboard] No act configuration in response');
          setError('Act configuration not found. Please contact support.');
          return;
        }
        
        setActConfig(actData.act);
        setIsCompleted(actData.isCompleted || false);

        if (actData.decision) {
          setSelectedOption(actData.decision.option_id);
          updateDecisionState(actData.decision.option_id);
        }

        if (isPreview) {
          try {
            localStorage.setItem(getPreviewCacheKey(), JSON.stringify(actData.act));
          } catch {
            // Ignore preview cache errors.
          }
        }

        updateSimulationState({
          ...(isPreview ? { participantId: 'preview' } : {}),
          mode: isPreview ? 'preview' : 'real',
          sessionId: isPreview ? null : sessionId || null,
          currentAct: actNumber,
          derivedIdentityTrack: (actData.identityTrack as Act4Track | undefined)
            || (isPreview && actNumber === 3 ? previewAct3Track : isPreview && actNumber === 4 ? previewAct4Track : null)
        });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActDashboard.tsx:updateSimulationState-success',message:'Updated simulation state after loading act data',data:{actNumber,isPreview,sessionId,derivedIdentityTrack:(actData.identityTrack as Act4Track | undefined) || (isPreview && actNumber === 3 ? previewAct3Track : isPreview && actNumber === 4 ? previewAct4Track : null),decisionOptionId:actData?.decision?.option_id},timestamp:Date.now(),sessionId:'debug-session',runId:'act-entry-debug',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        if (isPreview && actNumber === 2) {
          updateSimulationState({
            actDecisions: {
              act1Decision: previewAct2Path
            } as Partial<SimulationState['actDecisions']>
          });
        }

        // Redirect to Act IV if Act III is already completed
        if (actNumber === 3 && actData.isCompleted && sessionId && sessionId !== 'preview') {
          navigate(`/sim/${sessionId}/act/4`);
          return;
        }
        
        // Redirect to post-simulation page if Act IV is already completed
        if (actNumber === 4 && actData.isCompleted && sessionId && sessionId !== 'preview') {
          if (actData.redirectTo === 'post-simulation') {
            navigate(`/sim/${sessionId}/complete`);
            return;
          }
        }
      } else {
        console.error('[ActDashboard] API returned error status:', response.data);
        setError(response.data.message || 'Failed to load act data');
      }
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActDashboard.tsx:api-error',message:'API call failed',data:{errorMessage:err?.message,errorCode:err?.code,responseStatus:err?.response?.status,responseData:err?.response?.data,hasResponse:!!err?.response,networkError:err?.networkError,isConnectionRefused:err?.code === 'ERR_CONNECTION_REFUSED' || err?.message?.includes('ERR_CONNECTION_REFUSED'),actNumber,sessionId,apiPath,fullURL:`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}${apiPath}`},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('[ActDashboard] Error loading act data:', err);
      let errorMessage = 'Failed to load act data. Please try again.';
      
      if (err?.response?.data) {
        if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      if (err?.response?.status === 404) {
        errorMessage = 'Session not found. Please return to the landing page and start a new simulation.';
      } else if (err?.response?.status === 403) {
        errorMessage = err.response.data?.message || 'You cannot access this act yet. Please complete previous acts first.';
      } else if (!err?.response) {
        errorMessage = 'Unable to connect to the server. Please ensure the backend server is running.';
      }

      if (isPreview) {
        updateSimulationState({
          participantId: 'preview',
          mode: 'preview',
          sessionId: null,
          currentAct: actNumber,
          derivedIdentityTrack: actNumber === 3 ? previewAct3Track : actNumber === 4 ? previewAct4Track : null
        });
        try {
          const cached = localStorage.getItem(getPreviewCacheKey());
          if (cached) {
            setActConfig(JSON.parse(cached));
            setIsCompleted(false);
            setSelectedOption(null);
            setError('Preview data unavailable. Showing cached content.');
            return;
          }
        } catch {
          // Ignore cache read errors.
        }

        setActConfig(buildFallbackActConfig(actNumber));
        setIsCompleted(false);
        setSelectedOption(null);
        setError('Preview data unavailable. Showing fallback content.');
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentOpen = async (documentId: string) => {
    const isPreview = sessionId === 'preview' || !sessionId;
    if (isPreview) {
      setActiveDocument(documentId);
      return;
    }
    
    if (!sessionId) return;
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
    const isPreview = sessionId === 'preview' || !sessionId;
    if (isPreview) {
      setActiveDocument(null);
      return;
    }
    
    if (!sessionId) return;
    setActiveDocument(null);

    try {
      await api.post('/sim/doc/event', {
        sessionId,
        actNumber,
        documentId: activeDocument,
        eventType: 'close'
      });
    } catch (err) {
      console.error('Error logging document close:', err);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (isCompleted) return;
    setSelectedOption(optionId);
    if (isPreview) {
      updateDecisionState(optionId);
    }
  };

  const handleC2JustificationUpdate = (text: string, saved: boolean) => {
    setC2Justification(text);
    setC2JustificationSaved(saved);
    try {
      localStorage.setItem(getC2JustificationKey(), JSON.stringify({ text, saved }));
    } catch {
      // ignore storage errors
    }
  };

  const handleSubmit = async () => {
    const isPreview = sessionId === 'preview' || !sessionId;
    
    if (isPreview) {
      // Preview mode: Store decision in localStorage and navigate to next act
      if (!selectedOption) return;
      
      setSubmitting(true);
      setError(null);
      
      try {
        // Update decision state
        updateDecisionState(selectedOption);
        
        // Get current state to determine next act and path
        const currentState = loadSimulationState();
        const updatedDecisions = {
          ...currentState.actDecisions,
          [`act${actNumber}Decision`]: selectedOption
        };
        
        // Calculate next act and navigation path
        let nextAct: number | null = null;
        let nextPath: string | null = null;
        
        if (actNumber === 1) {
          // Act I → Act II: Use Act I decision as path (A, B, or C)
          nextAct = 2;
          nextPath = selectedOption; // A, B, or C
        } else if (actNumber === 2) {
          // Act II → Act III: Use Act II decision as path (A1, A2, A3, etc.)
          nextAct = 3;
          nextPath = selectedOption; // A1, A2, A3, B1, B2, B3, C1, C2, C3
        } else if (actNumber === 3) {
          // Act III → Act IV: Derive identity track from Act II decision
          const act2Decision = updatedDecisions.act2Decision;
          if (act2Decision) {
            // Derive identity track from Act II decision
            const normalized = act2Decision.toUpperCase();
            let identityTrack: string;
            if (normalized === 'A1' || normalized === 'C3') {
              identityTrack = 'Efficiency at Scale';
            } else if (normalized === 'B1' || normalized === 'C2') {
              identityTrack = 'Relational Foundation';
            } else {
              identityTrack = 'Managed Adaptation';
            }
            nextAct = 4;
            nextPath = identityTrack;
          }
        }
        
        // Update simulation state
        updateSimulationState({
          currentAct: nextAct || actNumber,
          actDecisions: updatedDecisions as any,
          mode: 'preview',
          sessionId: 'preview'
        });
        
        setIsCompleted(true);
        setShowConfirmModal(false);
        setJustification(''); // Clear justification after submission
        
        // Navigate to next act
        if (nextAct && nextPath) {
          setTimeout(() => {
            const encodedPath = encodeURIComponent(nextPath!);
            navigate(`/preview/act/${nextAct}/${encodedPath}`);
          }, 1000);
        } else if (actNumber === 4) {
          // Act IV completed - show completion message
          setTimeout(() => {
            alert('Preview simulation completed! You have reached the end of the simulation.');
          }, 1000);
        }
      } catch (err: any) {
        console.error('Error in preview submission:', err);
        setError('Failed to save preview decision');
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
        setJustification(''); // Clear justification after submission
        updateDecisionState(selectedOption);
        updateSimulationState({
          currentAct: response.data.data.nextAct || actNumber
        });
        if (isC2Mode) {
          copilotService
            .summarizeAct({ sessionId, actNumber, isPreview: false })
            .catch(() => {});
        }

        // Act IV redirects to post-simulation reflection page
        if (actNumber === 4 && response.data.data.redirectTo === 'post-simulation') {
          setTimeout(() => {
            navigate(`/sim/${sessionId}/complete`);
          }, 1500);
        } else if (actNumber < 4 && response.data.data.nextAct) {
          // Wait for backend transaction to commit, then navigate
          // The route guard will handle access validation, and our backend fixes
          // ensure that completed acts allow progression
          setTimeout(() => {
            console.log('[ActDashboard] Navigating to Act', response.data.data.nextAct);
            navigate(`/sim/${sessionId}/act/${response.data.data.nextAct}`);
          }, 1000);
        } else {
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

  const getStakeholderByRole = (title: string, stakeholderId?: string): Stakeholder | undefined => {
    // Use provided stakeholderId if available (for Act II)
    if (stakeholderId) {
      return stakeholders.find(s => s.id === stakeholderId);
    }
    
    // Act I mapping
    const titleMap: Record<string, string> = {
      'CFO Perspective': 'cfo-perspective',
      'Engineering Perspective': 'engineering-perspective',
      'Procurement Director Perspective': 'procurement-perspective',
      'HR Perspective': 'hr-perspective',
      'Union Letter': 'union-perspective'
    };
    const mappedId = titleMap[title] || title.toLowerCase().replace(/\s+/g, '-').replace('perspective', '').trim();
    return stakeholders.find(s => s.id === mappedId);
  };

  // Stakeholder portrait image mapping
  const stakeholderPortraits: Record<string, string> = {
    'cfo-perspective': emmaThalmanPortrait,
    'engineering-perspective': miloGergievPortrait,
    'procurement-perspective': davidWernerPortrait,
    'hr-perspective': lauraMoreauPortrait,
    'union-perspective': '', // IG Metall - no image, will use initials
  };

  const getStakeholderAvatar = (stakeholderId: string, name: string): string | null => {
    const portrait = stakeholderPortraits[stakeholderId];
    return portrait || null;
  };

  const getStakeholderInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const parseMessageMeta = (content: string) => {
    const lines = content.split('\n').map(line => line.trim());
    const fromLine = lines.find(line => line.startsWith('From:'));
    const subjectLine = lines.find(line => line.startsWith('Subject:'));
    return {
      from: fromLine ? fromLine.replace('From:', '').trim() : undefined,
      subject: subjectLine ? subjectLine.replace('Subject:', '').trim() : undefined
    };
  };

  const getAct4Track = (): Act4Track => {
    if (actNumber !== 4) {
      return 'Efficiency at Scale';
    }

    if (isPreview && decodedPreviewPath) {
      const track = decodedPreviewPath as Act4Track;
      if (track === 'Efficiency at Scale' || track === 'Managed Adaptation' || track === 'Relational Foundation') {
        return track;
      }
    }

    const identityTitle = actConfig?.context.sections.find(section => section.id === 'identity-context')?.title || '';
    if (identityTitle.includes('Discipline')) {
      return 'Efficiency at Scale';
    }
    if (identityTitle.includes('Stability')) {
      return 'Managed Adaptation';
    }
    if (identityTitle.includes('Trust')) {
      return 'Relational Foundation';
    }

    return 'Efficiency at Scale';
  };

  const act4Track = actNumber === 4 ? getAct4Track() : null;
  const act4Dashboard = act4Track ? {
    title: act4Track,
    boardSignal: act4Track === 'Efficiency at Scale'
      ? 'Margin discipline achieved; flexibility questioned'
      : act4Track === 'Managed Adaptation'
        ? 'Stability preserved; direction contested'
        : 'Trust high; financial pressure rising',
    kpis: act4Track === 'Efficiency at Scale'
      ? [
          { label: 'Revenue', value: '€434M', delta: '+3.3% YoY' },
          { label: 'Gross Margin', value: '38.6%', delta: 'Recovering' },
          { label: 'Inventory Days', value: '71', delta: 'Down from 79' },
          { label: 'Employee Pulse', value: 'Below baseline', delta: 'Turnover risk ↑' },
          { label: 'Supplier Base', value: 'Less concentrated', delta: 'Onboarding cost ↑' },
          { label: 'Capital Flexibility', value: 'Moderate', delta: 'Guarded' }
        ]
      : act4Track === 'Managed Adaptation'
        ? [
            { label: 'Revenue', value: '€448M', delta: '+6.7% YoY' },
            { label: 'Gross Margin', value: '38.1%', delta: 'Improving' },
            { label: 'Inventory Days', value: '74', delta: 'Stable' },
            { label: 'Trust Index', value: 'Improving', delta: 'Uneven by unit' },
            { label: 'Supplier Churn', value: 'Low', delta: 'Negotiations slower' },
            { label: 'Capital Flexibility', value: 'Balanced', delta: 'Selective' }
          ]
        : [
            { label: 'Revenue', value: '€410M', delta: '–2.4% YoY' },
            { label: 'Gross Margin', value: '36.9%', delta: 'Compressed' },
            { label: 'Supplier Loyalty', value: 'Strengthened', delta: 'Preferential allocation' },
            { label: 'Union Climate', value: 'Stabilized', delta: 'Strike risk ↓' },
            { label: 'Capital Flexibility', value: 'Constrained', delta: 'Limited headroom' },
            { label: 'Capability Gap', value: 'Widening', delta: 'Modernization lag' }
          ],
    riskPosture: act4Track === 'Efficiency at Scale'
      ? { label: 'Operational Rigidity', level: 'Medium–High' }
      : act4Track === 'Managed Adaptation'
        ? { label: 'Strategic Ambiguity', level: 'Medium' }
        : { label: 'Financial Constraint', level: 'High' },
    tension: act4Track === 'Efficiency at Scale'
      ? { efficiency: 65, trust: 35 }
      : act4Track === 'Managed Adaptation'
        ? { efficiency: 55, trust: 45 }
        : { efficiency: 30, trust: 70 },
    revenuePulse: act4Track === 'Efficiency at Scale'
      ? { current: 434, previous: 420 }
      : act4Track === 'Managed Adaptation'
        ? { current: 448, previous: 420 }
        : { current: 410, previous: 420 },
    marginPulse: act4Track === 'Efficiency at Scale'
      ? { current: 38.6, previous: 37.8 }
      : act4Track === 'Managed Adaptation'
        ? { current: 38.1, previous: 37.8 }
        : { current: 36.9, previous: 37.8 }
  } : null;

  // Financial data for charts
  const marginData = [
    { name: 'Baseline', value: 41.0, fill: '#3498db' },
    { name: 'Current', value: 37.8, fill: '#e74c3c' }
  ];

  const inventoryData = [
    { name: 'Days', value: 79, fill: '#f39c12' }
  ];

  const rawMaterialTrend = [14, 16, 15, 18, 20, 22, 21, 24];
  const buildSparklinePath = (values: number[]) => {
    if (values.length === 0) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(1, max - min);
    const step = 100 / (values.length - 1);
    return values
      .map((value, index) => {
        const x = index * step;
        const y = 30 - ((value - min) / range) * 24 - 3;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const copilotContextPack: CopilotContextPack | null = useMemo(() => {
    if (!actConfig) return null;

    const scenarioText = actConfig.context.sections
      .map(section => `${section.title}\n${section.content}`)
      .join('\n\n');
    const stakeholderQuotes = (actConfig.context.stakeholderPerspectives || []).map(perspective => ({
      id: perspective.id,
      name: perspective.title,
      quote: perspective.content
    }));
    const documents = actConfig.documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      content: doc.content
    }));
    const simulationState = loadSimulationState();
    const pathHistory = [
      simulationState.actDecisions.act1Decision && { act: 1, option_id: simulationState.actDecisions.act1Decision },
      simulationState.actDecisions.act2Decision && { act: 2, option_id: simulationState.actDecisions.act2Decision },
      simulationState.actDecisions.act3Decision && { act: 3, option_id: simulationState.actDecisions.act3Decision },
      simulationState.actDecisions.act4Decision && { act: 4, option_id: simulationState.actDecisions.act4Decision }
    ].filter(Boolean) as Array<{ act: number; option_id: string }>;

    const dashboardMetrics = {
      kpis: act4Dashboard?.kpis || [],
      boardSignal: act4Dashboard?.boardSignal || null,
      riskPosture: act4Dashboard?.riskPosture || null,
      tension: act4Dashboard?.tension || null,
      revenuePulse: act4Dashboard?.revenuePulse || null,
      marginPulse: act4Dashboard?.marginPulse || null,
      charts: {
        marginData,
        inventoryData,
        rawMaterialTrend
      }
    };

    return {
      act_id: actNumber,
      act_title: actConfig.title,
      scenario_text: scenarioText,
      stakeholder_quotes: stakeholderQuotes,
      documents,
      dashboard_metrics: dashboardMetrics,
      participant_path_history: pathHistory,
      current_decision_options: actConfig.options.map(option => ({
        id: option.id,
        title: option.title,
        description: option.description,
        implications: option.implications
      }))
    };
  }, [actConfig, actNumber, act4Dashboard, inventoryData, marginData, rawMaterialTrend]);

  const c2RationaleReady =
    c2JustificationSaved && c2Justification.trim().length >= C2_MIN_JUSTIFICATION;

  const getPreviewText = (text: string) => {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    const firstSentence = cleaned.split('. ')[0];
    return firstSentence.length > 120 ? `${firstSentence.slice(0, 120)}…` : firstSentence;
  };

  if (loading) {
    return (
      <div className="act-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading Act {actNumber}...</p>
      </div>
    );
  }

  if (error && !actConfig) {
    return (
      <div className="act-dashboard-error" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#c62828', marginBottom: '16px' }}>Error Loading Act {actNumber}</h2>
        <p style={{ color: '#666', marginBottom: '24px', fontSize: '16px' }}>{error}</p>
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Return to Landing Page
        </button>
      </div>
    );
  }

  if (!actConfig) {
    return (
      <div className="act-dashboard-error" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#c62828', marginBottom: '16px' }}>Act {actNumber} Not Found</h2>
        <p style={{ color: '#666', marginBottom: '24px', fontSize: '16px' }}>
          The act configuration could not be loaded. Please contact support.
        </p>
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Return to Landing Page
        </button>
      </div>
    );
  }


  const pathNames: Record<string, string> = {
    'A': 'Path A (Full SCOS Rollout)',
    'B': 'Path B (Human-Centric Renegotiation)',
    'C': 'Path C (Controlled Pilot)'
  };
  const act4TrackNames: Record<string, string> = {
    'Efficiency at Scale': 'Track 1 — Efficiency at Scale',
    'Managed Adaptation': 'Track 2 — Managed Adaptation',
    'Relational Foundation': 'Track 3 — Relational Foundation'
  };

  return (
    <div className={`act-dashboard act-${actNumber}`}>
      {/* Preview Banner */}
      {isPreview && actNumber === 2 && (
        <div className="preview-banner">
          <span className="preview-badge">PREVIEW MODE</span>
          <span className="preview-text">
            Showing Act II - {pathNames[previewAct2Path] || 'Path B'}. 
            In a real session, content depends on your Act I decision.
            {' '}
            <span className="preview-links">
              Preview: 
              <a href="/preview/act/2/A" style={{ marginLeft: '8px', marginRight: '8px', color: previewAct2Path === 'A' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct2Path === 'A' ? 'underline' : 'none' }}>A</a>
              <a href="/preview/act/2/B" style={{ marginRight: '8px', color: previewAct2Path === 'B' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct2Path === 'B' ? 'underline' : 'none' }}>B</a>
              <a href="/preview/act/2/C" style={{ color: previewAct2Path === 'C' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct2Path === 'C' ? 'underline' : 'none' }}>C</a>
            </span>
          </span>
        </div>
      )}
      
      {isPreview && actNumber === 3 && (
        <div className="preview-banner">
          <span className="preview-badge">PREVIEW MODE</span>
          <span className="preview-text">
            Showing Act III - {act4TrackNames[previewAct3Track] || 'Track 2 — Managed Adaptation'}. 
            In a real session, content depends on your Act II decision.
            {' '}
            <span className="preview-links">
              Preview Tracks: 
              <a href="/preview/act/3/Efficiency%20at%20Scale" style={{ marginLeft: '8px', marginRight: '8px', color: previewAct3Track === 'Efficiency at Scale' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct3Track === 'Efficiency at Scale' ? 'underline' : 'none' }}>Efficiency at Scale</a>
              <a href="/preview/act/3/Managed%20Adaptation" style={{ marginRight: '8px', color: previewAct3Track === 'Managed Adaptation' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct3Track === 'Managed Adaptation' ? 'underline' : 'none' }}>Managed Adaptation</a>
              <a href="/preview/act/3/Relational%20Foundation" style={{ color: previewAct3Track === 'Relational Foundation' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct3Track === 'Relational Foundation' ? 'underline' : 'none' }}>Relational Foundation</a>
            </span>
          </span>
        </div>
      )}

      {isPreview && actNumber === 4 && (
        <div className="preview-banner">
          <span className="preview-badge">PREVIEW MODE</span>
          <span className="preview-text">
            Showing Act IV - {act4TrackNames[previewAct4Track] || 'Track 1 — Efficiency at Scale'}.
            In a real session, content depends on your Act III decision.
            {' '}
            <span className="preview-links">
              Preview Tracks:
              <a
                href="/preview/act/4/Efficiency%20at%20Scale"
                style={{ marginLeft: '8px', marginRight: '8px', color: previewAct4Track === 'Efficiency at Scale' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct4Track === 'Efficiency at Scale' ? 'underline' : 'none' }}
              >
                Efficiency at Scale
              </a>
              <a
                href="/preview/act/4/Managed%20Adaptation"
                style={{ marginRight: '8px', color: previewAct4Track === 'Managed Adaptation' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct4Track === 'Managed Adaptation' ? 'underline' : 'none' }}
              >
                Managed Adaptation
              </a>
              <a
                href="/preview/act/4/Relational%20Foundation"
                style={{ color: previewAct4Track === 'Relational Foundation' ? '#fff' : 'rgba(255,255,255,0.8)', textDecoration: previewAct4Track === 'Relational Foundation' ? 'underline' : 'none' }}
              >
                Relational Foundation
              </a>
            </span>
          </span>
        </div>
      )}
      
      {/* Top Header Bar */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-section">
            <span className="logo-text">Terraform Industries – CEO</span>
          </div>
          {actNumber === 4 && act4Dashboard && (
            <div className="track-indicator">
              Track: {act4Dashboard.title}
            </div>
          )}
        </div>
        <div className="header-right">
          <button className="dashboard-nav-btn" onClick={() => {}}>
            <span className="dashboard-icon">📊</span>
            <span>Dashboard</span>
          </button>
        </div>
      </header>

      {/* Act 1 Recap Section */}
      {actNumber === 1 && (
        <div className="act1-recap-section">
          <div className="recap-content">
            <h3 className="recap-title">📋 Situation Recap & Task</h3>
            <div className="recap-body">
              <p className="recap-intro">
                As the newly appointed CEO of Terraform Industries, you are facing a critical decision regarding the implementation of a Smart Contract Optimization System (SCOS). This dashboard provides a comprehensive overview of all available information to help you make your first strategic decision for the company.
              </p>
              <div className="recap-details">
                <div className="recap-item">
                  <strong>Situation:</strong> The company is experiencing margin pressure (profit margin declined from 41.0% to 37.8%), rising raw material costs (+20% YoY), and increasing supplier demands for quarterly renegotiations. A proposal has been presented to implement SCOS, an AI-driven procurement system that could optimize supply chain operations but requires a significant upfront investment of €5M.
                </div>
                <div className="recap-item">
                  <strong>Your Task:</strong> Review all available information in this dashboard—including financial metrics, stakeholder perspectives, company context, and operational data—to make an informed decision about whether to proceed with SCOS implementation. This dashboard contains all the information you need to make your first decision as CEO.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Row / Context Bar */}
      {actNumber === 1 ? (
        <div className="context-bar">
          <div className="context-pill">
            <span className="pill-icon">🏢</span>
            <span className="pill-label">Company</span>
            <span className="pill-value">Terraform Industries</span>
          </div>
          <div className="context-pill">
            <span className="pill-icon">👤</span>
            <span className="pill-label">Role</span>
            <span className="pill-value">CEO (Newly appointed)</span>
          </div>
          <div className="context-pill">
            <span className="pill-icon">📍</span>
            <span className="pill-label">HQ</span>
            <span className="pill-value">Stuttgart, Germany</span>
          </div>
          <div className="context-pill">
            <span className="pill-icon">🏭</span>
            <span className="pill-label">Sector</span>
            <span className="pill-value">Industrial robotics</span>
          </div>
          <div className="context-pill">
            <span className="pill-icon">👥</span>
            <span className="pill-label">Employees</span>
            <span className="pill-value">1,300 (EU 1,000 | Asia 300)</span>
          </div>
          <div className="context-pill">
            <span className="pill-icon">💶</span>
            <span className="pill-label">Revenue (2024)</span>
            <span className="pill-value">€420M</span>
          </div>
          <div className="context-pill">
            <span className="pill-icon">🧭</span>
            <span className="pill-label">Progress</span>
            <span className="pill-value">Act {actNumber} of 4</span>
          </div>
        </div>
      ) : (
        <div className="kpi-cards-row">
          {actNumber === 4 && act4Dashboard ? (
            act4Dashboard.kpis.map(kpi => (
              <div key={kpi.label} className="kpi-card">
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-subtext">{kpi.delta}</div>
              </div>
            ))
          ) : (
            <>
              <div className="kpi-card">
                <div className="kpi-label">Company</div>
                <div className="kpi-value">Terraform Industries</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Role</div>
                <div className="kpi-value">CEO (Newly appointed)</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">HQ</div>
                <div className="kpi-value">Stuttgart, Germany</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Sector</div>
                <div className="kpi-value">Industrial robotics</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Employees</div>
                <div className="kpi-value">1,300 (EU 1,000 | Asia 300)</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Revenue (2024)</div>
                <div className="kpi-value">€420M</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Progress</div>
                <div className="kpi-value">Act {actNumber} of 4</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Dashboard Grid - Three Columns */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN - Situation Overview */}
        <div className="dashboard-column left-column">
          <div className="column-header">
            <h2>{actNumber === 1 ? 'Company DNA' : actNumber === 3 ? 'Crisis Dashboard' : actNumber === 4 ? 'Executive Dashboard' : 'Situation Overview'}</h2>
          </div>
          <div className="column-content">
            {/* Act I: Company Overview */}
            {actNumber === 1 && actConfig.context.sections.find(s => s.id === 'company-overview') && (
              <>
                <div className="company-dna-card">
                  <h3 className="company-dna-title">Company Overview</h3>
                  <div className="company-dna-list">
                    {actConfig.context.sections.find(s => s.id === 'company-overview')?.content.split('\n').map((line, idx) => {
                      const [label, ...rest] = line.split(':');
                      const value = rest.join(':').trim();
                      if (!label || !value) return null;
                      return (
                        <div key={idx} className="company-dna-item">
                          <span className="dna-label">{label}</span>
                          <span className="dna-value">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="company-dna-card">
                  <h3 className="company-dna-title">Core Products</h3>
                  <ul className="core-products-list">
                    <li className="core-product-item">
                      <span className="product-icon">✓</span>
                      <span>Smart Robotic Arms</span>
                    </li>
                    <li className="core-product-item">
                      <span className="product-icon">✓</span>
                      <span>Autonomous Repair Units</span>
                    </li>
                  </ul>
                </div>

                <div className="company-dna-card">
                  <h3 className="company-dna-title">Core Values</h3>
                  <ul className="core-values-list">
                    <li className="core-value-item">
                      <span className="value-icon">✓</span>
                      <span>Innovation</span>
                    </li>
                    <li className="core-value-item">
                      <span className="value-icon">✓</span>
                      <span>Quality</span>
                    </li>
                    <li className="core-value-item">
                      <span className="value-icon">✓</span>
                      <span>Reliability</span>
                    </li>
                  </ul>
                </div>

                <div className="company-dna-card">
                  <h3 className="company-dna-title">Competitive Positioning</h3>
                  <ul className="competitive-positioning-list">
                    <li>Established market presence since 1989</li>
                    <li>Strong European and Asian operations</li>
                    <li>Focus on industrial automation solutions</li>
                  </ul>
                </div>

                <div className="strategic-posture-card">
                  <div className="strategic-posture">
                    <span className="posture-label">Strategic Posture</span>
                    <span className="posture-chip">{selectedOption ? `Option ${selectedOption}` : 'Not set yet'}</span>
                  </div>
                </div>
              </>
            )}
            
            {/* Act II: KPIs / Strategic Context Update */}
            {actNumber === 2 && (
              <>
                {/* Path A: SCOS Deployment Status */}
                {actConfig.documents.find(d => d.id === 'scos-deployment-status') && (
                  <div className="signals-dashboard-card">
                    <h3>Strategic Context Update (KPIs / Signals)</h3>
                    <div className="signals-list">
                      <div className="signal-item">
                        <strong>SCOS installed:</strong> Two pilot departments
                      </div>
                      <div className="signal-item">
                        <strong>Procurement process time:</strong> –18% (but data quality issues persist)
                      </div>
                      <div className="signal-item">
                        <strong>Internal HR:</strong> +14% rise in "AI anxiety" among procurement teams
                      </div>
                      <div className="signal-item">
                        <strong>Supplier concerns:</strong> Transparency + algorithmic bias
                      </div>
                      <div className="signal-item">
                        <strong>Press inquiry:</strong> Handelsblatt about AI-induced layoffs
                      </div>
                    </div>
                    <div className="document-link-section">
                      <button 
                        className="pdf-viewer-btn"
                        onClick={() => {
                          const doc = actConfig.documents.find(d => d.id === 'scos-deployment-status');
                          if (doc) {
                            handleDocumentOpen('scos-deployment-status');
                            setShowPdfViewer(true);
                          }
                        }}
                      >
                        View Deployment Status Report
                      </button>
                    </div>
                  </div>
                )}

                {/* Path B: Q1 Renegotiation Results */}
                {actConfig.documents.find(d => d.id === 'q1-renegotiation-results') && (
                  <div className="signals-dashboard-card">
                    <h3>Strategic Context Update (KPIs / Signals)</h3>
                    <div className="signals-list">
                      <div className="signal-item">
                        <strong>Q1 renegotiations:</strong> 74% contracts secured at reduced volatility terms
                      </div>
                      <div className="signal-item">
                        <strong>Supplier satisfaction:</strong> +12% YoY
                      </div>
                      <div className="signal-item">
                        <strong>Margins:</strong> Stabilized but only modestly (+0.4%) due to inflation
                      </div>
                      <div className="signal-item">
                        <strong>Internal push:</strong> Stronger digital investment
                      </div>
                      <div className="signal-item">
                        <strong>Rumors:</strong> HexaBuild will release fully automated AI supply stack in Q3
                      </div>
                    </div>
                    <div className="document-link-section">
                      <button 
                        className="pdf-viewer-btn"
                        onClick={() => {
                          const doc = actConfig.documents.find(d => d.id === 'q1-renegotiation-results');
                          if (doc) {
                            handleDocumentOpen('q1-renegotiation-results');
                            setShowPdfViewer(true);
                          }
                        }}
                      >
                        View Q1 Renegotiation Results
                      </button>
                    </div>
                  </div>
                )}

                {/* Path C: Pilot Results */}
                {actConfig.documents.find(d => d.id === 'pilot-results-report') && (
                  <div className="signals-dashboard-card">
                    <h3>Strategic Context Update (KPIs / Signals)</h3>
                    <div className="signals-list">
                      <div className="signal-item">
                        <strong>AI pilot started:</strong> Q2 (Electrical Components)
                      </div>
                      <div className="signal-item">
                        <strong>Preliminary results:</strong> +5.4% procurement efficiency improvement in 8 weeks
                      </div>
                      <div className="signal-item">
                        <strong>Usability:</strong> High usability but low supplier response engagement
                      </div>
                      <div className="signal-item">
                        <strong>CFO:</strong> Impressed; HR flags confusion across non-pilot teams
                      </div>
                      <div className="signal-item">
                        <strong>Board:</strong> Wants clarity by next quarter
                      </div>
                    </div>
                    <div className="document-link-section">
                      <button 
                        className="pdf-viewer-btn"
                        onClick={() => {
                          const doc = actConfig.documents.find(d => d.id === 'pilot-results-report');
                          if (doc) {
                            handleDocumentOpen('pilot-results-report');
                            setShowPdfViewer(true);
                          }
                        }}
                      >
                        View Pilot Results Report
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Act III: Why This Matters + Crisis Timeline */}
            {actNumber === 3 && (
              <>
                {actConfig.context.sections.find(s => s.id === 'why-this-matters') && (
                  <div className="why-matters-card">
                    <h3>Why This Matters</h3>
                    <div className="card-content">
                      {actConfig.context.sections.find(s => s.id === 'why-this-matters')?.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
                {/* Crisis Timeline Card */}
                {actConfig.documents.find(d => d.id === 'crisis-timeline') && (
                  <div className="crisis-timeline-card">
                    <h3>Crisis Timeline</h3>
                    <div className="card-content">
                      {actConfig.documents.find(d => d.id === 'crisis-timeline')?.content.split('\n').map((line, idx) => (
                        <p key={idx} style={{ marginBottom: '8px' }}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Act IV: Executive Dashboard - All cards */}
            {actNumber === 4 && act4Dashboard && (
              <div className="executive-dashboard">
                <div className="executive-card board-signal-card">
                  <div className="executive-card-header">
                    <span className="executive-card-title">Board Signal</span>
                    <span className="executive-card-badge">High Priority</span>
                  </div>
                  <p className="executive-card-text">{act4Dashboard.boardSignal}</p>
                </div>

                <div className="executive-card">
                  <div className="executive-card-header">
                    <span className="executive-card-title">Revenue & Margin Pulse</span>
                    <span className="executive-card-subtitle">YoY trajectory</span>
                  </div>
                  <div className="pulse-row">
                    <div className="pulse-metric">
                      <div className="pulse-label">Revenue</div>
                      <div className="pulse-value">€{act4Dashboard.revenuePulse.current}M</div>
                      <div className="pulse-bar">
                        <span
                          className="pulse-bar-fill revenue"
                          style={{ width: `${Math.min(100, Math.max(10, (act4Dashboard.revenuePulse.current / 460) * 100))}%` }}
                        ></span>
                      </div>
                      <div className="pulse-subtext">Prior: €{act4Dashboard.revenuePulse.previous}M</div>
                    </div>
                    <div className="pulse-metric">
                      <div className="pulse-label">Gross Margin</div>
                      <div className="pulse-value">{act4Dashboard.marginPulse.current}%</div>
                      <div className="pulse-bar">
                        <span
                          className="pulse-bar-fill margin"
                          style={{ width: `${Math.min(100, Math.max(10, (act4Dashboard.marginPulse.current / 45) * 100))}%` }}
                        ></span>
                      </div>
                      <div className="pulse-subtext">Prior: {act4Dashboard.marginPulse.previous}%</div>
                    </div>
                  </div>
                </div>

                <div className="executive-card">
                  <div className="executive-card-header">
                    <span className="executive-card-title">Risk Posture</span>
                    <span className="executive-card-subtitle">{act4Dashboard.riskPosture.label}</span>
                  </div>
                  <div className="risk-meter">
                    <div className="risk-meter-label">{act4Dashboard.riskPosture.level}</div>
                    <div className="risk-meter-track">
                      <span
                        className={`risk-meter-fill ${act4Dashboard.riskPosture.level.includes('High') ? 'high' : act4Dashboard.riskPosture.level.includes('Medium') ? 'medium' : 'low'}`}
                      ></span>
                    </div>
                  </div>
                </div>

                <div className="executive-card">
                  <div className="executive-card-header">
                    <span className="executive-card-title">Strategic Tension</span>
                    <span className="executive-card-subtitle">Efficiency vs Trust</span>
                  </div>
                  <div className="tension-bar">
                    <div className="tension-efficiency" style={{ width: `${act4Dashboard.tension.efficiency}%` }}>
                      Efficiency {act4Dashboard.tension.efficiency}
                    </div>
                    <div className="tension-trust" style={{ width: `${act4Dashboard.tension.trust}%` }}>
                      Trust {act4Dashboard.tension.trust}
                    </div>
                  </div>
                  <div className="tension-legend">
                    <span>Efficiency</span>
                    <span>Trust</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN - Signals Dashboard */}
        <div className="dashboard-column center-column">
          <div className="column-header">
            <h2>{actNumber === 1 ? 'Operational & Strategic Reality' : actNumber === 3 ? 'Situation Overview' : actNumber === 4 ? 'Situation Overview' : 'Signals Dashboard'}</h2>
          </div>
          <div className="column-content">
            {/* Act IV: Situation Overview - Moved to center */}
            {actNumber === 4 && (
              <>
                {actConfig.context.sections.find(s => s.id === 'opening-framing') && (
                  <div className="opening-framing-panel">
                    <h3>{actConfig.context.sections.find(s => s.id === 'opening-framing')?.title}</h3>
                    <div className="card-content">
                      {actConfig.context.sections.find(s => s.id === 'opening-framing')?.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
                {actConfig.context.sections.find(s => s.id === 'identity-context') && (
                  <div className="identity-context-card">
                    <h3>{actConfig.context.sections.find(s => s.id === 'identity-context')?.title}</h3>
                    <div className="card-content">
                      {actConfig.context.sections.find(s => s.id === 'identity-context')?.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
                {actConfig.context.sections.find(s => s.id === 'strategic-synthesis') && (
                  <div className="strategic-synthesis-card">
                    <h3>{actConfig.context.sections.find(s => s.id === 'strategic-synthesis')?.title}</h3>
                    <div className="card-content">
                      {actConfig.context.sections.find(s => s.id === 'strategic-synthesis')?.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Act I: Financial Dashboard */}
            {actNumber === 1 && (
              <>
                {/* Excel-like Financial Statements */}
                <div className="financial-table-container">
                  <div className="table-header-row">
                    <h3 className="table-title">Terraform Industries Condensed Financial Statements - FY Q4 2024 (Unaudited)</h3>
                  </div>
                  
                  {/* Income Statement */}
                  <div className="financial-section">
                    <h4 className="section-title">1. Income Statement (in € millions)</h4>
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>Line Item</th>
                          <th className="text-right">Q4 2024</th>
                          <th className="text-right">Q4 2023</th>
                          <th className="text-right">YoY Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Revenue</td>
                          <td className="text-right value-cell">€420.0</td>
                          <td className="text-right">€411.4</td>
                          <td className="text-right positive-change">+2.1%</td>
                        </tr>
                        <tr>
                          <td>Cost of Goods Sold (COGS)</td>
                          <td className="text-right">(€261.2)</td>
                          <td className="text-right">(€248.0)</td>
                          <td className="text-right negative-change">+5.3%</td>
                        </tr>
                        <tr>
                          <td><strong>Gross Profit</strong></td>
                          <td className="text-right value-cell"><strong>€158.8</strong></td>
                          <td className="text-right"><strong>€163.4</strong></td>
                          <td className="text-right negative-change"><strong>-2.8%</strong></td>
                        </tr>
                        <tr>
                          <td>Gross Margin</td>
                          <td className="text-right value-cell">37.8%</td>
                          <td className="text-right">40.2%</td>
                          <td className="text-right negative-change">-2.4 pp</td>
                        </tr>
                        <tr>
                          <td>SG&A Expenses</td>
                          <td className="text-right">(€89.4)</td>
                          <td className="text-right">(€84.7)</td>
                          <td className="text-right negative-change">+5.6%</td>
                        </tr>
                        <tr>
                          <td>R&D Expenses</td>
                          <td className="text-right">(€15.4)</td>
                          <td className="text-right">(€14.2)</td>
                          <td className="text-right negative-change">+8.5%</td>
                        </tr>
                        <tr>
                          <td><strong>EBITDA</strong></td>
                          <td className="text-right value-cell"><strong>€54.0</strong></td>
                          <td className="text-right"><strong>€65.9</strong></td>
                          <td className="text-right negative-change"><strong>-18.0%</strong></td>
                        </tr>
                        <tr>
                          <td>Depreciation & Amortization</td>
                          <td className="text-right">(€18.6)</td>
                          <td className="text-right">(€16.9)</td>
                          <td className="text-right negative-change">+10.1%</td>
                        </tr>
                        <tr>
                          <td><strong>Operating Income (EBIT)</strong></td>
                          <td className="text-right value-cell"><strong>€35.4</strong></td>
                          <td className="text-right"><strong>€49.0</strong></td>
                          <td className="text-right negative-change"><strong>-27.8%</strong></td>
                        </tr>
                        <tr>
                          <td>Net Interest Expense</td>
                          <td className="text-right">(€6.2)</td>
                          <td className="text-right">(€5.1)</td>
                          <td className="text-right negative-change">+21.6%</td>
                        </tr>
                        <tr className="total-row">
                          <td><strong>Net Income</strong></td>
                          <td className="text-right value-cell"><strong>€24.0</strong></td>
                          <td className="text-right"><strong>€30.8</strong></td>
                          <td className="text-right negative-change"><strong>-22.1%</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Balance Sheet */}
                  <div className="financial-section">
                    <h4 className="section-title">2. Balance Sheet (in € millions)</h4>
                    <div className="balance-sheet-grid">
                      <div className="balance-sheet-column">
                        <h5 className="balance-sheet-header">Assets</h5>
                        <table className="excel-table balance-sheet-table">
                          <thead>
                            <tr>
                              <th>Line Item</th>
                              <th className="text-right">Q4 2024</th>
                              <th className="text-right">Q4 2023</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Cash & Equivalents</td>
                              <td className="text-right value-cell">€18.2</td>
                              <td className="text-right">€27.5</td>
                            </tr>
                            <tr>
                              <td>Accounts Receivable</td>
                              <td className="text-right value-cell">€74.0</td>
                              <td className="text-right">€69.0</td>
                            </tr>
                            <tr>
                              <td>Inventory</td>
                              <td className="text-right value-cell">€92.5</td>
                              <td className="text-right">€80.1</td>
                            </tr>
                            <tr>
                              <td>Property, Plant & Equipment (net)</td>
                              <td className="text-right value-cell">€165.0</td>
                              <td className="text-right">€154.2</td>
                            </tr>
                            <tr>
                              <td>Intangible Assets</td>
                              <td className="text-right value-cell">€47.0</td>
                              <td className="text-right">€42.8</td>
                            </tr>
                            <tr className="total-row">
                              <td><strong>Total Assets</strong></td>
                              <td className="text-right value-cell"><strong>€396.7</strong></td>
                              <td className="text-right"><strong>€373.6</strong></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="balance-sheet-column">
                        <h5 className="balance-sheet-header">Liabilities & Equity</h5>
                        <table className="excel-table balance-sheet-table">
                          <thead>
                            <tr>
                              <th>Line Item</th>
                              <th className="text-right">Q4 2024</th>
                              <th className="text-right">Q4 2023</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Accounts Payable</td>
                              <td className="text-right value-cell">€68.9</td>
                              <td className="text-right">€62.3</td>
                            </tr>
                            <tr>
                              <td>Short-term Debt</td>
                              <td className="text-right value-cell">€22.0</td>
                              <td className="text-right">€15.0</td>
                            </tr>
                            <tr>
                              <td>Long-term Debt</td>
                              <td className="text-right value-cell">€91.5</td>
                              <td className="text-right">€83.2</td>
                            </tr>
                            <tr className="total-row">
                              <td><strong>Total Liabilities</strong></td>
                              <td className="text-right value-cell"><strong>€182.4</strong></td>
                              <td className="text-right"><strong>€160.5</strong></td>
                            </tr>
                            <tr>
                              <td>Shareholders' Equity</td>
                              <td className="text-right value-cell">€214.3</td>
                              <td className="text-right">€213.1</td>
                            </tr>
                            <tr className="total-row">
                              <td><strong>Total Liabilities & Equity</strong></td>
                              <td className="text-right value-cell"><strong>€396.7</strong></td>
                              <td className="text-right"><strong>€373.6</strong></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Key Operating Metrics */}
                  <div className="financial-section">
                    <h4 className="section-title">3. Key Operating Metrics</h4>
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th className="text-right">Q4 2024</th>
                          <th className="text-right">2023</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Inventory Holding Days</td>
                          <td className="text-right value-cell">79 days</td>
                          <td className="text-right">71 days</td>
                        </tr>
                        <tr>
                          <td>Days Sales Outstanding (DSO)</td>
                          <td className="text-right value-cell">64 days</td>
                          <td className="text-right">60 days</td>
                        </tr>
                        <tr>
                          <td>Procurement Costs</td>
                          <td className="text-right value-cell">€139M</td>
                          <td className="text-right">(+7.6% YoY)</td>
                        </tr>
                        <tr>
                          <td>Top 5 Suppliers</td>
                          <td className="text-right value-cell">73%</td>
                          <td className="text-right">of total inputs</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="charts-row">
                  <div className="chart-card">
                    <h4>Margin Change</h4>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={marginData}>
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 50]} />
                        <Tooltip />
                        <Bar dataKey="value">
                          {marginData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-card">
                    <h4>Inventory Days</h4>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={inventoryData}>
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="value">
                          {inventoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-card sparkline-card">
                    <h4>Raw Material Inflation</h4>
                    <div className="sparkline-wrap">
                      <svg viewBox="0 0 100 30" className="sparkline">
                        <path d={buildSparklinePath(rawMaterialTrend)} fill="none" stroke="#f39c12" strokeWidth="2" />
                      </svg>
                      <div className="sparkline-label">+20% YoY</div>
                    </div>
                  </div>
                </div>

                {/* Trigger Panel */}
                <div className="trigger-panel alert-card">
                  <h3>▲ Procurement Crisis Alert</h3>
                  <p>Q1 2025. Terraform faces a severe supply chain procurement crisis.</p>
                  <ul>
                    <li>Raw material spot costs are &gt;20% YoY</li>
                    <li>Global steel supplier demand and start price renegotiations</li>
                    <li>Profit margin decline +0% baseline. → 37.8%</li>
                  </ul>
                </div>

                {/* Document Previews */}
                <div className="document-preview-grid">
                  {actConfig.documents.find(d => d.id === 'internal-memo-scos') && (
                    <div className="document-preview-card">
                      <div className="preview-card-header">
                        <span className="preview-icon">📄</span>
                        <div>
                          <h3>SCOS Proposal Memo</h3>
                          <p>Internal memo preview</p>
                        </div>
                      </div>
                      <div className="preview-card-body">
                        {actConfig.documents.find(d => d.id === 'internal-memo-scos')?.content.split('\n').slice(0, 4).map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                      <button
                        className="open-document-btn"
                        onClick={() => {
                          handleDocumentOpen('internal-memo-scos');
                          setShowPdfViewer(true);
                        }}
                      >
                        Open
                      </button>
                    </div>
                  )}
                  {actConfig.documents.find(d => d.id === 'market-brief') && (
                    <div className="document-preview-card">
                      <div className="preview-card-header">
                        <span className="preview-icon">📊</span>
                        <div>
                          <h3>Market Brief</h3>
                          <p>Competitor analysis</p>
                        </div>
                      </div>
                      <div className="preview-card-body">
                        {actConfig.documents.find(d => d.id === 'market-brief')?.content.split('\n').slice(0, 4).map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                      <button
                        className="open-document-btn"
                        onClick={() => {
                          handleDocumentOpen('market-brief');
                          setShowPdfViewer(true);
                        }}
                      >
                        Open
                      </button>
                    </div>
                  )}
                  {actConfig.documents.find(d => d.id === 'union-letter') && (
                    <div className="document-preview-card">
                      <div className="preview-card-header">
                        <span className="preview-icon">✉️</span>
                        <div>
                          <h3>Union Letter</h3>
                          <p>Stakeholder correspondence</p>
                        </div>
                      </div>
                      <div className="preview-card-body">
                        {actConfig.documents.find(d => d.id === 'union-letter')?.content.split('\n').slice(0, 4).map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                      <button
                        className="open-document-btn"
                        onClick={() => {
                          handleDocumentOpen('union-letter');
                          setShowPdfViewer(true);
                        }}
                      >
                        Open
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Act II: What Changed + Executive Summary */}
            {actNumber === 2 && (
              <>
                {actConfig.context.sections.find(s => s.id === 'what-changed') && (
                  <div className="what-changed-panel">
                    <h3>What Changed Since Act I?</h3>
                    <div className="card-content">
                      {actConfig.context.sections.find(s => s.id === 'what-changed')?.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
                {actConfig.context.sections.find(s => s.id === 'executive-summary') && (
                  <div className="executive-summary-card">
                    <h3>Executive Summary</h3>
                    <div className="card-content">
                      {actConfig.context.sections.find(s => s.id === 'executive-summary')?.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render any other documents */}
                {actConfig.documents.filter(d => 
                  d.id !== 'scos-deployment-status' && 
                  d.id !== 'q1-renegotiation-results' && 
                  d.id !== 'pilot-results-report'
                ).map(doc => (
                  <div key={doc.id} className="document-card">
                    <h3>{doc.title}</h3>
                    <button 
                      className="pdf-viewer-btn"
                      onClick={() => {
                        handleDocumentOpen(doc.id);
                        setShowPdfViewer(true);
                      }}
                    >
                      View {doc.title}
                    </button>
                  </div>
                ))} 
              </>
            )}

            {/* Act III: New Information + Executive Summary + Risk Assessment Matrix */}
            {actNumber === 3 && (
              <>
                {actConfig.context.sections.find(s => s.id === 'new-information') && (
                  <div className="new-information-panel">
                    <h3>New Information</h3>
                    <div className="card-content">
                      {actConfig.context.sections.find(s => s.id === 'new-information')?.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
                {actConfig.documents.find(d => d.id === 'supplier-email') && (
                  <div className="document-preview-card" style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <div className="preview-card-header">
                      <span className="preview-icon">✉️</span>
                      <div>
                        <h3>Email from PolskaStal CEO</h3>
                        <p>Contract Renegotiation Request</p>
                      </div>
                    </div>
                    <div className="preview-card-body">
                      {actConfig.documents.find(d => d.id === 'supplier-email')?.content.split('\n').slice(0, 8).map((line, idx) => (
                        <p key={idx} style={{ margin: '4px 0', fontSize: '0.95em' }}>{line}</p>
                      ))}
                    </div>
                    <button
                      className="open-document-btn"
                      onClick={() => {
                        handleDocumentOpen('supplier-email');
                        setShowPdfViewer(true);
                      }}
                    >
                      Open Full Email
                    </button>
                  </div>
                )}
                {actConfig.context.sections.find(s => s.id === 'executive-summary') && (
                  <div className="executive-summary-card">
                    <h3>Executive Summary</h3>
                    <div className="card-content">
                      {actConfig.context.sections.find(s => s.id === 'executive-summary')?.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Risk Matrix (2x2 visual) */}
                {actConfig.documents.find(d => d.id === 'risk-matrix') && (
                  <div className="risk-matrix-card">
                    <h3>Risk Assessment Matrix</h3>
                    <div className="risk-matrix-visual">
                      {/* 2x2 Grid Layout */}
                      <div className="risk-matrix-2x2">
                        {/* Top Left: Cost / Margin Risk */}
                        <div className="risk-quadrant-visual cost-margin">
                          <div className="risk-quadrant-header">
                            <span className="risk-icon">💰</span>
                            <span className="risk-title">Cost / Margin Risk</span>
                          </div>
                          <div className="risk-visual-grid">
                            <div className="risk-visual-item high">
                              <div className="risk-bar high"></div>
                              <div className="risk-text">High</div>
                              <div className="risk-desc">Accepting full 15% increase or reinstating without conditions</div>
                            </div>
                            <div className="risk-visual-item medium">
                              <div className="risk-bar medium"></div>
                              <div className="risk-text">Medium</div>
                              <div className="risk-desc">Compromise solution (8% increase or conditional reinstatement)</div>
                            </div>
                            <div className="risk-visual-item low">
                              <div className="risk-bar low"></div>
                              <div className="risk-text">Low</div>
                              <div className="risk-desc">Enforcing termination and sourcing alternatives</div>
                            </div>
                          </div>
                        </div>

                        {/* Top Right: Supply Continuity Risk */}
                        <div className="risk-quadrant-visual supply-continuity">
                          <div className="risk-quadrant-header">
                            <span className="risk-icon">📦</span>
                            <span className="risk-title">Supply Continuity Risk</span>
                          </div>
                          <div className="risk-visual-grid">
                            <div className="risk-visual-item high">
                              <div className="risk-bar high"></div>
                              <div className="risk-text">High</div>
                              <div className="risk-desc">Enforcing termination without alternative suppliers secured</div>
                            </div>
                            <div className="risk-visual-item medium">
                              <div className="risk-bar medium"></div>
                              <div className="risk-text">Medium</div>
                              <div className="risk-desc">Compromise solution with performance review</div>
                            </div>
                            <div className="risk-visual-item low">
                              <div className="risk-bar low"></div>
                              <div className="risk-text">Low</div>
                              <div className="risk-desc">Preserving relationship with price increase</div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Left: Reputation / Trust Risk */}
                        <div className="risk-quadrant-visual reputation-trust">
                          <div className="risk-quadrant-header">
                            <span className="risk-icon">🤝</span>
                            <span className="risk-title">Reputation / Trust Risk</span>
                          </div>
                          <div className="risk-visual-grid">
                            <div className="risk-visual-item high">
                              <div className="risk-bar high"></div>
                              <div className="risk-text">High</div>
                              <div className="risk-desc">Enforcing termination after long partnership</div>
                            </div>
                            <div className="risk-visual-item medium">
                              <div className="risk-bar medium"></div>
                              <div className="risk-text">Medium</div>
                              <div className="risk-desc">Compromise solution</div>
                            </div>
                            <div className="risk-visual-item low">
                              <div className="risk-bar low"></div>
                              <div className="risk-text">Low</div>
                              <div className="risk-desc">Preserving relationship</div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Right: Competitor Risk */}
                        <div className="risk-quadrant-visual competitor">
                          <div className="risk-quadrant-header">
                            <span className="risk-icon">⚔️</span>
                            <span className="risk-title">Competitor Risk (HexaBuild)</span>
                          </div>
                          <div className="risk-visual-grid">
                            <div className="risk-visual-item high">
                              <div className="risk-bar high"></div>
                              <div className="risk-text">High</div>
                              <div className="risk-desc">Losing PolskaStal to HexaBuild strengthens competitor</div>
                            </div>
                            <div className="risk-visual-item medium">
                              <div className="risk-bar medium"></div>
                              <div className="risk-text">Medium</div>
                              <div className="risk-desc">Compromise may still leave door open</div>
                            </div>
                            <div className="risk-visual-item low">
                              <div className="risk-bar low"></div>
                              <div className="risk-text">Low</div>
                              <div className="risk-desc">Securing PolskaStal loyalty blocks competitor</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="document-link-section" style={{ marginTop: '16px' }}>
                      <button 
                        className="pdf-viewer-btn"
                        onClick={() => {
                          const doc = actConfig.documents.find(d => d.id === 'risk-matrix');
                          if (doc) {
                            handleDocumentOpen('risk-matrix');
                            setShowPdfViewer(true);
                          }
                        }}
                      >
                        View Detailed Risk Matrix
                      </button>
                    </div>
                  </div>
                )}
                
              </>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN - Stakeholder Communications Inbox */}
        <div className="dashboard-column right-column">
          <div className="column-header">
            <h2>Stakeholder Communications</h2>
          </div>
          <div className="column-content inbox-container">
            {actNumber === 3 ? (
              <>
                <div className="stakeholder-list">
                  {actConfig.context.stakeholderPerspectives?.map(section => {
                    const stakeholder = getStakeholderByRole(section.title, section.id);
                    const displayName = stakeholder?.name || section.title;
                    const displayRole = stakeholder?.role || section.title;
                    const previewSource = stakeholder?.message || section.content;
                    const preview = getPreviewText(previewSource);
                    const avatarSrc = stakeholder ? getStakeholderAvatar(stakeholder.id, displayName) : null;
                    const initials = getStakeholderInitials(displayName);
                    
                    return (
                      <button
                        key={section.id}
                        type="button"
                        className={`stakeholder-item ${activeStakeholder === section.id ? 'active' : ''}`}
                        onClick={() => setActiveStakeholder(section.id)}
                      >
                        <div className="inbox-avatar stakeholder-portrait">
                          {avatarSrc ? (
                            <img 
                              src={avatarSrc} 
                              alt={displayName} 
                              className="portrait-image"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const existingInitials = parent.querySelector('.portrait-initials');
                                  if (!existingInitials) {
                                    const initialsSpan = document.createElement('span');
                                    initialsSpan.className = 'portrait-initials';
                                    initialsSpan.textContent = initials;
                                    parent.appendChild(initialsSpan);
                                  }
                                }
                              }}
                            />
                          ) : null}
                          {!avatarSrc && <span className="portrait-initials">{initials}</span>}
                        </div>
                        <div className="inbox-info">
                          <div className="inbox-name">{displayName}</div>
                          <div className="inbox-role">{displayRole}</div>
                          <div className="stakeholder-preview">{preview}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : actNumber === 1 ? (
              <div className="stakeholder-list">
                {actConfig.context.stakeholderPerspectives?.map(section => {
                  const stakeholder = getStakeholderByRole(section.title);
                  const displayName = stakeholder?.name || section.title;
                  const displayRole = stakeholder?.role || section.title;
                  const previewSource = stakeholder?.message || section.content;
                  const preview = getPreviewText(previewSource);
                  const avatarSrc = stakeholder ? getStakeholderAvatar(stakeholder.id, displayName) : null;
                  const initials = getStakeholderInitials(displayName);

                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`stakeholder-item ${activeStakeholder === section.id ? 'active' : ''}`}
                      onClick={() => setActiveStakeholder(section.id)}
                    >
                      <div className="inbox-avatar stakeholder-portrait">
                        {avatarSrc ? (
                          <img 
                            src={avatarSrc} 
                            alt={displayName} 
                            className="portrait-image"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const existingInitials = parent.querySelector('.portrait-initials');
                                if (!existingInitials) {
                                  const initialsSpan = document.createElement('span');
                                  initialsSpan.className = 'portrait-initials';
                                  initialsSpan.textContent = initials;
                                  parent.appendChild(initialsSpan);
                                }
                              }
                            }}
                          />
                        ) : null}
                        {!avatarSrc && <span className="portrait-initials">{initials}</span>}
                      </div>
                      <div className="inbox-info">
                        <div className="inbox-name">{displayName}</div>
                        <div className="inbox-role">{displayRole}</div>
                        <div className="stakeholder-preview">{preview}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="stakeholder-list">
                {actConfig.context.stakeholderPerspectives?.map(section => {
                  // For Act II and Act III, use section.id directly; for Act I, use title mapping
                  const stakeholder = (actNumber === 2 || actNumber === 3)
                    ? getStakeholderByRole(section.title, section.id)
                    : getStakeholderByRole(section.title);
                  const act4Meta = actNumber === 4 ? parseMessageMeta(section.content) : null;
                  
                  // For Act II and Act III, create stakeholder info from section if not found in hardcoded list
                  const displayName = stakeholder?.name || act4Meta?.from || section.title;
                  const displayRole = stakeholder?.role || act4Meta?.subject || section.title;
                  const previewSource = stakeholder?.message || section.content;
                  const preview = getPreviewText(previewSource);
                  const avatarSrc = stakeholder ? getStakeholderAvatar(stakeholder.id, displayName) : null;
                  const initials = getStakeholderInitials(displayName);
                  
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`stakeholder-item ${activeStakeholder === section.id ? 'active' : ''}`}
                      onClick={() => setActiveStakeholder(section.id)}
                    >
                      <div className="inbox-avatar stakeholder-portrait">
                        {avatarSrc ? (
                          <img 
                            src={avatarSrc} 
                            alt={displayName} 
                            className="portrait-image"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const existingInitials = parent.querySelector('.portrait-initials');
                                if (!existingInitials) {
                                  const initialsSpan = document.createElement('span');
                                  initialsSpan.className = 'portrait-initials';
                                  initialsSpan.textContent = initials;
                                  parent.appendChild(initialsSpan);
                                }
                              }
                            }}
                          />
                        ) : null}
                        {!avatarSrc && <span className="portrait-initials">{initials}</span>}
                      </div>
                      <div className="inbox-info">
                        <div className="inbox-name">{displayName}</div>
                        <div className="inbox-role">{displayRole}</div>
                        <div className="stakeholder-preview">{preview}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chatbot Panel - Bottom Center for C1 and C2 modes */}
      {(showC2Copilot || (showAIAssist && !showC2Copilot)) && (
        <div className="chatbot-panel-bottom-center">
          {showC2Copilot && (
            <div className="c2-copilot-container">
              <C2CopilotPanel
                actNumber={actNumber}
                sessionId={aiSessionId}
                isPreview={isPreview}
                contextPack={copilotContextPack}
                selectedOptionId={selectedOption}
                justificationText={c2Justification}
                justificationSaved={c2JustificationSaved}
                minJustificationLength={C2_MIN_JUSTIFICATION}
                onJustificationUpdate={handleC2JustificationUpdate}
                preSubmitTrigger={c2PreSubmitTrigger}
              />
            </div>
          )}
          {showAIAssist && !showC2Copilot && (
            <div className="ai-assist-container">
              <AIAssistPanel
                actNumber={actNumber}
                sessionId={aiSessionId}
                isPreview={isPreview}
                enabled={showAIAssist}
                mode={isC2Mode ? 'C2' : 'C1'}
              />
            </div>
          )}
        </div>
      )}

      {/* Decision Panel - Bottom */}
      <div className="decision-panel-bottom">
        <div className="decision-header-bottom">
          <h2>Strategic Decision</h2>
          {!isCompleted && (
            <p className="decision-warning">⚠️ You cannot change your decision after submission.</p>
          )}
        </div>
        {isCompleted ? (
          <div className="decision-completed-bottom">
            <div className="completed-icon">✓</div>
            <p>Decision Submitted: Option {selectedOption}</p>
            {actNumber === 4 && (
              <p>Strategic trajectory recorded. Proceed to final reflection. (Next: single CEO memo — no AI access.)</p>
            )}
          </div>
        ) : (
          <div className="decision-options-grid">
            {actConfig.options.map(option => (
              <div
                key={option.id}
                className={`decision-card-bottom ${selectedOption === option.id ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option.id)}
              >
                <div className="decision-header-card">
                  {actNumber !== 4 && <span className="option-badge-bottom">{option.id}</span>}
                  <h4>{option.title}</h4>
                </div>
                <p className="decision-description-bottom">{option.description}</p>
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="error-alert-bottom">{error}</div>
        )}
        {!isCompleted && (
          <button
            className="submit-decision-btn-bottom"
            onClick={() => setShowConfirmModal(true)}
            disabled={!selectedOption || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Decision'}
          </button>
        )}
      </div>

      {/* Document Viewer Modal */}
      {showPdfViewer && activeDocument && (() => {
        const doc = actConfig.documents.find(d => d.id === activeDocument);
        if (!doc) return null;
        
        const isLetter = doc.type === 'letter' || doc.id === 'union-letter';
        const isMemo = doc.type === 'memo' || doc.id === 'internal-memo-scos';
        
        return (
          <div className="modal-overlay document-viewer-overlay" onClick={() => {
            setShowPdfViewer(false);
            handleDocumentClose(activeDocument);
          }}>
            <div className="document-viewer-modal" onClick={(e) => e.stopPropagation()}>
              <div className="document-viewer-toolbar">
                <div className="toolbar-left">
                  <h3 className="document-viewer-title">{doc.title}</h3>
                </div>
                <div className="toolbar-right">
                  <button 
                    className="toolbar-btn close-btn" 
                    onClick={() => {
                      setShowPdfViewer(false);
                      handleDocumentClose(activeDocument);
                    }}
                    title="Close"
                  >
                    <span>×</span>
                  </button>
                </div>
              </div>
              <div className="document-viewer-content">
                {isLetter ? (
                  <div className="letter-document">
                    <div className="letter-header">
                      <table className="letter-metadata">
                        <tbody>
                          {doc.content.includes('To:') && (
                            <tr>
                              <td className="meta-label">To:</td>
                              <td className="meta-value">
                                {doc.content.split('\n').find(l => l.startsWith('To:'))?.replace('To:', '').trim() || 'CEO, Terraform Industries'}
                              </td>
                            </tr>
                          )}
                          {doc.content.includes('From:') && (
                            <tr>
                              <td className="meta-label">From:</td>
                              <td className="meta-value">
                                {doc.content.split('\n').find(l => l.startsWith('From:'))?.replace('From:', '').trim() || 'IG Metall Chapter'}
                              </td>
                            </tr>
                          )}
                          {doc.content.includes('Date:') && (
                            <tr>
                              <td className="meta-label">Date:</td>
                              <td className="meta-value">
                                {doc.content.split('\n').find(l => l.startsWith('Date:'))?.replace('Date:', '').trim() || 'February 2025'}
                              </td>
                            </tr>
                          )}
                          {doc.content.includes('Subject:') && (
                            <tr>
                              <td className="meta-label">Subject:</td>
                              <td className="meta-value">
                                {doc.content.split('\n').find(l => l.startsWith('Subject:'))?.replace('Subject:', '').trim() || 'Employee Protection Concerns'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="letter-body">
                      {doc.content.split('\n').filter(line => 
                        !line.startsWith('To:') && 
                        !line.startsWith('From:') && 
                        !line.startsWith('Date:') && 
                        !line.startsWith('Subject:')
                      ).map((line, idx) => {
                        if (line.trim() === '') return <br key={idx} />;
                        // Fix Union Letter numbering
                        const fixedLine = line
                          .replace(/Job Security\.\.\./g, 'Job Security…')
                          .replace(/Workplace Surveillance\.\.\./g, 'Workplace Surveillance…')
                          .replace(/Skill Devaluation\.\.\./g, 'Skill Devaluation…');
                        return <p key={idx}>{fixedLine}</p>;
                      })}
                    </div>
                  </div>
                ) : isMemo ? (
                  <div className="memo-document">
                    <div className="memo-header-section">
                      <div className="memo-header-row">
                        <span className="memo-label">To:</span>
                        <span className="memo-value">CEO, Terraform Industries</span>
                      </div>
                      <div className="memo-header-row">
                        <span className="memo-label">From:</span>
                        <span className="memo-value">Internal Strategy Team</span>
                      </div>
                      <div className="memo-header-row">
                        <span className="memo-label">Date:</span>
                        <span className="memo-value">February 4, 2025</span>
                      </div>
                      <div className="memo-header-row">
                        <span className="memo-label">Subject:</span>
                        <span className="memo-value">Proposal - Supply Chain Optimization System (SCOS)</span>
                      </div>
                    </div>
                    <div className="memo-body">
                      {doc.content.split('\n').filter(line => 
                        !line.startsWith('To:') && 
                        !line.startsWith('From:') && 
                        !line.startsWith('Date:') && 
                        !line.startsWith('Subject:')
                      ).map((line, idx) => {
                        if (line.trim() === '') return <br key={idx} />;
                        return <p key={idx}>{line}</p>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="document-body">
                    {doc.content.split('\n').map((line, idx) => {
                      if (line.trim() === '') return <br key={idx} />;
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stakeholder Viewer Modal (Act I) */}
      {actNumber === 1 && activeStakeholder && (() => {
        const activeSection = actConfig.context.stakeholderPerspectives?.find(s => s.id === activeStakeholder);
        const stakeholder = getStakeholderByRole(activeSection?.title || '');
        return (
          <div className="modal-overlay" onClick={() => setActiveStakeholder(null)}>
            <div className="modal-content stakeholder-modal" onClick={(e) => e.stopPropagation()}>
              <div className="viewer-header">
                <button className="close-viewer-btn" onClick={() => setActiveStakeholder(null)} aria-label="Close">×</button>
                <h3>{stakeholder?.name || activeSection?.title || 'Stakeholder'}</h3>
              </div>
              <div className="viewer-content">
                <div className="stakeholder-full-message">
                  {stakeholder?.message || activeSection?.content || 'No message available'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stakeholder Viewer Modal (Act II) */}
      {actNumber === 2 && activeStakeholder && (() => {
        const activeSection = actConfig.context.stakeholderPerspectives?.find(s => s.id === activeStakeholder);
        const stakeholder = getStakeholderByRole(activeSection?.title || '', activeSection?.id);
        return (
          <div className="modal-overlay" onClick={() => setActiveStakeholder(null)}>
            <div className="modal-content stakeholder-modal" onClick={(e) => e.stopPropagation()}>
              <div className="viewer-header">
                <button className="close-viewer-btn" onClick={() => setActiveStakeholder(null)} aria-label="Close">×</button>
                <h3>{stakeholder?.name || activeSection?.title || 'Stakeholder'}</h3>
              </div>
              <div className="viewer-content">
                <div className="stakeholder-full-message">
                  {stakeholder?.message || activeSection?.content || 'No message available'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stakeholder Viewer Modal (Act III) */}
      {actNumber === 3 && activeStakeholder && (() => {
        const activeSection = actConfig.context.stakeholderPerspectives?.find(s => s.id === activeStakeholder);
        const stakeholder = getStakeholderByRole(activeSection?.title || '', activeSection?.id);
        return (
          <div className="modal-overlay" onClick={() => setActiveStakeholder(null)}>
            <div className="modal-content stakeholder-modal" onClick={(e) => e.stopPropagation()}>
              <div className="viewer-header">
                <button className="close-viewer-btn" onClick={() => setActiveStakeholder(null)} aria-label="Close">×</button>
                <h3>{stakeholder?.name || activeSection?.title || 'Stakeholder'}</h3>
              </div>
              <div className="viewer-content">
                <div className="stakeholder-full-message">
                  {stakeholder?.message || activeSection?.content || 'No message available'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stakeholder Viewer Modal (Act IV) */}
      {actNumber === 4 && activeStakeholder && (() => {
        const activeSection = actConfig.context.stakeholderPerspectives?.find(s => s.id === activeStakeholder);
        const stakeholder = getStakeholderByRole(activeSection?.title || '', activeSection?.id);
        const act4Meta = parseMessageMeta(activeSection?.content || '');
        return (
          <div className="modal-overlay" onClick={() => setActiveStakeholder(null)}>
            <div className="modal-content stakeholder-modal" onClick={(e) => e.stopPropagation()}>
              <div className="viewer-header">
                <button className="close-viewer-btn" onClick={() => setActiveStakeholder(null)} aria-label="Close">×</button>
                <h3>{act4Meta?.from || stakeholder?.name || activeSection?.title || 'Stakeholder'}</h3>
              </div>
              <div className="viewer-content">
                <div className="stakeholder-full-message">
                  {stakeholder?.message || activeSection?.content || 'No message available'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

export default ActDashboard;
