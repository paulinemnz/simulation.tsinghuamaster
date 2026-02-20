import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

console.log('[DEBUG] API service initialized:', { 
  apiURL: API_URL, 
  envVar: process.env.REACT_APP_API_URL, 
  usingDefault: !process.env.REACT_APP_API_URL 
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
    
    // Handle network errors (no response from server)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.networkError = 'Request timeout - the server took too long to respond. Please check if the backend server is running.';
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const backendUrl = apiBaseUrl.replace(/\/api\/?$/, '');
        error.networkError = `Network error - unable to connect to the server. Please ensure the backend server is running on ${backendUrl}`;
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