import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

console.log('[DEBUG] index.tsx: Starting React app initialization');

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:9',message:'React app entry point - starting render',data:{timestamp:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'startup',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const rootElement = document.getElementById('root');
console.log('[DEBUG] index.tsx: Root element check:', { exists: !!rootElement, element: rootElement });

if (!rootElement) {
  console.error('[DEBUG] index.tsx: CRITICAL - Root element not found!');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:15',message:'Root element NOT FOUND',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'startup',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

console.log('[DEBUG] index.tsx: Root created, attempting to render App');

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:15',message:'Root element found, rendering App',data:{rootExists:!!document.getElementById('root')},timestamp:Date.now(),sessionId:'debug-session',runId:'startup',hypothesisId:'A'})}).catch(()=>{});
// #endregion

try {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:31',message:'About to call root.render',data:{hasRoot:!!root,hasApp:typeof App !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[DEBUG] index.tsx: App render initiated successfully');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:38',message:'root.render completed successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
} catch (error: any) {
  console.error('[DEBUG] index.tsx: ERROR during render:', error);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:42',message:'Render error caught',data:{errorMessage:error?.message,errorStack:error?.stack,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'landing-visibility-debug',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  throw error;
}

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:22',message:'App component rendered successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'startup',hypothesisId:'A'})}).catch(()=>{});
// #endregion

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('[DEBUG] Global error:', event.error);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:40',message:'Global error caught',data:{errorMessage:event.error?.message,errorStack:event.error?.stack,filename:event.filename,lineno:event.lineno},timestamp:Date.now(),sessionId:'debug-session',runId:'startup',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[DEBUG] Unhandled promise rejection:', event.reason);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:47',message:'Unhandled promise rejection',data:{reason:event.reason?.toString(),promise:event.promise?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'startup',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
});