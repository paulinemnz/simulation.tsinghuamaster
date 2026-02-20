import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import LandingPage from './components/LandingPage/LandingPage';
import EthicalAgreement from './components/EthicalAgreement/EthicalAgreement';
import PreSimulation from './components/PreSimulation/PreSimulation';
import ImmersiveIntro from './components/ImmersiveIntro/ImmersiveIntro';
import ActDashboard from './components/Act/ActDashboard';
import Act1DocumentsSequence from './components/Act/Act1DocumentsSequence';
import ActPlaceholder from './components/Act/ActPlaceholder';
import AdminShell from './components/Admin/AdminShell';
import PostTaskReflection from './components/PostTask/PostTaskReflection';
import DebugHUD from './components/Debug/DebugHUD';
import ActRouteGuard from './components/Act/ActRouteGuard';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:5',message:'App component module loaded',data:{reactRouterAvailable:typeof Router !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'startup',hypothesisId:'B'})}).catch(()=>{});
// #endregion

// Placeholder components - will be implemented later
const ParticipantDashboard = () => <div>Participant Dashboard (Coming Soon)</div>;
const ResearcherDashboard = () => <div>Researcher Dashboard (Coming Soon)</div>;
const Login = () => {
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:18',message:'Login component rendered',data:{path:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'A'})}).catch(()=>{});
  }, []);
  // #endregion
  return <div>Login (Coming Soon)</div>;
};

function App() {
  console.log('[DEBUG] App.tsx: App component rendering');
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:27',message:'App function component executing',data:{currentPath:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'B'})}).catch(()=>{});
  }, []);
  // #endregion
  
  // Track route changes
  useEffect(() => {
    const handleRouteChange = () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:33',message:'Route change detected',data:{path:window.location.pathname,hash:window.location.hash},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    };
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);
  
  try {
    console.log('[DEBUG] App.tsx: Creating Router and Routes');
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:49',message:'About to render Router with Routes',data:{initialPath:window.location.pathname,hasRouter:typeof Router !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return (
      <Router>
        <div className="App">
          <DebugHUD />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/preview/act/1" element={<ActDashboard actNumber={1} sessionId="preview" />} />
            <Route path="/preview/act/2" element={<ActDashboard actNumber={2} sessionId="preview" />} />
            <Route path="/preview/act/2/:path" element={<ActDashboard actNumber={2} sessionId="preview" />} />
            <Route path="/preview/act/3" element={<ActDashboard actNumber={3} sessionId="preview" />} />
            <Route path="/preview/act/3/:path" element={<ActDashboard actNumber={3} sessionId="preview" />} />
            <Route path="/preview/act/4" element={<ActDashboard actNumber={4} sessionId="preview" />} />
            <Route path="/preview/act/4/:path" element={<ActDashboard actNumber={4} sessionId="preview" />} />
            <Route path="/sim/:sessionId/ethics" element={<EthicalAgreement />} />
            <Route path="/sim/:sessionId/pre-simulation" element={<PreSimulation />} />
            <Route path="/sim/:sessionId/intro" element={<ImmersiveIntro />} />
            <Route path="/sim/:sessionId/act/1/documents" element={<Act1DocumentsSequence />} />
            <Route path="/sim/:sessionId/act/1" element={
              <ActRouteGuard actNumber={1}>
                <ActDashboard actNumber={1} />
              </ActRouteGuard>
            } />
            <Route path="/sim/:sessionId/act/2" element={
              <ActRouteGuard actNumber={2}>
                <ActDashboard actNumber={2} />
              </ActRouteGuard>
            } />
            <Route path="/sim/:sessionId/act/3" element={
              <ActRouteGuard actNumber={3}>
                <ActDashboard actNumber={3} />
              </ActRouteGuard>
            } />
            <Route path="/sim/:sessionId/act/4" element={
              <ActRouteGuard actNumber={4}>
                <ActDashboard actNumber={4} />
              </ActRouteGuard>
            } />
            <Route path="/sim/:sessionId/complete" element={<PostTaskReflection />} />
            <Route path="/sim/:sessionId/post-task" element={<PostTaskReflection />} />
            <Route path="/participant/*" element={<ParticipantDashboard />} />
            <Route path="/researcher/*" element={<ResearcherDashboard />} />
            <Route path="/admin/*" element={<AdminShell />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    );
  } catch (error: any) {
    console.error('[DEBUG] App.tsx: ERROR in render:', error);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:35',message:'App render error',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'startup',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return <div>Error loading app: {error?.message || 'Unknown error'}</div>;
  }
}

export default App;