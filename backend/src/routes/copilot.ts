import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { SimulationSession } from '../models/SimulationSession';
import { DecisionEvent } from '../models/DecisionEvent';
import { pool } from '../database/connection';
import { DataCollector } from '../services/dataCollector';
import { ChatLog } from '../models/ChatLog';
import {
  CopilotAction,
  CopilotConversationTurn,
  CEOIntentProfile,
  extractIntentProfileUpdate,
  generateCopilotReply,
  mergeIntentProfiles
} from '../services/copilotAgent';
import { resolveActContextPack } from '../services/actContextPack';
import type { IdentityTrack } from '../config/actConfig';

const router = express.Router();

const ensureC2Session = async (sessionId: string) => {
  const session = await SimulationSession.findById(sessionId);
  if (!session) {
    return { ok: false as const, error: 'Simulation session not found', status: 404 };
  }
  if (session.mode !== 'C2') {
    return { ok: false as const, error: 'Copilot is only available in C2 mode', status: 403 };
  }
  return { ok: true as const, session };
};

router.post(
  '/context',
  [
    body('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('contextPack').optional().isObject(),
    body('isPreview').optional().isBoolean()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request parameters',
          errors: errors.array()
        });
      }

      const { sessionId, contextPack } = req.body as {
        sessionId?: string;
        contextPack?: { scenario_text?: string; current_decision_options?: Array<{ id: string }> };
      };
      const actNumber = Number.parseInt(req.body.actNumber, 10);
      const isPreview = Boolean(req.body.isPreview);

      let sessionCheckResult: { ok: true; session: any } | { ok: false; error: string; status: number } | null = null;
      if (!isPreview) {
        if (!sessionId) {
          return res.status(400).json({ status: 'error', message: 'Session ID is required' });
        }
        sessionCheckResult = await ensureC2Session(sessionId);
        if (!sessionCheckResult.ok) {
          const errorResult = sessionCheckResult as { ok: false; error: string; status: number };
          return res.status(errorResult.status || 500).json({ status: 'error', message: errorResult.error || 'Unknown error' });
        }
      }

      const previousDecisions = !isPreview && sessionId && actNumber >= 2
        ? await DecisionEvent.findBySession(sessionId)
        : [];
      let identityTrack: IdentityTrack | undefined;
      if (!isPreview && sessionId && actNumber === 4) {
        const sessionResult = await pool.query('SELECT identity_track FROM simulation_sessions WHERE id = $1', [
          sessionId
        ]);
        const trackValue = sessionResult.rows[0]?.identity_track;
        if (trackValue === 'Efficiency at Scale' || trackValue === 'Managed Adaptation' || trackValue === 'Relational Foundation') {
          identityTrack = trackValue;
        }
      }

      const actContextPack = await resolveActContextPack({
        actNumber,
        previousDecisions,
        identityTrack,
        previewContextPack: contextPack
      });

      if (!isPreview && sessionId) {
        await DataCollector.logInteraction({
          simulation_session_id: sessionId,
          event_type: 'c2_context',
          event_data: {
            actNumber,
            contextPack: actContextPack,
            updatedAt: new Date().toISOString()
          }
        });
      }

      return res.json({ status: 'success', data: { stored: !isPreview } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/chat',
  [
    body('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('action')
      .isIn(['proactive', 'clarify', 'stress_test', 'rationale', 'pre_submit', 'user_message'])
      .withMessage('Action is required'),
    body('message').optional().isString(),
    body('contextPack').optional().isObject(),
    body('isPreview').optional().isBoolean(),
    body('selectedOptionId').optional().isString()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request parameters',
          errors: errors.array()
        });
      }

      const { sessionId, message, contextPack, selectedOptionId } = req.body as {
        sessionId?: string;
        message?: string;
        contextPack?: { scenario_text?: string; current_decision_options?: Array<{ id: string }> };
        selectedOptionId?: string;
      };
      const actNumber = Number.parseInt(req.body.actNumber, 10);
      const isPreview = Boolean(req.body.isPreview);
      const action = req.body.action as CopilotAction;

      let sessionCheckResult: { ok: true; session: any } | { ok: false; error: string; status: number } | null = null;
      if (!isPreview) {
        if (!sessionId) {
          return res.status(400).json({ status: 'error', message: 'Session ID is required' });
        }
        sessionCheckResult = await ensureC2Session(sessionId);
        if (!sessionCheckResult.ok) {
          const errorResult = sessionCheckResult as { ok: false; error: string; status: number };
          return res.status(errorResult.status || 500).json({ status: 'error', message: errorResult.error || 'Unknown error' });
        }
      }

      const previousDecisions = !isPreview && sessionId && actNumber >= 2
        ? await DecisionEvent.findBySession(sessionId)
        : [];
      let identityTrack: IdentityTrack | undefined;
      if (!isPreview && sessionId && actNumber === 4) {
        const sessionResult = await pool.query('SELECT identity_track FROM simulation_sessions WHERE id = $1', [
          sessionId
        ]);
        const trackValue = sessionResult.rows[0]?.identity_track;
        if (trackValue === 'Efficiency at Scale' || trackValue === 'Managed Adaptation' || trackValue === 'Relational Foundation') {
          identityTrack = trackValue;
        }
      }

      const resolvedContext = await resolveActContextPack({
        actNumber,
        previousDecisions,
        identityTrack,
        previewContextPack: contextPack
      });

      const requiresMessage = action === 'user_message';
      if (requiresMessage && (!message || !message.trim())) {
        return res.status(400).json({ status: 'error', message: 'Message is required' });
      }

      // C2 mode has unlimited queries - no limit enforcement

      if (!isPreview && sessionId && message && action === 'user_message' && sessionCheckResult && sessionCheckResult.ok) {
        await ChatLog.create({
          participant_id: sessionCheckResult.session.participant_id,
          act_number: actNumber,
          role: 'user',
          content: message.trim(),
          meta: { mode: 'C2', action }
        });
        await DataCollector.logInteraction({
          simulation_session_id: sessionId,
          event_type: 'c2_message',
          event_data: {
            actNumber,
            role: 'user',
            content: message.trim(),
            action,
            messageLength: message.trim().length,
            timestamp: Date.now()
          }
        });
      }

      const pathHistory = previousDecisions.reduce(
        (acc, decision) => {
          if (decision.act_number === 1) acc.act1Choice = decision.option_id;
          if (decision.act_number === 2) acc.act2Choice = decision.option_id;
          if (decision.act_number === 3) acc.act3Choice = decision.option_id;
          return acc;
        },
        {} as { act1Choice?: string; act2Choice?: string; act3Choice?: string }
      );

      // Get conversation history for current act
      const conversationEvents = !isPreview && sessionId
        ? await DataCollector.getInteractionEventsByAct(sessionId, actNumber, ['c2_message'])
        : [];
      const conversationHistory = conversationEvents
        .map(event => ({
          role: event.event_data?.role,
          content: event.event_data?.content,
          action: event.event_data?.action
        }))
        .filter(turn => turn.role && turn.content)
        .slice(-8);

      // Get ALL past acts' conversation history for strong memory (C2 mode)
      let allActsHistory: Array<{
        actNumber: number;
        conversations: CopilotConversationTurn[];
        decisions?: Array<{ optionId: string; actNumber: number }>;
      }> = [];
      
      if (!isPreview && sessionId && actNumber > 1) {
        // Fetch all C2 messages from all previous acts
        const allEvents = await DataCollector.getAllInteractionEventsBySession(sessionId, ['c2_message']);
        
        // Group by act number
        const actsMap = new Map<number, CopilotConversationTurn[]>();
        allEvents.forEach(event => {
          const actNum = event.actNumber;
          if (actNum && actNum < actNumber) { // Only previous acts
            if (!actsMap.has(actNum)) {
              actsMap.set(actNum, []);
            }
            if (event.event_data?.role && event.event_data?.content) {
              const role = event.event_data.role as 'user' | 'assistant';
              if (role === 'user' || role === 'assistant') {
                actsMap.get(actNum)!.push({
                  role,
                  content: event.event_data.content,
                  action: event.event_data.action as CopilotAction | undefined
                });
              }
            }
          }
        });

        // Convert to array format
        allActsHistory = Array.from(actsMap.entries()).map(([actNum, conversations]) => ({
          actNumber: actNum,
          conversations: conversations.slice(-10) // Keep last 10 messages per act
        }));

        // Add past decisions
        if (previousDecisions.length > 0) {
          previousDecisions.forEach(decision => {
            const actHist = allActsHistory.find(h => h.actNumber === decision.act_number);
            if (actHist) {
              if (!actHist.decisions) actHist.decisions = [];
              actHist.decisions.push({
                optionId: decision.option_id,
                actNumber: decision.act_number
              });
            }
          });
        }
      }

      const latestProfileEvent = !isPreview && sessionId
        ? await DataCollector.getLatestInteractionEventByType(sessionId, 'c2_intent_profile')
        : null;
      const latestProfile = latestProfileEvent?.event_data?.profile as CEOIntentProfile | undefined;
      const profileUpdates = extractIntentProfileUpdate(message);
      const mergedProfile = mergeIntentProfiles(latestProfile, profileUpdates);

      if (!isPreview && sessionId && Object.keys(profileUpdates).length > 0) {
        await DataCollector.logInteraction({
          simulation_session_id: sessionId,
          event_type: 'c2_intent_profile',
          event_data: {
            actNumber,
            profile: mergedProfile,
            updatedAt: new Date().toISOString()
          }
        });
      }

      const reply = await generateCopilotReply({
        action,
        message,
        context: resolvedContext,
        selectedOptionId: selectedOptionId || null,
        pathHistory,
        intentProfile: mergedProfile,
        conversationHistory,
        allActsHistory
      });

      if (!isPreview && sessionId && sessionCheckResult && sessionCheckResult.ok) {
        await ChatLog.create({
          participant_id: sessionCheckResult.session.participant_id,
          act_number: actNumber,
          role: 'assistant',
          content: reply,
          meta: { mode: 'C2', action }
        });
        await DataCollector.logInteraction({
          simulation_session_id: sessionId,
          event_type: 'c2_message',
          event_data: {
            actNumber,
            role: 'assistant',
            content: reply,
            action,
            messageLength: reply.length,
            timestamp: Date.now()
          }
        });
      }

      return res.json({
        status: 'success',
        data: {
          reply
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/log',
  [
    body('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('event').isString().notEmpty().withMessage('Event is required'),
    body('payload').optional().isObject(),
    body('isPreview').optional().isBoolean()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request parameters',
          errors: errors.array()
        });
      }

      const { sessionId, payload, event } = req.body as {
        sessionId?: string;
        payload?: Record<string, any>;
        event: string;
      };
      const actNumber = Number.parseInt(req.body.actNumber, 10);
      const isPreview = Boolean(req.body.isPreview);

      if (!isPreview) {
        if (!sessionId) {
          return res.status(400).json({ status: 'error', message: 'Session ID is required' });
        }
        const sessionCheck = await ensureC2Session(sessionId);
        if (!sessionCheck.ok) {
          return res.status(sessionCheck.status).json({ status: 'error', message: sessionCheck.error });
        }
      }

      if (!isPreview && sessionId) {
        await DataCollector.logInteraction({
          simulation_session_id: sessionId,
          event_type: 'c2_event',
          event_data: {
            actNumber,
            event,
            payload: payload || null,
            timestamp: Date.now()
          }
        });
      }

      return res.json({ status: 'success', data: { logged: !isPreview } });
    } catch (error) {
      next(error);
    }
  }
);

