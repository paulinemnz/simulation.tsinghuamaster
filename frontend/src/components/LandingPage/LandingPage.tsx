import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import api from '../../services/api';
import { resetSimulationState } from '../../services/simulationState';

// Import images
import semLogo from '../../assets/images/sem-logo.png';
import robotImage from '../../assets/images/robot-image.jpg';

const LandingPage: React.FC = () => {
  console.log('[DEBUG] LandingPage: Component initializing');
  console.log('[DEBUG] LandingPage: window.location.pathname =', window.location.pathname);
  console.log('[DEBUG] LandingPage: document exists =', !!document);
  console.log('[DEBUG] LandingPage: Component is being rendered!');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:11',message:'LandingPage component function called',data:{windowLocation:window.location.pathname,hasDocument:!!document},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  const [email, setEmail] = useState('');
  const [selectedMode, setSelectedMode] = useState<'C0' | 'C1' | 'C2' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [robotError, setRobotError] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showBackendWarning, setShowBackendWarning] = useState(false);
  const navigate = useNavigate();

  // Clear ALL persisted simulation data on mount to allow fresh input
  useEffect(() => {
    // Clear all simulation-related localStorage keys to ensure completely fresh start
    const keysToRemove = [
      'participantId',
      'simulationMode',
      'simulationSessionId',
      'simulationState',
      'simulation_state_preview',
      'userId'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Also clear any keys that start with simulation-related prefixes
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (
        key.startsWith('simulation_state_') ||
        key.startsWith('preview-act-') ||
        key.startsWith('c2Justification:') ||
        key.startsWith('simulation_')
      ) {
        localStorage.removeItem(key);
      }
    });
    
    // Reset local state
    setEmail('');
    setSelectedMode(null);
    setError(null);
    
    console.log('[LandingPage] Cleared all simulation-related localStorage');
  }, []);

  // Log error state changes
  useEffect(() => {
    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:25',message:'Error state changed',data:{error,backendStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'db-error-debug',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }
  }, [error, backendStatus]);
  
  console.log('[DEBUG] LandingPage: State initialized, hooks ready');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:22',message:'LandingPage state initialized',data:{hasNavigate:!!navigate},timestamp:Date.now(),sessionId:'debug-session',runId:'white-page-debug',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // Check backend health silently (non-blocking, no error messages)
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Quick 3s timeout
        
        // In production (browser), ALWAYS use relative path so nginx can proxy it
        // In development, use absolute URL
        const isProduction = process.env.NODE_ENV === 'production' || 
                            (typeof window !== 'undefined' && window.location.hostname.includes('railway.app'));
        let healthUrl: string;
        if (isProduction) {
          // Production: use relative path (will be proxied by nginx)
          healthUrl = '/health';
        } else {
          // Development: use absolute URL
          const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
          healthUrl = apiBaseUrl.replace(/\/api\/?$/, '') + '/health';
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:checkBackendHealth',message:'Health check URL determined',data:{healthUrl,nodeEnv:process.env.NODE_ENV,reactAppApiUrl:process.env.REACT_APP_API_URL},timestamp:Date.now(),runId:'502-debug',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:checkBackendHealth',message:'Health check response received',data:{status:response.status,statusText:response.statusText,ok:response.ok,url:response.url},timestamp:Date.now(),runId:'502-debug',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        if (response.ok) {
          const responseBody = await response.json().catch(() => ({}));
          if (responseBody?.error && (responseBody.error.includes('database') || responseBody.error.includes('Database'))) {
            setBackendStatus('offline');
            setShowBackendWarning(true);
          } else {
            setBackendStatus('online');
            setShowBackendWarning(false);
            setError(null);
          }
        } else {
          setBackendStatus('offline');
          setShowBackendWarning(true);
        }
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:checkBackendHealth',message:'Health check error',data:{errorMessage:err?.message,errorName:err?.name,errorStack:err?.stack},timestamp:Date.now(),runId:'502-debug',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // Silently handle errors - don't show error messages
        // Just mark backend as offline
        setBackendStatus('offline');
        setShowBackendWarning(true);
        // Don't set error state - allow page to load normally
      }
    };
    
    // Check once on mount, then every 10 seconds (less frequent)
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleModeSelect = (mode: 'C0' | 'C1' | 'C2') => {
    setSelectedMode(mode);
    setError(null);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:85',message:'Mode selected',data:{mode},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-debug',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
  };

  const validateEmail = (email: string): boolean => {
    // More permissive validation that accepts international email addresses
    // including Chinese and other Unicode characters
    // Basic check: has @ symbol, has at least one character before @, 
    // has at least one character after @, and contains a dot after @
    const trimmedEmail = email.trim();
    if (!trimmedEmail || trimmedEmail.length < 3) {
      return false;
    }
    
    const atIndex = trimmedEmail.indexOf('@');
    if (atIndex <= 0 || atIndex >= trimmedEmail.length - 1) {
      return false;
    }
    
    const localPart = trimmedEmail.substring(0, atIndex);
    const domainPart = trimmedEmail.substring(atIndex + 1);
    
    // Check that local part is not empty and domain part contains at least a dot
    if (!localPart || !domainPart || !domainPart.includes('.')) {
      return false;
    }
    
    // Check that domain part has at least one character after the last dot
    const lastDotIndex = domainPart.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex >= domainPart.length - 1) {
      return false;
    }
    
    return true;
  };

  const handleStartSimulation = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:24',message:'handleStartSimulation called',data:{email:email.trim(),selectedMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!selectedMode) {
      setError('Please select a mode');
      return;
    }

    setLoading(true);
    setError(null);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:38',message:'About to make API call',data:{email:email.trim(),mode:selectedMode,apiBaseURL:process.env.REACT_APP_API_URL||'http://localhost:3001/api'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    try {
      console.log('[LandingPage] Starting simulation:', { email: email.trim(), mode: selectedMode });
      
      // #region agent log
      const apiBaseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const fullURL = `${apiBaseURL}/simulations/start-with-mode`;
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:198',message:'About to make POST request to start-with-mode',data:{apiBaseURL,fullURL,endpoint:'/simulations/start-with-mode',requestBody:{participant_id:email.trim(),mode:selectedMode}},timestamp:Date.now(),runId:'debug-405',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Start simulation with the selected mode
      const response = await api.post('/simulations/start-with-mode', {
        participant_id: email.trim(),
        mode: selectedMode,
      });

      console.log('[LandingPage] API response received:', response.data);
      console.log('[LandingPage] Response status:', response.status);
      console.log('[LandingPage] Response headers:', response.headers);

      // Handle simplified response format: { ok: true, sessionId } or { ok: false, error }
      if (response.data && response.data.ok === true && response.data.sessionId) {
        const sessionId = response.data.sessionId;
        
        console.log('[LandingPage] Session created successfully:', sessionId);
        
        // Validate sessionId is a valid UUID
        if (!sessionId || typeof sessionId !== 'string') {
          console.error('[LandingPage] Invalid sessionId received:', sessionId);
          setError('Invalid session ID received from server. Please try again.');
          return;
        }
        
        // Clear any old simulation state first
        const oldStateKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('simulation_state_') ||
          key.startsWith('preview-act-') ||
          key.startsWith('c2Justification:')
        );
        oldStateKeys.forEach(key => localStorage.removeItem(key));
        
        // Store email and mode in localStorage for session management
        localStorage.setItem('participantId', email.trim());
        localStorage.setItem('simulationMode', selectedMode);
        localStorage.setItem('simulationSessionId', sessionId);

        // Completely reset simulation state for new session
        resetSimulationState({
          participantId: email.trim(),
          sessionId,
          mode: 'real',
          currentAct: 1,
          actDecisions: {
            act1Decision: null,
            act2Decision: null,
            act3Decision: null,
            act4Decision: null
          },
          derivedIdentityTrack: null
        });
        
        console.log('[LandingPage] Reset simulation state for new session:', { sessionId, email: email.trim() });
        
        // Navigate to ethical agreement before intro
        const navigationPath = `/sim/${sessionId}/ethics`;
        
        console.log('[LandingPage] Navigating to:', navigationPath);
        
        navigate(navigationPath);
      } else {
        // Handle error response
        let errorMessage = response.data?.error || response.data?.message || 'Failed to start simulation. Please try again.';
        
        // Provide more user-friendly error messages for common issues
        if (errorMessage.includes('participant') || errorMessage.includes('Participant')) {
          if (errorMessage.includes('duplicate') || errorMessage.includes('constraint') || errorMessage.includes('unique')) {
            errorMessage = 'This participant ID already exists. Please use a different participant ID or contact support if you need to continue an existing session.';
          } else if (errorMessage.includes('create') || errorMessage.includes('Failed to create')) {
            errorMessage = 'Unable to create participant account. Please try again with a different participant ID.';
          }
        }
        
        console.error('[LandingPage] API returned error response:', {
          ok: response.data?.ok,
          error: response.data?.error,
          message: response.data?.message,
          fullResponse: response.data
        });
        setError(errorMessage);
      }
    } catch (err: any) {
      // Log full error details for debugging
      console.error('[LandingPage] ERROR starting simulation:', {
        error: err,
        message: err?.message,
        response: err?.response,
        responseData: err?.response?.data,
        responseStatus: err?.response?.status,
        networkError: err?.networkError,
        code: err?.code
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:279',message:'Error caught in startSimulation',data:{errorMessage:err?.message,responseStatus:err?.response?.status,responseData:err?.response?.data,requestURL:err?.config?.url,requestMethod:err?.config?.method,baseURL:err?.config?.baseURL,fullRequestURL:`${err?.config?.baseURL}${err?.config?.url}`},timestamp:Date.now(),runId:'debug-405',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Extract error message - ALWAYS show error to user
      let errorMessage = 'Unable to start simulation.';
      
      if (err?.networkError) {
        errorMessage = err.networkError;
      } else if (err?.response?.data?.ok === false && err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (!err?.response) {
        // Network error - show friendly message
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const backendUrl = apiBaseUrl.replace(/\/api\/?$/, '');
        errorMessage = `Cannot connect to the server. Please ensure the backend server is running on ${backendUrl}`;
      } else if (err?.response?.status === 500) {
        errorMessage = 'Server error. Check backend logs for details.';
      } else if (err?.response?.status) {
        errorMessage = `Error ${err.response.status}: ${err?.response?.data?.error || err?.response?.data?.message || 'Unknown error'}`;
      }
      
      // ALWAYS show error message to user
      setError(errorMessage);
      setShowBackendWarning(true);
      setBackendStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:263',message:'LandingPage about to return JSX',data:{email:email.length,selectedMode,error:!!error,hasNavigate:!!navigate},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // #region agent log
  useEffect(() => {
    console.log('[DEBUG] LandingPage: useEffect for DOM checking running');
    const checkDOM = () => {
      const landingPageEl = document.querySelector('.landing-page');
      const landingContainerEl = document.querySelector('.landing-container');
      console.log('[DEBUG] LandingPage: DOM check - landing-page element:', !!landingPageEl);
      console.log('[DEBUG] LandingPage: DOM check - landing-container element:', !!landingContainerEl);
      if (landingPageEl) {
        const styles = window.getComputedStyle(landingPageEl);
        console.log('[DEBUG] LandingPage: CSS styles - display:', styles.display, 'visibility:', styles.visibility, 'opacity:', styles.opacity, 'width:', styles.width, 'height:', styles.height);
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:268',message:'DOM element found - checking CSS visibility',data:{display:styles.display,visibility:styles.visibility,opacity:styles.opacity,zIndex:styles.zIndex,width:styles.width,height:styles.height,hasContainer:!!landingContainerEl},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'C'})}).catch(()=>{});
      } else {
        console.log('[DEBUG] LandingPage: DOM element NOT found! Root exists:', !!document.getElementById('root'), 'All divs:', document.querySelectorAll('div').length);
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:268',message:'DOM element NOT found after render',data:{rootExists:!!document.getElementById('root'),allDivs:document.querySelectorAll('div').length},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'D'})}).catch(()=>{});
      }
    };
    setTimeout(checkDOM, 100);
    setTimeout(checkDOM, 500);
    setTimeout(checkDOM, 1000);
  }, []);
  // #endregion
  
  try {
    console.log('[DEBUG] LandingPage: About to return JSX');
    console.log('[DEBUG] LandingPage: semLogo type =', typeof semLogo, 'value =', semLogo);
    console.log('[DEBUG] LandingPage: robotImage type =', typeof robotImage, 'value =', robotImage);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:285',message:'About to return JSX - entering try block',data:{semLogoType:typeof semLogo,robotImageType:typeof robotImage},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.log('[DEBUG] LandingPage: Returning JSX now');
    return (
      <div className="landing-page" style={{ backgroundColor: '#fafafa', minHeight: '100vh', width: '100%', display: 'block', position: 'relative' }}>
        <div className="landing-container" style={{ backgroundColor: 'white', padding: '20px' }}>
        <div className="landing-header">
          <div className="logo-section">
            <div className="sem-logo">
              <div className="sem-logo-emblem">
                {!logoError ? (
                  <img 
                    src={semLogo} 
                    alt="Tsinghua SEM Logo" 
                    className="sem-logo-img"
                    onError={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:240',message:'SEM logo failed to load',data:{src:String(semLogo)},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-debug',hypothesisId:'H2'})}).catch(()=>{});
                      // #endregion
                      setLogoError(true);
                    }}
                  />
                ) : (
                  <div className="sem-logo-placeholder">SEM</div>
                )}
              </div>
              <div className="sem-logo-text-section">
                <div className="sem-logo-sem">SEM</div>
                <div className="sem-logo-university">TSINGHUA UNIVERSITY</div>
                <div className="sem-logo-chinese">清华经管学院</div>
              </div>
            </div>
          </div>
          
          <div className="simulation-intro">
            <div className="simulation-image">
              <div className="simulation-image-container">
                {!robotError ? (
                  <img 
                    src={robotImage} 
                    alt="Futuristic Robot" 
                    className="robot-image"
                    onError={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:262',message:'Robot image failed to load',data:{src:String(robotImage)},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-debug',hypothesisId:'H2'})}).catch(()=>{});
                      // #endregion
                      setRobotError(true);
                    }}
                  />
                ) : (
                  <div className="robot-image-placeholder">Robot Image</div>
                )}
              </div>
            </div>
            
            <div className="simulation-content">
              <h1 className="simulation-title">Terraform Industries</h1>
              <p className="simulation-description">
                You are stepping into the role of CEO at Terraform Industries, a mid-sized European manufacturer of modular construction robotics. The company is entering a turbulent period: inflation is eroding margins, procurement has become increasingly volatile, and strategic choices now carry heightened consequences.
              </p>
              <p className="simulation-description">
                In this simulation, you will face a critical decision that will shape the future of Terraform Industries. You will need to weigh competing priorities, manage stakeholder expectations, and chart a path forward under uncertainty. The experience will challenge you to think strategically about transformation, organizational resilience, and the role of leadership when pressures on the supply chain intensify.
              </p>
              <div className="simulation-meta">
                <span className="meta-tag">Strategy Simulation</span>
                <span className="meta-tag">Single Player</span>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-content">
          <div className="participant-input-section">
            <label htmlFor="email-address" className="input-label">
              Email Address
            </label>
            <input
              id="email-address"
              type="email"
              className="participant-input"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && email && selectedMode) {
                  handleStartSimulation();
                }
              }}
              disabled={loading}
            />
          </div>

          <div className="mode-selection-section">
            <div className="mode-buttons">
              <button
                className={`mode-button ${selectedMode === 'C0' ? 'selected' : ''}`}
                onClick={() => handleModeSelect('C0')}
                disabled={loading}
                aria-label="Mode C0"
              >
                C0
              </button>

              <button
                className={`mode-button ${selectedMode === 'C1' ? 'selected' : ''}`}
                onClick={() => handleModeSelect('C1')}
                disabled={loading}
                aria-label="Mode C1"
              >
                C1
              </button>

              <button
                className={`mode-button ${selectedMode === 'C2' ? 'selected' : ''}`}
                onClick={() => handleModeSelect('C2')}
                disabled={loading}
                aria-label="Mode C2"
              >
                C2
              </button>
            </div>
          </div>

          {/* Show error messages prominently */}
          {error && (
            <div className="error-message" style={{ 
              padding: '16px', 
              backgroundColor: '#fee', 
              border: '1px solid #fcc', 
              borderRadius: '4px',
              color: '#c33',
              marginTop: '16px'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {showBackendWarning && backendStatus === 'offline' && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffc107', 
              borderRadius: '4px',
              color: '#856404',
              marginTop: '16px'
            }}>
              <strong>Warning:</strong> Backend server appears to be offline. {process.env.NODE_ENV === 'production' ? 'Please check backend configuration and ensure the backend service is running.' : `Please ensure the backend is running on ${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:3001'}`}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              className="start-button"
              onClick={handleStartSimulation}
              disabled={loading || !email.trim() || !selectedMode}
            >
              {loading ? (
                <span className="loading-text">
                  <span className="spinner"></span>
                  Starting Simulation...
                </span>
              ) : (
                'Begin Simulation'
              )}
            </button>
          </div>

          <div className="email-note" style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: '#6c757d',
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            <strong>Note:</strong> Your email address will be used to send you the results of the simulation after it is completed.
          </div>
        </div>
      </div>
    </div>
    );
  } catch (renderError: any) {
    console.error('[DEBUG] LandingPage: ERROR during render:', renderError);
    console.error('[DEBUG] LandingPage: Error message:', renderError?.message);
    console.error('[DEBUG] LandingPage: Error stack:', renderError?.stack);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPage.tsx:470',message:'LandingPage render error caught',data:{errorMessage:renderError?.message,errorStack:renderError?.stack,errorName:renderError?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Error Loading Landing Page</h1>
        <p>{renderError?.message || 'Unknown error'}</p>
      </div>
    );
  }
};

export default LandingPage;
