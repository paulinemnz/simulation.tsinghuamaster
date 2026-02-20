import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { SimulationSession } from '../models/SimulationSession';
import { ActProgress } from '../models/ActProgress';
import { DecisionEvent, DecisionEventData } from '../models/DecisionEvent';
import { DocumentEvent } from '../models/DocumentEvent';
import { Memo } from '../models/Memo';
import { getActConfig, ActConfig, deriveIdentityTrackFromAct2Decision, getAct2DecisionForIdentityTrack, IdentityTrack } from '../config/actConfig';
import { pool } from '../database/connection';
import { logEventForSession } from '../services/eventLogger';
import { hasColumn } from '../database/schemaValidator';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

// File-based logging helper
const logToFile = (message: string, data: any) => {
  try {
    const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
    // Ensure .cursor directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logEntry = JSON.stringify({
      location: 'acts.ts',
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'preview-debug'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry);
  } catch (e) {
    // Ignore logging errors - don't crash the server
  }
};

// Log module load
console.log('[ACTS-ROUTES] Module loaded, about to register routes');
logToFile('ACTS-ROUTES: module loaded', { timestamp: Date.now() });

// Helper function for logging operations
const logOperation = (operation: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ACT-API] ${operation}`, data);
  }
};

/**
 * GET /api/sim/preview/act/:actNumber
 * Get act content for preview (no session required)
 * For Act II, can specify path via query parameter: ?path=A|B|C
 * IMPORTANT: This route must be defined BEFORE /:sessionId/act/:actNumber
 * to prevent "preview" from being matched as a sessionId
 */
console.log('[ROUTE-REGISTRATION] Registering preview route: /preview/act/:actNumber');
logToFile('ROUTE-REGISTRATION: preview route', { route: '/preview/act/:actNumber' });
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:route-registration',message:'Registering preview route',data:{route:'/preview/act/:actNumber'},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'A'})}).catch(()=>{});
// #endregion
router.get(
  '/preview/act/:actNumber',
  [
    param('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('[PREVIEW-ROUTE] Preview route handler called!', { path: req.path, url: req.url, params: req.params, query: req.query });
    logToFile('PREVIEW-ROUTE: handler called', { path: req.path, url: req.url, params: req.params, query: req.query });
    // #region agent log
    try { fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:preview-route-entry',message:'Preview route handler entered',data:{path:req.path,url:req.url,params:req.params,actNumberParam:req.params.actNumber,actNumberType:typeof req.params.actNumber,query:req.query},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'A'})}).catch(()=>{}); } catch(e) {}
    // #endregion
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:preview-before-validation',message:'Before validation check',data:{actNumberParam:req.params.actNumber,actNumberParsed:parseInt(req.params.actNumber),isNaN:isNaN(parseInt(req.params.actNumber))},timestamp:Date.now(),sessionId:'debug-session',runId:'preview-debug',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const errors = validationResult(req);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:preview-validation-result',message:'Validation result',data:{hasErrors:!errors.isEmpty(),errorsCount:errors.array().length,errors:errors.array()},timestamp:Date.now(),sessionId:'debug-session',runId:'preview-debug',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!errors.isEmpty()) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:preview-validation-error',message:'Validation errors found',data:{errors:errors.array(),statusCode:400},timestamp:Date.now(),sessionId:'debug-session',runId:'preview-debug',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return res.status(400).json({ 
          status: 'error', 
          message: 'Invalid request parameters',
          errors: errors.array() 
        });
      }

      const actNumber = parseInt(req.params.actNumber);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:preview-after-parse',message:'After parsing actNumber',data:{actNumber,actNumberParam:req.params.actNumber},timestamp:Date.now(),sessionId:'debug-session',runId:'preview-debug',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Get path parameter for Act II (A, B, or C), Act III (A1, A2, A3, B1, B2, B3, C1, C2, C3), or Act IV (identity track)
      const pathParam = req.query.path as string;
      let act1Decision: string | undefined;
      let act2Decision: string | undefined;
      let identityTrack: IdentityTrack | undefined;
      
      if (actNumber === 2) {
        // Act II preview: path is Act I decision (A, B, or C)
        act1Decision = (pathParam && ['A', 'B', 'C'].includes(pathParam.toUpperCase())) 
          ? pathParam.toUpperCase() 
          : 'B';
      } else if (actNumber === 3) {
        // Act III preview: allow identity track override or Act II decision path
        const act3ValidPaths = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
        const trackParam = req.query.track as string | undefined;
        const decodedTrackParam = trackParam ? decodeURIComponent(trackParam) : trackParam;
        const validTracks: IdentityTrack[] = ['Efficiency at Scale', 'Managed Adaptation', 'Relational Foundation'];
        const normalizedPath = pathParam ? pathParam.toUpperCase() : pathParam;
        const hasValidDecisionPath = !!(normalizedPath && act3ValidPaths.includes(normalizedPath));
        const hasValidTrack = !!(decodedTrackParam && validTracks.includes(decodedTrackParam as IdentityTrack));

        if (hasValidTrack) {
          identityTrack = decodedTrackParam as IdentityTrack;
          act2Decision = getAct2DecisionForIdentityTrack(identityTrack);
        } else if (hasValidDecisionPath) {
          act2Decision = normalizedPath!;
          identityTrack = deriveIdentityTrackFromAct2Decision(act2Decision);
        } else {
          identityTrack = 'Managed Adaptation';
          act2Decision = getAct2DecisionForIdentityTrack(identityTrack);
        }

        if (act2Decision) {
          act1Decision = act2Decision.charAt(0);
        }
      } else if (actNumber === 4) {
        // Act IV preview: path is identity track (Efficiency at Scale, Managed Adaptation, Relational Foundation)
        // For preview, accept path parameter or default to first track
        const validTracks: IdentityTrack[] = ['Efficiency at Scale', 'Managed Adaptation', 'Relational Foundation'];
        // Decode pathParam in case it's URL-encoded (Express should decode automatically, but be safe)
        const decodedPathParam = pathParam ? decodeURIComponent(pathParam) : undefined;
        const isValidTrack = decodedPathParam !== undefined && validTracks.includes(decodedPathParam as IdentityTrack);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'acts.ts:act4-path-check',
            message: 'Checking Act IV path parameter',
            data: {
              pathParam,
              decodedPathParam,
              pathParamType: typeof pathParam,
              validTracks,
              isValidTrack
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'act4-preview-debug',
            hypothesisId: 'B'
          })
        }).catch(() => {});
        // #endregion
        identityTrack = isValidTrack
          ? (decodedPathParam as IdentityTrack)
          : 'Efficiency at Scale';
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act4-identity-track-set',message:'Identity track determined',data:{identityTrack},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
      
      logOperation('GET_PREVIEW_ACT_REQUEST', { actNumber, pathParam, act1Decision, act2Decision, identityTrack });

      // Create mock previous decisions for preview
      let actConfig: ActConfig | null;
      if (actNumber === 2 && act1Decision) {
        // Act II preview: need Act I decision
        const mockPreviousDecisions: DecisionEventData[] = [
          {
            simulation_session_id: 'preview',
            act_number: 1,
            option_id: act1Decision,
            submitted_at: new Date().toISOString()
          }
        ];
        actConfig = getActConfig(actNumber, mockPreviousDecisions);
      } else if (actNumber === 3 && act1Decision && act2Decision) {
        // Act III preview: need both Act I and Act II decisions
        const mockPreviousDecisions: DecisionEventData[] = [
          {
            simulation_session_id: 'preview',
            act_number: 1,
            option_id: act1Decision,
            submitted_at: new Date().toISOString()
          },
          {
            simulation_session_id: 'preview',
            act_number: 2,
            option_id: act2Decision,
            submitted_at: new Date().toISOString()
          }
        ];
        actConfig = getActConfig(actNumber, mockPreviousDecisions);
      } else if (actNumber === 4) {
        // Act IV preview: need identity track
        // #region agent log
        try { fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:before-getActConfig-act4',message:'About to call getActConfig for Act IV',data:{actNumber,identityTrack,identityTrackType:typeof identityTrack,hasIdentityTrack:!!identityTrack},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'C'})}).catch(()=>{}); } catch(e) {}
        // #endregion
        // Ensure identityTrack is set (should be set above, but double-check)
        if (!identityTrack) {
          identityTrack = 'Efficiency at Scale'; // Default fallback
          // #region agent log
          try { fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act4-identity-track-fallback',message:'Identity track was missing, using default',data:{identityTrack},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'C'})}).catch(()=>{}); } catch(e) {}
          // #endregion
        }
        try {
          actConfig = getActConfig(actNumber, undefined, identityTrack);
          // #region agent log
          try { fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:after-getActConfig-act4',message:'getActConfig returned',data:{hasConfig:!!actConfig,actNumber,configTitle:actConfig?.title,configOptionsCount:actConfig?.options?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'C'})}).catch(()=>{}); } catch(e) {}
          // #endregion
        } catch (getConfigError: any) {
          // #region agent log
          try { fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:getActConfig-act4-error',message:'getActConfig threw error for Act IV',data:{actNumber,identityTrack,errorMessage:getConfigError?.message,errorStack:getConfigError?.stack,errorName:getConfigError?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'C'})}).catch(()=>{}); } catch(e) {}
          // #endregion
          logOperation('GET_ACT_CONFIG_ERROR', { actNumber, identityTrack, error: getConfigError.message });
          logToFile('GET_ACT_CONFIG_ERROR', { actNumber, identityTrack, error: getConfigError.message, stack: getConfigError.stack });
          throw getConfigError; // Re-throw to be caught by outer try-catch
        }
      } else {
        // Get act configuration for other acts (Act I)
        actConfig = getActConfig(actNumber);
      }
      if (!actConfig) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act-config-not-found',message:'Act config not found',data:{actNumber,identityTrack},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        logOperation('PREVIEW_ACT_CONFIG_NOT_FOUND', { actNumber });
        return res.status(404).json({ 
          status: 'error', 
          message: `Act ${actNumber} configuration not found` 
        });
      }

      logOperation('GET_PREVIEW_ACT_SUCCESS', { actNumber, path: actNumber === 2 ? act1Decision : act2Decision });

      res.json({
        status: 'success',
        data: {
          act: actConfig,
          isCompleted: false,
          progress: null,
          decision: null,
          previewPath: actNumber === 2 ? act1Decision : act2Decision, // Include which path is being previewed
          identityTrack: actNumber >= 3 ? identityTrack : undefined
        }
      });
    } catch (error: any) {
      logOperation('GET_PREVIEW_ACT_ERROR', { 
        actNumber: req.params?.actNumber,
        error: error.message, 
        stack: error.stack
      });
      logToFile('GET_PREVIEW_ACT_ERROR', { 
        actNumber: req.params?.actNumber,
        error: error.message, 
        stack: error.stack,
        name: error?.name
      });
      // #region agent log
      try { fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:preview-error-catch',message:'Error caught in preview route',data:{actNumber:req.params?.actNumber,errorMessage:error?.message,errorStack:error?.stack,errorName:error?.name,headersSent:res.headersSent},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-preview-debug',hypothesisId:'F'})}).catch(()=>{}); } catch(e) {}
      // #endregion
      // Ensure we always send a response, even on error
      if (!res.headersSent) {
        try {
          return res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Failed to load preview act',
            actNumber: req.params?.actNumber
          });
        } catch (sendError: any) {
          // If sending response fails, log it but don't crash
          logToFile('PREVIEW_ERROR_SEND_FAILED', { 
            actNumber: req.params?.actNumber,
            originalError: error.message,
            sendError: sendError?.message
          });
        }
      }
      // Only call next(error) if headers haven't been sent
      if (!res.headersSent) {
        next(error);
      }
    }
  }
);

/**
 * GET /api/sim/:sessionId/act/:actNumber
 * Get act content and progress for a specific act
 */
console.log('[ROUTE-REGISTRATION] Registering sessionId route: /:sessionId/act/:actNumber');
logToFile('ROUTE-REGISTRATION: sessionId route', { route: '/:sessionId/act/:actNumber' });
router.get(
  '/:sessionId/act/:actNumber',
  [
    // CRITICAL FIX: Custom validation that allows "preview" OR validates as UUID
    param('sessionId').custom((value) => {
      console.log('[VALIDATION] Custom validator called', { value, isPreview: value === 'preview' });
      logToFile('VALIDATION: custom validator', { value, isPreview: value === 'preview' });
      
      // Allow "preview" to pass validation
      if (value === 'preview') {
        console.log('[VALIDATION] Allowing "preview" to pass');
        logToFile('VALIDATION: allowing preview', {});
        return true;
      }
      // For all other values, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        console.log('[VALIDATION] UUID validation failed', { value });
        logToFile('VALIDATION: UUID failed', { value });
        throw new Error('Invalid session ID');
      }
      console.log('[VALIDATION] UUID validation passed', { value });
      logToFile('VALIDATION: UUID passed', { value });
      return true;
    }),
    param('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('[SESSIONID-ROUTE] SessionId route handler entered', { path: req.path, url: req.url, params: req.params });
    logToFile('SESSIONID-ROUTE: handler called', { path: req.path, url: req.url, params: req.params, isPreviewPath: req.path.includes('preview') });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:sessionId-route-entry',message:'SessionId route handler entered',data:{path:req.path,url:req.url,params:req.params,actNumberParam:req.params.actNumber},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const startTime = Date.now();
    const sessionId = req.params.sessionId;
    const actNumber = parseInt(req.params.actNumber);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:sessionId-parsed',message:'Parsed sessionId and actNumber',data:{sessionId,actNumber,actNumberType:typeof actNumber,isNaN:isNaN(actNumber)},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // CRITICAL FIX: If sessionId is "preview", handle it as preview route
    if (sessionId === 'preview' || req.path.includes('/preview/')) {
      console.log('[SESSIONID-ROUTE] Detected preview path, handling as preview route', { path: req.path, actNumber });
      logToFile('SESSIONID-ROUTE: handling as preview', { path: req.path, actNumber });
      
      // Handle as preview route - get act config without session validation
      try {
        const actConfig = getActConfig(actNumber);
        if (!actConfig) {
          return res.status(404).json({ 
            status: 'error', 
            message: `Act ${actNumber} configuration not found` 
          });
        }

        return res.json({
          status: 'success',
          data: {
            act: actConfig,
            isCompleted: false,
            progress: null,
            decision: null
          }
        });
      } catch (error: any) {
        return res.status(500).json({ 
          status: 'error', 
          message: error.message || 'Failed to load preview act' 
        });
      }
    }

    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:sessionId-before-validation',message:'Before validation in sessionId route',data:{sessionId,actNumber,sessionIdIsPreview:sessionId==='preview'},timestamp:Date.now(),sessionId:'debug-session',runId:'preview-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const errors = validationResult(req);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:sessionId-validation-result',message:'Validation result in sessionId route',data:{hasErrors:!errors.isEmpty(),errors:errors.array()},timestamp:Date.now(),sessionId:'debug-session',runId:'preview-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!errors.isEmpty()) {
        logOperation('VALIDATION_ERROR', { sessionId, actNumber, errors: errors.array() });
        return res.status(400).json({ 
          status: 'error', 
          message: 'Invalid request parameters',
          errors: errors.array() 
        });
      }

      logOperation('GET_ACT_REQUEST', { sessionId, actNumber });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:before-session-lookup',message:'About to lookup session',data:{sessionId,actNumber},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Verify session exists with better error handling
      const session = await SimulationSession.findById(sessionId);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:after-session-lookup',message:'Session lookup completed',data:{sessionId,hasSession:!!session,sessionStatus:session?.status,sessionCurrentAct:session?.current_act,actNumber},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!session) {
        logOperation('SESSION_NOT_FOUND', { sessionId });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:session-not-found',message:'Session not found',data:{sessionId,actNumber,statusCode:404},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return res.status(404).json({ 
          status: 'error', 
          message: 'Simulation session not found' 
        });
      }

      // Validate session status
      if (session.status === 'completed' && actNumber < (session.current_act || 1)) {
        // Allow viewing completed acts
      } else if (session.status === 'abandoned') {
        logOperation('SESSION_ABANDONED', { sessionId, status: session.status });
        return res.status(403).json({ 
          status: 'error', 
          message: 'This simulation session has been abandoned' 
        });
      }

      // Check if user can access this act (must be current act or a completed act)
      const currentAct = session.current_act || 1;
      
      // For Act I, validate that session is at least at Act I
      if (actNumber === 1 && currentAct < 1) {
        logOperation('ACT_I_INVALID_STATE', { sessionId, requestedAct: actNumber, currentAct });
        return res.status(403).json({ 
          status: 'error', 
          message: 'Session is not ready for Act I. Please start a new simulation.' 
        });
      }
      
      // For Act II+, check if previous acts are completed by looking at decision events
      // This is more reliable than just checking current_act, as it handles timing issues
      if (actNumber > 1) {
        const previousDecisions = await DecisionEvent.findBySession(sessionId);
        
        // Check if all previous acts have been completed
        for (let prevAct = 1; prevAct < actNumber; prevAct++) {
          const prevDecision = previousDecisions.find(d => d.act_number === prevAct);
          if (!prevDecision) {
            logOperation('ACT_ACCESS_DENIED_PREVIOUS_NOT_COMPLETE', { 
              sessionId, 
              requestedAct: actNumber, 
              currentAct,
              missingAct: prevAct
            });
            return res.status(403).json({ 
              status: 'error', 
              message: `Cannot access Act ${actNumber}. Please complete Act ${prevAct} first.` 
            });
          }
        }
        
        // All previous acts are completed, so allow access
        // Update current_act if it's behind (handles race conditions)
        if (currentAct < actNumber) {
          logOperation('ACT_ACCESS_GRANTED_WITH_UPDATE', { 
            sessionId, 
            requestedAct: actNumber, 
            currentAct,
            updatingTo: actNumber
          });
          // Update current_act to match the requested act since previous acts are completed
          await pool.query(
            'UPDATE simulation_sessions SET current_act = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [actNumber, sessionId]
          );
        }
      }
      
      // Log successful access
      logOperation('ACT_ACCESS_GRANTED', { sessionId, requestedAct: actNumber, currentAct });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act-access-granted',message:'Act access granted',data:{sessionId,requestedAct:actNumber,currentAct},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // For Act II+, fetch previous decisions for path dependency
      let previousDecisions: DecisionEventData[] = [];
      if (actNumber >= 2) {
        previousDecisions = await DecisionEvent.findBySession(sessionId);
        
        // Guardrail: Act II requires Act I to be completed
        if (actNumber === 2) {
          const act1Decision = previousDecisions.find(d => d.act_number === 1);
          if (!act1Decision) {
            logOperation('ACT_II_REQUIRES_ACT_I', { sessionId, currentAct });
            return res.status(403).json({ 
              status: 'error', 
              message: 'Cannot access Act II. Please complete Act I first.' 
            });
          }
        }
        
        // Guardrail: Act III requires Act II to be completed
        if (actNumber === 3) {
          const act2Decision = previousDecisions.find(d => d.act_number === 2);
          if (!act2Decision) {
            logOperation('ACT_III_REQUIRES_ACT_II', { sessionId, currentAct });
            return res.status(403).json({ 
              status: 'error', 
              message: 'Cannot access Act III. Please complete Act II first.' 
            });
          }
        }
        
        // Guardrail: Act IV requires Act III to be completed
        if (actNumber === 4) {
          const act3Decision = previousDecisions.find(d => d.act_number === 3);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act4-act3-check',message:'Checking Act III completion for Act IV',data:{sessionId,hasAct3Decision:!!act3Decision,act3OptionId:act3Decision?.option_id,previousDecisionsCount:previousDecisions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          if (!act3Decision) {
            logOperation('ACT_IV_REQUIRES_ACT_III', { sessionId, currentAct });
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act4-act3-missing',message:'Act III not completed - blocking Act IV',data:{sessionId,currentAct,statusCode:403},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            return res.status(403).json({ 
              status: 'error', 
              message: 'Cannot access Act IV. Please complete Act III first.' 
            });
          }
        }
      }

      // For Act IV, read identity_track from session
      let identityTrack: IdentityTrack | undefined;
      if (actNumber === 4) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act4-before-identity-track',message:'About to query identity_track for Act IV',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Read identity_track from session (stored after Act III submission)
        const sessionResult = await pool.query(
          'SELECT identity_track FROM simulation_sessions WHERE id = $1',
          [sessionId]
        );
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act4-after-identity-track-query',message:'Identity track query completed',data:{sessionId,hasRows:sessionResult.rows.length>0,identityTrackValue:sessionResult.rows[0]?.identity_track,identityTrackType:typeof sessionResult.rows[0]?.identity_track},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (sessionResult.rows.length > 0 && sessionResult.rows[0].identity_track) {
          const trackValue = sessionResult.rows[0].identity_track;
          const validTracks: IdentityTrack[] = ['Efficiency at Scale', 'Managed Adaptation', 'Relational Foundation'];
          if (validTracks.includes(trackValue as IdentityTrack)) {
            identityTrack = trackValue as IdentityTrack;
          } else {
            logOperation('ACT_IV_INVALID_IDENTITY_TRACK', { sessionId, trackValue });
            return res.status(403).json({ 
              status: 'error', 
              message: 'Cannot access Act IV. Identity track is invalid. Please contact support.' 
            });
          }
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act4-identity-track-set',message:'Identity track retrieved successfully',data:{sessionId,identityTrack},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        } else {
          logOperation('ACT_IV_NO_IDENTITY_TRACK', { sessionId });
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act4-no-identity-track',message:'Identity track missing - blocking Act IV',data:{sessionId,hasRows:sessionResult.rows.length>0,statusCode:403},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          return res.status(403).json({ 
            status: 'error', 
            message: 'Cannot access Act IV. Identity track not found. Please complete Act III first.' 
          });
        }
      }

      if (actNumber === 3) {
        const act2Decision = previousDecisions.find(d => d.act_number === 2);
        if (act2Decision?.option_id) {
          identityTrack = deriveIdentityTrackFromAct2Decision(act2Decision.option_id);
        }
      }

      // Get act configuration with path dependency and identity track
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:before-getActConfig',message:'About to call getActConfig',data:{actNumber,hasPreviousDecisions:previousDecisions.length>0,previousDecisionsCount:previousDecisions.length,identityTrack},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const actConfig = getActConfig(
        actNumber, 
        previousDecisions.length > 0 ? previousDecisions : undefined,
        identityTrack
      );
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:after-getActConfig',message:'getActConfig returned',data:{actNumber,hasConfig:!!actConfig,configTitle:actConfig?.title,configOptionsCount:actConfig?.options?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      if (!actConfig) {
        logOperation('ACT_CONFIG_NOT_FOUND', { actNumber });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act-config-not-found',message:'Act config not found',data:{actNumber,identityTrack,statusCode:404},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return res.status(404).json({ 
          status: 'error', 
          message: `Act ${actNumber} configuration not found` 
        });
      }

      // Validate act configuration structure
      if (!actConfig.options || actConfig.options.length === 0) {
        logOperation('INVALID_ACT_CONFIG', { actNumber, issue: 'No options defined' });
        return res.status(500).json({ 
          status: 'error', 
          message: `Act ${actNumber} configuration is invalid: no options defined` 
        });
      }

      // Get act progress
      let actProgress = await ActProgress.findBySessionAndAct(sessionId, actNumber);
      
      // If no progress exists, create it (user is starting this act)
      if (!actProgress) {
        logOperation('CREATING_ACT_PROGRESS', { sessionId, actNumber });
        actProgress = await ActProgress.create({
          simulation_session_id: sessionId,
          act_number: actNumber,
          started_at: new Date().toISOString()
        });
        await logEventForSession({
          sessionId,
          actNumber,
          eventType: 'act_loaded',
          eventValue: `act_${actNumber}`,
          meta: { firstLoad: true }
        });
      }

      // Check if act is already completed
      const decisionEvent = await DecisionEvent.findBySessionAndAct(sessionId, actNumber);
      const isCompleted = !!decisionEvent;
      
      // Get document events for this act
      const documentEvents = await DocumentEvent.findBySessionAndAct(sessionId, actNumber);
      
      // For Act IV, if already completed, redirect to post-simulation page
      if (actNumber === 4 && isCompleted && sessionId && sessionId !== 'preview') {
        // Return a flag indicating redirect is needed
        return res.json({
          status: 'success',
          data: {
            act: actConfig,
            progress: actProgress,
            isCompleted: true,
            decision: decisionEvent || null,
            documentEvents,
            redirectTo: 'post-simulation'
          }
        });
      }

      const duration = Date.now() - startTime;
      logOperation('GET_ACT_SUCCESS', { sessionId, actNumber, duration, isCompleted });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act-success-response',message:'Sending successful response',data:{sessionId,actNumber,isCompleted,hasActConfig:!!actConfig,statusCode:200},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      res.json({
        status: 'success',
        data: {
          act: actConfig,
          progress: actProgress,
          isCompleted,
          decision: decisionEvent || null,
          documentEvents,
          identityTrack: actNumber >= 3 ? identityTrack : undefined
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logOperation('GET_ACT_ERROR', { 
        sessionId, 
        actNumber, 
        error: error.message, 
        stack: error.stack,
        duration 
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'acts.ts:act-error-catch',message:'Error caught in sessionId route',data:{sessionId,actNumber,errorMessage:error?.message,errorStack:error?.stack,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'act4-debug',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      next(error);
    }
  }
);

/**
 * POST /api/sim/act/submit
 * Submit a decision for an act
 */
router.post(
  '/act/submit',
  [
    body('sessionId').isUUID().withMessage('Session ID is required'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('optionId').custom((value) => {
      // Act I: A, B, C
      // Act II: A1, A2, A3, B1, B2, B3, C1, C2, C3
      // Act III: X, Y, Z
      // Act IV: Innovation, Ecosystem, Efficiency
      const validOptions = ['A', 'B', 'C', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'X', 'Y', 'Z', 'Innovation', 'Ecosystem', 'Efficiency'];
      if (!validOptions.includes(value)) {
        throw new Error(`Option ID must be one of: ${validOptions.join(', ')}`);
      }
      return true;
    }),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const startTime = Date.now();
    let client;
    
    try {
      client = await pool.connect();
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logOperation('SUBMIT_VALIDATION_ERROR', { errors: errors.array() });
        if (client) client.release();
        return res.status(400).json({ 
          status: 'error', 
          message: 'Invalid request parameters',
          errors: errors.array() 
        });
      }

      const { sessionId, actNumber, optionId } = req.body;
      const actNum = parseInt(actNumber);

      logOperation('SUBMIT_DECISION_REQUEST', { sessionId, actNumber: actNum, optionId });

      // Begin transaction for atomicity
      await client.query('BEGIN');

      // Verify session exists with row-level locking
      const sessionResult = await client.query(
        'SELECT * FROM simulation_sessions WHERE id = $1 FOR UPDATE',
        [sessionId]
      );
      
      if (sessionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        logOperation('SUBMIT_SESSION_NOT_FOUND', { sessionId });
        return res.status(404).json({ 
          status: 'error', 
          message: 'Simulation session not found' 
        });
      }

      const session = {
        ...sessionResult.rows[0],
        state_snapshot: typeof sessionResult.rows[0].state_snapshot === 'string'
          ? JSON.parse(sessionResult.rows[0].state_snapshot)
          : sessionResult.rows[0].state_snapshot
      };

      // Validate session status
      if (session.status === 'completed') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          status: 'error', 
          message: 'Cannot submit decision: simulation session is already completed' 
        });
      }

      if (session.status === 'abandoned') {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          status: 'error', 
          message: 'Cannot submit decision: simulation session has been abandoned' 
        });
      }

      // Check if act is already completed (with transaction isolation)
      const existingDecisionResult = await client.query(
        'SELECT * FROM decision_events WHERE simulation_session_id = $1 AND act_number = $2',
        [sessionId, actNum]
      );

      if (existingDecisionResult.rows.length > 0) {
        await client.query('ROLLBACK');
        logOperation('SUBMIT_ACT_ALREADY_COMPLETED', { sessionId, actNum });
        return res.status(400).json({ 
          status: 'error', 
          message: `Act ${actNum} has already been completed. You cannot change your decision.` 
        });
      }

      // Verify act number matches current act OR previous act is completed
      // This allows submission even if current_act hasn't been updated yet due to timing
      if (session.current_act !== actNum) {
        // Check if previous act is completed (allows progression)
        if (actNum > 1) {
          const prevActDecision = await client.query(
            'SELECT * FROM decision_events WHERE simulation_session_id = $1 AND act_number = $2',
            [sessionId, actNum - 1]
          );
          
          if (prevActDecision.rows.length === 0) {
            await client.query('ROLLBACK');
            logOperation('SUBMIT_WRONG_ACT', { 
              sessionId, 
              requestedAct: actNum, 
              currentAct: session.current_act 
            });
            return res.status(400).json({ 
              status: 'error', 
              message: `Cannot submit Act ${actNum}. Please complete Act ${actNum - 1} first.` 
            });
          }
          // Previous act is completed, so allow submission and update current_act
          logOperation('SUBMIT_ALLOWED_PREVIOUS_COMPLETE', {
            sessionId,
            requestedAct: actNum,
            currentAct: session.current_act
          });
        } else {
          // Act 1 must match current_act
          await client.query('ROLLBACK');
          logOperation('SUBMIT_WRONG_ACT', { 
            sessionId, 
            requestedAct: actNum, 
            currentAct: session.current_act 
          });
          return res.status(400).json({ 
            status: 'error', 
            message: `Cannot submit Act ${actNum}. Current act is ${session.current_act}` 
          });
        }
      }

      // Get previous decisions for path-dependent acts
      let previousDecisions: DecisionEventData[] = [];
      if (actNum >= 2) {
        previousDecisions = await DecisionEvent.findBySession(sessionId);
      }

      // Guardrail: Act III requires Act II to be completed
      if (actNum === 3) {
        const act2Decision = previousDecisions.find(d => d.act_number === 2);
        if (!act2Decision) {
          await client.query('ROLLBACK');
          logOperation('ACT_III_REQUIRES_ACT_II', { sessionId, currentAct: session.current_act });
          return res.status(403).json({ 
            status: 'error', 
            message: 'Cannot submit Act III. Please complete Act II first.' 
          });
        }
      }
      
      // Guardrail: Act IV requires Act III to be completed
      if (actNum === 4) {
        const act3Decision = previousDecisions.find(d => d.act_number === 3);
        if (!act3Decision) {
          await client.query('ROLLBACK');
          logOperation('ACT_IV_REQUIRES_ACT_III', { sessionId, currentAct: session.current_act });
          return res.status(403).json({ 
            status: 'error', 
            message: 'Cannot submit Act IV. Please complete Act III first.' 
          });
        }
      }

      // For Act IV, read identity_track from session
      // For Act III, compute and store identity track
      // Declare once for both use cases
      let identityTrack: string | null | undefined = null;
      
      if (actNum === 4) {
        // Read identity track from session for Act IV
        const sessionResult = await client.query(
          'SELECT identity_track FROM simulation_sessions WHERE id = $1',
          [sessionId]
        );
        if (sessionResult.rows.length > 0 && sessionResult.rows[0].identity_track) {
          identityTrack = sessionResult.rows[0].identity_track;
        } else {
          await client.query('ROLLBACK');
          logOperation('ACT_IV_NO_IDENTITY_TRACK', { sessionId });
          return res.status(403).json({ 
            status: 'error', 
            message: 'Cannot submit Act IV. Identity track not found. Please complete Act III first.' 
          });
        }
      }

      // Get act config to verify option exists
      const actConfig = getActConfig(
        actNum, 
        previousDecisions.length > 0 ? previousDecisions : undefined,
        identityTrack || undefined
      );
      if (!actConfig) {
        await client.query('ROLLBACK');
        logOperation('SUBMIT_ACT_CONFIG_NOT_FOUND', { actNum });
        return res.status(404).json({ 
          status: 'error', 
          message: `Act ${actNum} configuration not found` 
        });
      }

      const option = actConfig.options.find(opt => opt.id === optionId);
      if (!option) {
        await client.query('ROLLBACK');
        logOperation('SUBMIT_INVALID_OPTION', { actNum, optionId, availableOptions: actConfig.options.map(o => o.id) });
        return res.status(400).json({ 
          status: 'error', 
          message: `Invalid option ${optionId} for Act ${actNum}. Valid options are: ${actConfig.options.map(o => o.id).join(', ')}` 
        });
      }

      const submittedAt = new Date().toISOString();

      // Create or update act progress
      let actProgressResult = await client.query(
        'SELECT * FROM act_progress WHERE simulation_session_id = $1 AND act_number = $2',
        [sessionId, actNum]
      );

      if (actProgressResult.rows.length === 0) {
        await client.query(
          `INSERT INTO act_progress (simulation_session_id, act_number, started_at, submitted_at)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [sessionId, actNum, submittedAt, submittedAt]
        );
      } else {
        await client.query(
          'UPDATE act_progress SET submitted_at = $1 WHERE simulation_session_id = $2 AND act_number = $3',
          [submittedAt, sessionId, actNum]
        );
      }

      // Create decision event
      const actProgressForTiming = await client.query(
        'SELECT started_at FROM act_progress WHERE simulation_session_id = $1 AND act_number = $2',
        [sessionId, actNum]
      );
      const actStart = actProgressForTiming.rows[0]?.started_at;
      const decisionTimeMs = actStart ? (new Date(submittedAt).getTime() - new Date(actStart).getTime()) : null;

      // Check which columns exist in decision_events table
      const hasParticipantId = await hasColumn('decision_events', 'participant_id');
      const hasDecisionTimeMs = await hasColumn('decision_events', 'decision_time_ms');
      const hasConfidence = await hasColumn('decision_events', 'confidence');
      const hasJustification = await hasColumn('decision_events', 'justification');
      const hasCreatedAt = await hasColumn('decision_events', 'created_at');
      
      // Build dynamic INSERT statement based on available columns
      const columns: string[] = ['simulation_session_id', 'act_number', 'option_id', 'submitted_at'];
      const values: any[] = [sessionId, actNum, optionId, submittedAt];
      
      if (hasParticipantId) {
        columns.push('participant_id');
        values.push(session.participant_id);
      }
      
      if (hasDecisionTimeMs) {
        columns.push('decision_time_ms');
        values.push(decisionTimeMs);
      }
      
      if (hasConfidence) {
        columns.push('confidence');
        values.push(req.body?.confidence || null);
      }
      
      if (hasJustification) {
        columns.push('justification');
        values.push(req.body?.justification || null);
      }
      
      if (hasCreatedAt) {
        columns.push('created_at');
        values.push(submittedAt);
      }
      
      // Build parameterized query
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `INSERT INTO decision_events (${columns.join(', ')})
                           VALUES (${placeholders})
                           RETURNING *`;
      
      const decisionResult = await client.query(insertQuery, values);
      const decisionEvent = decisionResult.rows[0];

      // For Act III, compute and store identity track from Act II convergence
      if (actNum === 3) {
        const act2Decision = previousDecisions.find(d => d.act_number === 2);
        if (act2Decision?.option_id) {
          identityTrack = deriveIdentityTrackFromAct2Decision(act2Decision.option_id);
        }
      }

      // Update session to next act (if not Act IV)
      // Act IV completion redirects to post-simulation reflection page
      const nextAct = actNum < 4 ? actNum + 1 : null;
      const newStatus = actNum === 4 ? 'completed' : 'active';
      const completedAt = actNum === 4 ? submittedAt : null;

      // Build update query - include identity_track if Act III
      let updateQuery = `UPDATE simulation_sessions 
         SET current_act = $1, status = $2, completed_at = $3, updated_at = CURRENT_TIMESTAMP`;
      const updateParams: any[] = [nextAct || actNum, newStatus, completedAt];
      
      if (identityTrack) {
        updateQuery += `, identity_track = $${updateParams.length + 1}`;
        updateParams.push(identityTrack);
      }
      
      updateQuery += ` WHERE id = $${updateParams.length + 1}`;
      updateParams.push(sessionId);

      await client.query(updateQuery, updateParams);
      if (actNum === 4 && session.participant_id) {
        await client.query(
          `UPDATE participants
           SET status = 'completed', completed_at = $1
           WHERE id = $2`,
          [submittedAt, session.participant_id]
        );
      }

      // Commit transaction
      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      logOperation('SUBMIT_DECISION_SUCCESS', { 
        sessionId, 
        actNum, 
        optionId, 
        nextAct, 
        duration 
      });

      // Log event (non-blocking - don't let logging errors prevent response)
      logEventForSession({
        sessionId,
        actNumber: actNum,
        eventType: 'submit_decision',
        eventValue: optionId,
        meta: { decisionTimeMs }
      }).catch((logError) => {
        // Log error but don't throw - we've already committed the transaction
        console.error('[ACTS] Failed to log event (non-critical):', logError);
      });

      res.json({
        status: 'success',
        data: {
          decision: decisionEvent,
          nextAct,
          isComplete: actNum === 4,
          redirectTo: actNum === 4 ? 'post-simulation' : undefined
        }
      });
    } catch (error: any) {
      // Rollback transaction on error
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError: any) {
          logOperation('ROLLBACK_ERROR', { 
            error: rollbackError.message,
            originalError: error.message 
          });
        }
      }

      const duration = Date.now() - startTime;
      logOperation('SUBMIT_DECISION_ERROR', { 
        sessionId: req.body?.sessionId, 
        actNumber: req.body?.actNumber, 
        optionId: req.body?.optionId,
        error: error.message, 
        stack: error.stack,
        duration 
      });

      next(error);
    } finally {
      if (client) client.release();
    }
  }
);

