import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { SimulationSession } from '../models/SimulationSession';
import { DataCollector } from '../services/dataCollector';
import { ChatLog } from '../models/ChatLog';
import { generateAssistantReply } from '../services/openaiClient';

const router = express.Router();

const MAX_QUESTIONS_PER_ACT = 3;

const categorizeQuestion = (text: string) => {
  const lower = text.toLowerCase();
  const hasAny = (keywords: string[]) => keywords.some(k => lower.includes(k));

  if (hasAny(['risk', 'downside', 'exposure', 'mitigation', 'threat'])) return 'risk';
  if (hasAny(['finance', 'budget', 'cost', 'revenue', 'margin', 'roi', 'profit'])) return 'finance';
  if (hasAny(['stakeholder', 'union', 'employee', 'supplier', 'board', 'customer'])) return 'stakeholder';
  if (hasAny(['idea', 'creative', 'brainstorm', 'innovate', 'alternatives'])) return 'creativity';
  if (hasAny(['execute', 'implementation', 'timeline', 'plan', 'rollout', 'deliver'])) return 'execution';

  return 'other';
};

const ensureAISession = async (sessionId: string) => {
  const session = await SimulationSession.findById(sessionId);
  if (!session) {
    return { ok: false as const, error: 'Simulation session not found', status: 404 };
  }
  if (session.mode !== 'C1' && session.mode !== 'C2') {
    return { ok: false as const, error: 'AI assist is only available in C1 or C2 mode', status: 403 };
  }
  return { ok: true as const, session };
};

