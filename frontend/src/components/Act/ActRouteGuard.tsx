/**
 * Route guard component to prevent invalid act access
 * Ensures users can only access acts in sequence
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSimulationState } from '../../hooks/useSimulationState';

interface ActRouteGuardProps {
  children: React.ReactNode;
  actNumber: number;
}

const ActRouteGuard: React.FC<ActRouteGuardProps> = ({ children, actNumber }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get participant info from localStorage
  const participantId = localStorage.getItem('participantId') || 'preview';
  const mode = (localStorage.getItem('simulationMode') as 'C0' | 'C1' | 'C2') || 'C0';

  const { state } = useSimulationState(participantId, sessionId || null, mode);

  useEffect(() => {
    const validateAccess = async () => {
      if (!sessionId || sessionId === 'preview') {
        // Preview mode: allow access
        setIsValid(true);
        setLoading(false);
        return;
      }

      // Add a small delay to allow backend updates to complete after act submission
      // This helps with timing issues when navigating immediately after submission
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // Check if session exists and can access this act
        const sessionResponse = await api.get(`/sim/${sessionId}/act/${actNumber}`);
        
        if (sessionResponse.data.status === 'error') {
          const errorMsg = sessionResponse.data.message;
          
          // Check if it's an access denied error
          if (errorMsg.includes('Cannot access') || errorMsg.includes('must be completed') || errorMsg.includes('Please complete')) {
            // If trying to access Act 2 and Act 1 is completed, the backend should allow it
            // But if we get here, try waiting a bit more and retry once
            if (actNumber === 2) {
              console.log('[ActRouteGuard] Access denied for Act 2, retrying after delay...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                const retryResponse = await api.get(`/sim/${sessionId}/act/${actNumber}`);
                if (retryResponse.data.status === 'success') {
                  setIsValid(true);
                  setLoading(false);
                  return;
                }
              } catch (retryErr) {
                // Retry failed, proceed with redirect
              }
            }
            
            // Try to determine the correct act to redirect to
            let redirectAct = actNumber - 1;
            if (redirectAct < 1) redirectAct = 1;
            
            // Try to verify the redirect act is accessible
            try {
              await api.get(`/sim/${sessionId}/act/${redirectAct}`);
              navigate(`/sim/${sessionId}/act/${redirectAct}`, { replace: true });
            } catch {
              // Fallback to Act 1
              navigate(`/sim/${sessionId}/act/1`, { replace: true });
            }
            setIsValid(false);
            setError(errorMsg);
            setLoading(false);
            return;
          }
          
          setError(errorMsg);
          setIsValid(false);
          setLoading(false);
          return;
        }

        // Access granted
        setIsValid(true);
        setLoading(false);
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to validate act access';
        
        // If 403 for Act 2, retry once after delay (handles race condition)
        if (err.response?.status === 403 && actNumber === 2) {
          console.log('[ActRouteGuard] 403 for Act 2, retrying after delay...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            const retryResponse = await api.get(`/sim/${sessionId}/act/${actNumber}`);
            if (retryResponse.data.status === 'success') {
              setIsValid(true);
              setLoading(false);
              return;
            }
          } catch (retryErr) {
            // Retry failed, proceed with redirect
          }
        }
        
        // If 403, it means access is denied - try to redirect to previous act
        if (err.response?.status === 403) {
          // Try to access the previous act
          let redirectAct = actNumber - 1;
          if (redirectAct < 1) redirectAct = 1;
          
          try {
            await api.get(`/sim/${sessionId}/act/${redirectAct}`);
            navigate(`/sim/${sessionId}/act/${redirectAct}`, { replace: true });
          } catch {
            // Fallback: try Act 1
            navigate(`/sim/${sessionId}/act/1`, { replace: true });
          }
        } else if (err.response?.status === 404) {
          // Session not found
          navigate('/', { replace: true });
        }
        
        setError(errorMsg);
        setIsValid(false);
        setLoading(false);
      }
    };

    validateAccess();
  }, [sessionId, actNumber, navigate, state]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="loading-spinner"></div>
        <p>Validating access...</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>{error || 'You cannot access this act. Please complete previous acts first.'}</p>
        {sessionId && (
          <button onClick={() => navigate(`/sim/${sessionId}/act/${state?.currentAct || 1}`)}>
            Go to Current Act
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export default ActRouteGuard;