// C2 mode has unlimited queries - usage endpoint not needed

router.get(
  '/history',
  [
    query('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    query('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    query('isPreview').optional().isBoolean()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
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

      const sessionCheck = await ensureC2Session(sessionId);
      if (!sessionCheck.ok) {
        return res.status(sessionCheck.status).json({ status: 'error', message: sessionCheck.error });
      }

      // Fetch chat logs for this participant and act
      const chatLogs = await ChatLog.findByParticipant(sessionCheck.session.participant_id);
      const actMessages = chatLogs
        .filter(log => log.act_number === actNumber && log.meta?.mode === 'C2')
        .sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        })
        .map(log => ({
          id: log.id || `msg-${Date.now()}`,
          role: log.role,
          content: log.content,
          action: log.meta?.action,
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
  '/summary',
  [
    body('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
    body('actNumber').isInt({ min: 1, max: 4 }).withMessage('Act number must be between 1 and 4'),
    body('isPreview').optional().isBoolean()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request parameters',
          errors: errors.array()
        });
      }

      const { sessionId } = req.body as { sessionId?: string };
      const actNumber = Number.parseInt(req.body.actNumber, 10);
      const isPreview = Boolean(req.body.isPreview);

      if (!isPreview) {
        if (!sessionId) {
          return res.status(400).json({ status: 'error', message: 'Session ID is required' });
        }
        const sessionCheck = await ensureC2Session(sessionId);
        if (!sessionCheck.ok) {
          return res.status(sessionCheck.status).json({ status: 'error', message: sessionCheck.error });
        }
      }

      if (isPreview || !sessionId) {
        return res.json({ status: 'success', data: { stored: false } });
      }

      const events = await DataCollector.getInteractionEventsByAct(sessionId, actNumber, [
        'c2_message',
        'c2_event'
      ]);

      const transcript = events
        .filter(event => event.event_type === 'c2_message')
        .map(event => ({
          role: event.event_data?.role,
          content: event.event_data?.content,
          action: event.event_data?.action,
          timestamp: event.event_data?.timestamp
        }));

      const userMessages = transcript.filter(message => message.role === 'user');
      const totalUserLength = userMessages.reduce((sum, message) => sum + (message.content?.length || 0), 0);

      const buttonUsage = {
        clarify: false,
        stress_test: false,
        rationale: false
      };

      let totalOpenTimeMs = 0;
      events
        .filter(event => event.event_type === 'c2_event')
        .forEach(event => {
          if (event.event_data?.event === 'button') {
            const key = event.event_data?.payload?.button;
            if (key === 'clarify') buttonUsage.clarify = true;
            if (key === 'stress_test') buttonUsage.stress_test = true;
            if (key === 'rationale') buttonUsage.rationale = true;
          }
          if (event.event_data?.event === 'panel_close') {
            totalOpenTimeMs += Number(event.event_data?.payload?.durationMs || 0);
          }
        });

      const decisionMentions = new Set<string>();
      const tradeoffKeywords = /(trade-off|tradeoff|versus|but|however)/i;
      const uncertaintyKeywords = /(uncertain|not sure|might|could|risk|unknown)/i;
      userMessages.forEach(message => {
        const content = String(message.content || '');
        const match = content.match(/\b(?:option\s*)?([ABC]\d?|C2)\b/gi);
        match?.forEach(option => decisionMentions.add(option.toUpperCase()));
      });

      const reflexivityMarkers = {
        revised_decision_after_critique: decisionMentions.size > 1,
        states_tradeoffs: userMessages.some(message => tradeoffKeywords.test(String(message.content || ''))),
        cites_scenario_evidence: userMessages.some(message =>
          /(memo|dashboard|stakeholder|metrics|document|evidence|data)/i.test(String(message.content || ''))
        ),
        acknowledges_uncertainty: userMessages.some(message => uncertaintyKeywords.test(String(message.content || '')))
      };

      const summary = {
        actNumber,
        transcript,
        counts: {
          totalTurns: transcript.length,
          participantTurns: userMessages.length,
          participantMessageLength: totalUserLength,
          participantAverageLength: userMessages.length ? Math.round(totalUserLength / userMessages.length) : 0
        },
        timeWithCopilotOpenMs: totalOpenTimeMs,
        buttonUsage,
        reflexivityMarkers
      };

      await DataCollector.logInteraction({
        simulation_session_id: sessionId,
        event_type: 'c2_summary',
        event_data: summary
      });

      return res.json({ status: 'success', data: summary });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
