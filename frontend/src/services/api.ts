import axios from 'axios';

// Determine API URL: In production (browser), ALWAYS use relative path so nginx can proxy
// This ensures we never use absolute URLs in production, even if REACT_APP_API_URL is set
const isProduction = process.env.NODE_ENV === 'production' || 
                     (typeof window !== 'undefined' && window.location.hostname.includes('railway.app'));
const API_URL = isProduction 
  ? '/api'  // Always use relative path in production - nginx will proxy to backend
  : (process.env.REACT_APP_API_URL || 'http://localhost:3001/api');

console.log('[DEBUG] API service initialized:', { 
  apiURL: API_URL, 
  envVar: process.env.REACT_APP_API_URL, 
  nodeEnv: process.env.NODE_ENV,
  isProduction: isProduction,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  usingRelativePath: API_URL === '/api'
});

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:3',message:'API service initialized',data:{apiURL:API_URL,envVar:process.env.REACT_APP_API_URL,usingDefault:!process.env.REACT_APP_API_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:request',message:'API request initiated',data:{url:config.url,method:config.method,baseURL:config.baseURL,fullURL:`${config.baseURL}${config.url}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  return config;
});

// Handle token expiration and network errors
api.interceptors.response.use(
  (response) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:response',message:'API response received',data:{status:response.status,url:response.config.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return response;
  },
  (error) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:error',message:'API error intercepted',data:{errorMessage:error.message,errorCode:error.code,hasResponse:!!error.response,responseStatus:error.response?.status,requestURL:error.config?.url,baseURL:error.config?.baseURL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Handle 502 Bad Gateway errors (nginx can't reach backend)
    if (error.response?.status === 502) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:error',message:'502 Bad Gateway error',data:{requestURL:error.config?.url,baseURL:error.config?.baseURL,fullURL:`${error.config?.baseURL}${error.config?.url}`},timestamp:Date.now(),runId:'502-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      error.networkError = 'Error 502: Bad Gateway - nginx cannot reach the backend server. Please check that the backend service is running and BACKEND_URL is configured correctly.';
    }
    
    // Handle 503 Service Unavailable errors (backend service is down or not responding)
    if (error.response?.status === 503) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:error',message:'503 Service Unavailable error',data:{requestURL:error.config?.url,baseURL:error.config?.baseURL,fullURL:`${error.config?.baseURL}${error.config?.url}`},timestamp:Date.now(),runId:'503-debug',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      error.networkError = 'Error 503: Service Unavailable - the backend service is not responding. Please check backend service logs on Railway.';
    }
    
    // Handle network errors (no response from server)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.networkError = 'Request timeout - the server took too long to respond. Please check if the backend server is running.';
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        // In production, don't show absolute URLs in error messages
        if (process.env.NODE_ENV === 'production') {
          error.networkError = 'Network error - unable to connect to the server. Please check backend configuration.';
        } else {
          const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
          const backendUrl = apiBaseUrl.replace(/\/api\/?$/, '');
          error.networkError = `Network error - unable to connect to the server. Please ensure the backend server is running on ${backendUrl}`;
        }
      } else {
        error.networkError = `Connection error: ${error.message}. Please ensure the backend server is running.`;
      }
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Don't redirect admin routes to /login - let AdminShell handle it
      const isAdminRoute = error.config?.url?.includes('/admin');
      if (!isAdminRoute) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;