router.post(
  '/chat',
  [
    body('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('message').isString().trim().notEmpty().withMessage('Message is required'),
    body('isPreview').optional().isBoolean()
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

      const { sessionId, message } = req.body;
      const actNumber = Number.parseInt(req.body.actNumber, 10);
      const isPreview = Boolean(req.body.isPreview);

      let sessionCheckResult: { ok: true; session: any } | { ok: false; error: string; status: number } | null = null;
      if (!isPreview) {
        if (!sessionId) {
          return res.status(400).json({ status: 'error', message: 'Session ID is required' });
        }
        sessionCheckResult = await ensureAISession(sessionId);
        if (!sessionCheckResult.ok) {
          const errorResult = sessionCheckResult as { ok: false; error: string; status: number };
          return res.status(errorResult.status || 500).json({ status: 'error', message: errorResult.error || 'Unknown error' });
        }
        await ChatLog.create({
          participant_id: sessionCheckResult.session.participant_id,
          act_number: actNumber,
          role: 'user',
          content: message.trim(),
          meta: { mode: sessionCheckResult.session.mode }
        });
      }

      let used = 0;
      if (!isPreview && sessionId) {
        used = await DataCollector.countInteractionEventsByAct(sessionId, 'ai_chat', actNumber);
        if (used >= MAX_QUESTIONS_PER_ACT) {
          return res.status(403).json({
            status: 'error',
            message: 'No more queries. Start new act to continue.',
            data: { used, remaining: 0 }
          });
        }
      }

      let reply: string;
      const requestStartTime = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai.ts:chat-route-before-deepseek',message:'About to call generateAssistantReply',data:{messageLength:message.length,actNumber,isPreview,sessionId:!!sessionId},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      try {
        reply = await generateAssistantReply(message);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai.ts:chat-route-success',message:'generateAssistantReply succeeded',data:{replyLength:reply.length,timeSinceStart:Date.now()-requestStartTime},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      } catch (error: any) {
        const errorTime = Date.now() - requestStartTime;
        console.error('[AI Route] DeepSeek API error:', error);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai.ts:chat-route-error',message:'generateAssistantReply failed',data:{timeSinceStart:errorTime,errorMessage:error?.message,errorCode:error?.code,errorType:error?.constructor?.name,errorCause:error?.cause?.code},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        // IMPORTANT: Failed API calls do NOT count toward query limit
        // Only return error, don't increment used count
        return res.status(500).json({
          status: 'error',
          message: error?.message || 'Failed to generate AI response. Please check your DeepSeek API key configuration.',
          error: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
          data: { used, remaining: MAX_QUESTIONS_PER_ACT - used }
        });
      }
      
      const questionCategory = categorizeQuestion(message);
      const promptLength = message.length;
      const responseLength = reply.length;
      const questionIndex = used + 1;
      const remaining = Math.max(0, MAX_QUESTIONS_PER_ACT - questionIndex);

      if (!isPreview && sessionId && sessionCheckResult && sessionCheckResult.ok) {
        await ChatLog.create({
          participant_id: sessionCheckResult.session.participant_id,
            act_number: actNumber,
            role: 'assistant',
            content: reply,
            meta: {
              mode: sessionCheckResult.session.mode,
              questionCategory,
              promptLength,
              responseLength
            }
        });
        await DataCollector.logInteraction({
          simulation_session_id: sessionId,
          event_type: 'ai_chat',
          event_data: {
            actNumber,
            questionIndex,
            questionText: message,
            responseText: reply,
            questionCategory,
            promptLength,
            responseLength,
            isPreview: false
          }
        });
      }

      return res.json({
        status: 'success',
        data: {
          reply,
          used: isPreview ? null : questionIndex,
          remaining: isPreview ? null : remaining,
          questionCategory
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/usage',
  [
    query('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    query('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    query('isPreview').optional().isBoolean()
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

      const sessionId = req.query.sessionId as string | undefined;
      const actNumber = Number.parseInt(req.query.actNumber as string, 10);
      const isPreview = req.query.isPreview === 'true';

      if (isPreview || !sessionId) {
        return res.json({
          status: 'success',
          data: { used: 0, remaining: MAX_QUESTIONS_PER_ACT }
        });
      }

      const sessionCheck = await ensureAISession(sessionId);
      if (!sessionCheck.ok) {
        return res.status(sessionCheck.status).json({ status: 'error', message: sessionCheck.error });
      }

      const used = await DataCollector.countInteractionEventsByAct(sessionId, 'ai_chat', actNumber);
      const remaining = Math.max(0, MAX_QUESTIONS_PER_ACT - used);

      return res.json({
        status: 'success',
        data: { used, remaining }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/history',
  [
    query('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    query('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    query('isPreview').optional().isBoolean()
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

      const sessionId = req.query.sessionId as string | undefined;
      const actNumber = Number.parseInt(req.query.actNumber as string, 10);
      const isPreview = req.query.isPreview === 'true';

      if (isPreview || !sessionId) {
        return res.json({
          status: 'success',
          data: { messages: [] }
        });
      }

      const sessionCheck = await ensureAISession(sessionId);
      if (!sessionCheck.ok) {
        return res.status(sessionCheck.status).json({ status: 'error', message: sessionCheck.error });
      }

      // Fetch chat logs for this participant and act
      const chatLogs = await ChatLog.findByParticipant(sessionCheck.session.participant_id);
      const actMessages = chatLogs
        .filter(log => log.act_number === actNumber)
        .sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        })
        .map(log => ({
          id: log.id || `msg-${Date.now()}`,
          role: log.role,
          content: log.content,
          createdAt: log.created_at
        }));

      return res.json({
        status: 'success',
        data: { messages: actMessages }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/save',
  [
    body('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('messageText').isString().trim().notEmpty().withMessage('Message text is required'),
    body('messageId').optional().isString(),
    body('isPreview').optional().isBoolean()
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

      const { sessionId, messageText, messageId } = req.body;
      const actNumber = Number.parseInt(req.body.actNumber, 10);
      const isPreview = Boolean(req.body.isPreview);

      if (!isPreview) {
        if (!sessionId) {
          return res.status(400).json({ status: 'error', message: 'Session ID is required' });
        }
        const sessionCheck = await ensureAISession(sessionId);
        if (!sessionCheck.ok) {
          return res.status(sessionCheck.status).json({ status: 'error', message: sessionCheck.error });
        }

        await DataCollector.logInteraction({
          simulation_session_id: sessionId,
          event_type: 'ai_save',
          event_data: {
            actNumber,
            messageId: messageId || null,
            messageText,
            savedAt: new Date().toISOString()
          }
        });
      }

      return res.json({ status: 'success', data: { saved: true } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