/**
 * POST /api/sim/memo/submit
 * Submit a memo for an act (optional, if memo collection is enabled)
 */
router.post(
  '/memo/submit',
  [
    body('sessionId').isUUID().withMessage('Session ID is required'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('text').isString().trim().notEmpty().withMessage('Memo text is required')
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request parameters',
          errors: errors.array()
        });
      }

      const { sessionId, actNumber, text } = req.body;
      const actNum = Number.parseInt(actNumber, 10);
      const session = await SimulationSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ status: 'error', message: 'Simulation session not found' });
      }

      const memo = await Memo.create({
        participant_id: session.participant_id,
        act_number: actNum,
        text: text.trim()
      });

      await logEventForSession({
        sessionId,
        actNumber: actNum,
        eventType: 'submit_memo',
        eventValue: `act_${actNum}`,
        meta: { wordCount: memo.word_count || null }
      });

      return res.json({ status: 'success', data: memo });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sim/ai-attitude/submit
 * Submit AI attitude and trust responses (only for C1 and C2 conditions)
 */
router.post(
  '/ai-attitude/submit',
  [
    body('sessionId').isUUID().withMessage('Session ID is required'),
    body('responses').isObject().withMessage('Responses object is required'),
    body('responses.generalAiTrust1').isInt({ min: 1, max: 7 }).withMessage('General AI Trust 1 must be between 1 and 7'),
    body('responses.generalAiTrust2').isInt({ min: 1, max: 7 }).withMessage('General AI Trust 2 must be between 1 and 7'),
    body('responses.generalAiTrust3').isInt({ min: 1, max: 7 }).withMessage('General AI Trust 3 must be between 1 and 7'),
    body('responses.generalAiTrust4').isInt({ min: 1, max: 7 }).withMessage('General AI Trust 4 must be between 1 and 7'),
    body('responses.simulationAiTrust1').isInt({ min: 1, max: 7 }).withMessage('Simulation AI Trust 1 must be between 1 and 7'),
    body('responses.simulationAiTrust2').isInt({ min: 1, max: 7 }).withMessage('Simulation AI Trust 2 must be between 1 and 7'),
    body('responses.simulationAiTrust3').isInt({ min: 1, max: 7 }).withMessage('Simulation AI Trust 3 must be between 1 and 7'),
    body('responses.aiUsageFrequency').isInt({ min: 1, max: 5 }).withMessage('AI Usage Frequency must be between 1 and 5'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request parameters',
          errors: errors.array()
        });
      }

      const { sessionId, responses } = req.body;
      
      // Verify session exists and is C1 or C2
      const session = await SimulationSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Simulation session not found' 
        });
      }
      
      if (session.mode !== 'C1' && session.mode !== 'C2') {
        return res.status(400).json({ 
          status: 'error', 
          message: 'AI attitude questions are only for C1 and C2 conditions' 
        });
      }

      // Insert or update AI attitude responses
      const result = await pool.query(
        `INSERT INTO ai_attitude_responses (
          simulation_session_id,
          participant_id,
          general_ai_trust_1,
          general_ai_trust_2,
          general_ai_trust_3,
          general_ai_trust_4,
          simulation_ai_trust_1,
          simulation_ai_trust_2,
          simulation_ai_trust_3,
          ai_usage_frequency,
          responses
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (simulation_session_id) 
        DO UPDATE SET
          general_ai_trust_1 = EXCLUDED.general_ai_trust_1,
          general_ai_trust_2 = EXCLUDED.general_ai_trust_2,
          general_ai_trust_3 = EXCLUDED.general_ai_trust_3,
          general_ai_trust_4 = EXCLUDED.general_ai_trust_4,
          simulation_ai_trust_1 = EXCLUDED.simulation_ai_trust_1,
          simulation_ai_trust_2 = EXCLUDED.simulation_ai_trust_2,
          simulation_ai_trust_3 = EXCLUDED.simulation_ai_trust_3,
          ai_usage_frequency = EXCLUDED.ai_usage_frequency,
          responses = EXCLUDED.responses,
          submitted_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          sessionId,
          session.participant_id,
          responses.generalAiTrust1,
          responses.generalAiTrust2,
          responses.generalAiTrust3,
          responses.generalAiTrust4,
          responses.simulationAiTrust1,
          responses.simulationAiTrust2,
          responses.simulationAiTrust3,
          responses.aiUsageFrequency,
          JSON.stringify(responses)
        ]
      );

      await logEventForSession({
        sessionId,
        actNumber: 4,
        eventType: 'submit_ai_attitude',
        eventValue: 'post_task',
        meta: { mode: session.mode }
      });

      return res.json({ 
        status: 'success', 
        data: result.rows[0] 
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sim/doc/event
 * Log document open/close events
 */
router.post(
  '/doc/event',
  [
    body('sessionId').isUUID().withMessage('Session ID is required'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('documentId').notEmpty().withMessage('Document ID is required'),
    body('eventType').isIn(['open', 'close']).withMessage('Event type must be "open" or "close"'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const startTime = Date.now();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logOperation('DOC_EVENT_VALIDATION_ERROR', { errors: errors.array() });
        return res.status(400).json({ 
          status: 'error', 
          message: 'Invalid request parameters',
          errors: errors.array() 
        });
      }

      const { sessionId, actNumber, documentId, eventType, durationMs } = req.body;
      const actNum = parseInt(actNumber);

      logOperation('DOC_EVENT_REQUEST', { sessionId, actNum, documentId, eventType });

      // Verify session exists
      const session = await SimulationSession.findById(sessionId);
      if (!session) {
        logOperation('DOC_EVENT_SESSION_NOT_FOUND', { sessionId });
        return res.status(404).json({ 
          status: 'error', 
          message: 'Simulation session not found' 
        });
      }

      // Validate document ID exists in act config
      const actConfig = getActConfig(actNum);
      if (actConfig) {
        const documentExists = actConfig.documents.some(doc => doc.id === documentId);
        if (!documentExists) {
          logOperation('DOC_EVENT_INVALID_DOCUMENT', { actNum, documentId });
          return res.status(400).json({ 
            status: 'error', 
            message: `Document ${documentId} does not exist in Act ${actNum}` 
          });
        }
      }

      if (eventType === 'open') {
        // Create new document event
        const docEvent = await DocumentEvent.create({
          simulation_session_id: sessionId,
          act_number: actNum,
          document_id: documentId,
          opened_at: new Date().toISOString()
        });

        await logEventForSession({
          sessionId,
          actNumber: actNum,
          eventType: 'open_document',
          eventValue: documentId,
          meta: { documentId }
        });

        const duration = Date.now() - startTime;
        logOperation('DOC_EVENT_OPEN_SUCCESS', { sessionId, actNum, documentId, duration });

        res.json({
          status: 'success',
          data: { documentEvent: docEvent }
        });
      } else if (eventType === 'close') {
        // Find the most recent open event for this document
        const docEvents = await DocumentEvent.findBySessionAndAct(sessionId, actNum);
        const openEvent = docEvents
          .filter(e => e.document_id === documentId && !e.closed_at)
          .sort((a, b) => new Date(b.opened_at!).getTime() - new Date(a.opened_at!).getTime())[0];

        if (!openEvent || !openEvent.id) {
          logOperation('DOC_EVENT_NO_OPEN_EVENT', { sessionId, actNum, documentId });
          return res.status(404).json({ 
            status: 'error', 
            message: 'No open document event found to close' 
          });
        }

        const closedAt = new Date().toISOString();
        const openedAt = new Date(openEvent.opened_at!);
        const calculatedDuration = durationMs || (new Date(closedAt).getTime() - openedAt.getTime());

        // Validate duration is reasonable (not negative, not extremely long)
        const validDuration = calculatedDuration > 0 && calculatedDuration < 86400000 // 24 hours
          ? calculatedDuration 
          : Math.max(0, calculatedDuration);

        const updatedEvent = await DocumentEvent.update(openEvent.id, {
          closed_at: closedAt,
          duration_ms: validDuration
        });

        if (!updatedEvent) {
          logOperation('DOC_EVENT_UPDATE_FAILED', { sessionId, actNum, documentId, eventId: openEvent.id });
          return res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update document event' 
          });
        }

        const duration = Date.now() - startTime;
        logOperation('DOC_EVENT_CLOSE_SUCCESS', { 
          sessionId, 
          actNum, 
          documentId, 
          viewDuration: validDuration,
          duration 
        });

        await logEventForSession({
          sessionId,
          actNumber: actNum,
          eventType: 'close_document',
          eventValue: documentId,
          durationMs: validDuration,
          meta: { documentId }
        });

        res.json({
          status: 'success',
          data: { documentEvent: updatedEvent }
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logOperation('DOC_EVENT_ERROR', { 
        sessionId: req.body?.sessionId, 
        actNumber: req.body?.actNumber, 
        documentId: req.body?.documentId,
        eventType: req.body?.eventType,
        error: error.message, 
        stack: error.stack,
        duration 
      });
      next(error);
    }
  }
);

export default router;
