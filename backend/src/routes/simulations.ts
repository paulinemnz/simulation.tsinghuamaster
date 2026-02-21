import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { SimulationSession } from '../models/SimulationSession';
import { Scenario } from '../models/Scenario';
import { Participant } from '../models/Participant';
import { Decision } from '../models/Decision';
import { Outcome } from '../models/Outcome';
import { OutcomeCalculator } from '../services/outcomeCalculator';
import { DataCollector } from '../services/dataCollector';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../database/connection';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

// Start a new simulation session with mode (for landing page - no auth required)
router.post(
  '/start-with-mode',
  [
    body('participant_id')
      .custom((value) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          throw new Error('Participant ID is required');
        }
        return true;
      })
      .withMessage('Participant ID is required'),
    body('mode').isIn(['C0', 'C1', 'C2']).withMessage('Mode must be C0, C1, or C2'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // #region agent log
    const fs = require('fs');
    const logPath = 'c:\\Pauline\\qinghua\\year three\\thesis\\mid thesis defense\\Cursor 2\\.cursor\\debug.log';
    const logEntry = JSON.stringify({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location: 'simulations.ts:start-with-mode',
      message: 'POST /start-with-mode handler invoked',
      data: { 
        method: req.method, 
        path: req.path, 
        originalUrl: req.originalUrl,
        body: req.body, 
        headers: { 
          host: req.headers.host, 
          'user-agent': req.headers['user-agent'], 
          origin: req.headers.origin, 
          referer: req.headers.referer,
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip']
        },
        ip: req.ip,
        ips: req.ips
      },
      runId: '503-debug',
      hypothesisId: 'B'
    }) + '\n';
    try { fs.appendFileSync(logPath, logEntry, 'utf8'); } catch (e) {}
    // #endregion
    console.log('Start-with-mode request body:', req.body);
    console.log('[API] POST /start-with-mode - Request received', {
      participant_id: req.body.participant_id,
      mode: req.body.mode
    });
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(e => e.msg || String(e)).join(', ');
        console.error('[API] Validation errors:', errorMessages);
        return res.status(400).json({ 
          ok: false, 
          error: `Validation failed: ${errorMessages}` 
        });
      }

      const participantIdInput = req.body.participant_id?.trim();
      const mode = req.body.mode as 'C0' | 'C1' | 'C2';

      if (!participantIdInput) {
        console.error('[API] Empty participant ID after trim');
        return res.status(400).json({ 
          ok: false, 
          error: 'Participant ID is required' 
        });
      }

      if (!mode || !['C0', 'C1', 'C2'].includes(mode)) {
        console.error('[API] Invalid mode:', mode);
        return res.status(400).json({ 
          ok: false, 
          error: 'Mode must be C0, C1, or C2' 
        });
      }

      console.log('[API] Processing request:', { participantIdInput, mode });

      // Helper function to check if string is a valid UUID
      const isUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Try to find participant by ID (UUID) or participant_code
      let participant = null;
      if (isUUID(participantIdInput)) {
        try {
          participant = await Participant.findById(participantIdInput);
        } catch (error: any) {
          console.warn('[API] findById failed, trying participant_code:', error.message);
          participant = null;
        }
      }
      
      if (!participant) {
        try {
          participant = await Participant.findByParticipantCode(participantIdInput);
        } catch (error: any) {
          console.warn('[API] findByParticipantCode failed:', error.message);
          participant = null;
        }
      }

      // If participant doesn't exist, create one automatically
      if (!participant) {
        console.log('[API] Participant not found, creating automatically for:', participantIdInput);
        
        try {
          // Get or create a default research session
          let researchSession;
          const sessionResult = await pool.query(
            'SELECT id FROM research_sessions WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
          );
          
          if (sessionResult.rows.length === 0) {
            const sessionInsert = await pool.query(
              `INSERT INTO research_sessions (name, description, is_active)
               VALUES ($1, $2, $3)
               RETURNING id`,
              ['Default Session', 'Auto-created session for landing page participants', true]
            );
            researchSession = { id: sessionInsert.rows[0].id };
          } else {
            researchSession = { id: sessionResult.rows[0].id };
          }
          
          // Create a user for this participant
          // Use a more unique email to avoid conflicts
          const timestamp = Date.now();
          const sanitizedEmail = `participant_${participantIdInput.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}@auto.local`;
          let user;
          
          // Try to find existing user by name first
          const userByNameResult = await pool.query(
            'SELECT id FROM users WHERE name = $1 AND role = $2 LIMIT 1',
            [participantIdInput, 'participant']
          );
          
          if (userByNameResult.rows.length > 0) {
            user = { id: userByNameResult.rows[0].id };
          } else {
            // Check if email already exists (unlikely but possible)
            const userResult = await pool.query(
              'SELECT id FROM users WHERE email = $1 LIMIT 1',
              [sanitizedEmail]
            );
            
            if (userResult.rows.length === 0) {
              const defaultPassword = await bcrypt.hash('auto_created_' + timestamp, 10);
              const userInsert = await pool.query(
                `INSERT INTO users (email, password_hash, role, name)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [sanitizedEmail, defaultPassword, 'participant', participantIdInput]
              );
              user = { id: userInsert.rows[0].id };
            } else {
              user = { id: userResult.rows[0].id };
            }
          }
          
          // Check if a participant already exists for this user and session
          const existingParticipant = await Participant.findByUserId(user.id, researchSession.id);
          if (existingParticipant) {
            participant = existingParticipant;
            console.log('[API] Found existing participant for user and session');
          } else {
            // Check one more time by participant_code in case of race condition
            try {
              const participantByCode = await Participant.findByParticipantCode(participantIdInput);
              if (participantByCode) {
                participant = participantByCode;
                console.log('[API] Found existing participant by code');
              }
            } catch (error: any) {
              // No existing participant found, create new one
              console.log('[API] Creating new participant');
            }
            
            if (!participant) {
              // Handle potential duplicate participant_code constraint
              try {
                participant = await Participant.create({
                  user_id: user.id,
                  session_id: researchSession.id,
                  participant_code: participantIdInput,
                  mode,
                  status: 'started',
                  started_at: new Date().toISOString(),
                  demographics: {
                    auto_created: true,
                    created_at: new Date().toISOString(),
                    participant_name: participantIdInput
                  }
                });
                console.log('[API] Successfully created new participant:', participant.id);
              } catch (createError: any) {
                // If creation fails due to duplicate participant_code, try to find it again
                if (createError.message?.includes('participant_code') || createError.code === '23505') {
                  console.warn('[API] Duplicate participant_code detected, attempting to find existing participant');
                  try {
                    participant = await Participant.findByParticipantCode(participantIdInput);
                    if (participant) {
                      console.log('[API] Found existing participant after duplicate error');
                    }
                  } catch (findError: any) {
                    console.error('[API] Failed to find participant after duplicate error:', findError);
                    throw createError; // Re-throw original error if we can't find it
                  }
                } else {
                  throw createError; // Re-throw if it's a different error
                }
              }
            }
          }
        } catch (createError: any) {
          console.error('[API] Error creating participant:', createError);
          // Try one more time to find existing participant
          try {
            participant = await Participant.findByParticipantCode(participantIdInput);
            if (participant) {
              console.log('[API] Found participant after creation error');
            } else {
              throw createError; // Re-throw if we still can't find it
            }
          } catch (findError: any) {
            console.error('[API] Failed to find or create participant:', findError);
            return res.status(500).json({ 
              ok: false, 
              error: `Failed to create participant: ${createError.message || 'Unknown error'}. Please try again with a different participant ID.` 
            });
          }
        }
      }

      if (!participant || !participant.id) {
        console.error('[API] Failed to find or create participant');
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to find or create participant. Please try again.' 
        });
      }

      // Get the first active scenario
      const scenarios = await Scenario.findAll(true);
      let scenario = scenarios[0];
      if (!scenario) {
        console.warn('[API] No active scenarios found, creating default scenario');
        const defaultScenarioConfig = {
          initialState: {
            financials: {
              revenue: 420000000,
              profit: 0,
              cash: 100000000,
              expenses: 0
            },
            marketPosition: {
              marketShare: 0.15,
              brandValue: 60,
              customerSatisfaction: 70
            },
            resources: {
              employees: 1300,
              productionCapacity: 100,
              technologyLevel: 50
            }
          },
          decisionCategories: [],
          outcomeRules: [],
          rounds: 4
        };
        scenario = await Scenario.create({
          name: 'Terraform Industries Default Scenario',
          description: 'Auto-created fallback scenario for simulation sessions.',
          config: defaultScenarioConfig,
          created_by: participant.user_id
        });
      }

      // Check if participant already has an active simulation
      const existingSession = await SimulationSession.findByParticipant(participant.id);
      if (existingSession && existingSession.id) {
        // Check if existing session is stuck (at Act 1 and no decisions made)
        const hasDecisions = await pool.query(
          'SELECT COUNT(*) as count FROM decision_events WHERE simulation_session_id = $1',
          [existingSession.id]
        );
        const decisionCount = parseInt(hasDecisions.rows[0]?.count || '0', 10);
        const isStuck = existingSession.current_act === 1 && decisionCount === 0;
        
        // If session is stuck or mode mismatch, abandon it and create new one
        if (isStuck || existingSession.mode !== mode) {
          console.log('[API] Abandoning existing session (stuck or mode mismatch). Creating new session.', {
            existingSessionId: existingSession.id,
            existingMode: existingSession.mode,
            requestedMode: mode,
            isStuck,
            decisionCount
          });

          try {
            await SimulationSession.update(existingSession.id, { status: 'abandoned' });
          } catch (updateError) {
            console.warn('[API] Failed to abandon existing session:', updateError);
          }
        } else if (existingSession.mode === mode) {
          // Only return existing session if it's not stuck and mode matches
          console.log('[API] Returning existing session:', existingSession.id);
          return res.status(200).json({ 
            ok: true, 
            sessionId: existingSession.id 
          });
        }
      }

      // Create new session
      console.log('[API] Creating new session');
      const session = await SimulationSession.create({
        participant_id: participant.id,
        scenario_id: scenario.id!,
        total_rounds: scenario.config.rounds || 4,
        current_round: 1,
        current_act: 1, // Start at Act I
        status: 'active',
        mode: mode,
        state_snapshot: scenario.config.initialState || {},
      });

      if (!participant.mode || !participant.started_at) {
        await pool.query(
          `UPDATE participants
           SET mode = $1, status = $2, started_at = COALESCE(started_at, $3)
           WHERE id = $4`,
          [mode, 'started', new Date().toISOString(), participant.id]
        );
      }

      if (!session || !session.id) {
        console.error('[API] Failed to create session');
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to create simulation session. Please try again.' 
        });
      }

      console.log('[API] Session created successfully:', session.id);

      // Save initial state snapshot (optional, don't fail if this errors)
      try {
        await DataCollector.saveStateSnapshot(
          session.id,
          0,
          'before',
          scenario.config.initialState
        );
      } catch (snapshotError) {
        console.warn('[API] Failed to save initial state snapshot (non-critical):', snapshotError);
      }

      // Return simplified response
      console.log('[API] Session created successfully, returning response:', { sessionId: session.id });
      return res.status(201).json({ 
        ok: true, 
        sessionId: session.id 
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('[API] ERROR in start-with-mode:', {
        message: errorMessage,
        code: errorCode,
        name: error?.name,
        stack: errorStack
      });

      // Print error to server terminal
      console.error('[API] Full error details:', error);

      // Return error in simplified format
      let userFriendlyError = 'An internal system error occurred. Please try again.';
      
      if (errorCode === 'ECONNREFUSED') {
        userFriendlyError = 'Database connection error. Please ensure the database is running.';
      } else if (errorMessage.includes('violates') || errorMessage.includes('constraint')) {
        userFriendlyError = 'Database constraint error. Please check your input and try again.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyError = 'Request timeout. Please try again.';
      } else if (errorMessage) {
        // Use the actual error message but sanitize it
        userFriendlyError = errorMessage.length > 200 
          ? errorMessage.substring(0, 200) + '...' 
          : errorMessage;
      }

      return res.status(500).json({ 
        ok: false, 
        error: userFriendlyError 
      });
    }
  }
);

// Start a new simulation session
router.post(
  '/start',
  authenticateToken,
  [
    body('scenario_id').isUUID().withMessage('Scenario ID is required'),
    body('participant_id').isUUID().withMessage('Participant ID is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const scenario = await Scenario.findById(req.body.scenario_id);
      if (!scenario) {
        return res.status(404).json({ status: 'error', message: 'Scenario not found' });
      }

      const session = await SimulationSession.create({
        participant_id: req.body.participant_id,
        scenario_id: req.body.scenario_id,
        total_rounds: scenario.config.rounds,
        current_round: 1,
        status: 'active',
        state_snapshot: scenario.config.initialState,
      });

      // Save initial state snapshot
      await DataCollector.saveStateSnapshot(
        session.id!,
        0,
        'before',
        scenario.config.initialState
      );

      res.status(201).json({ status: 'success', data: session });
    } catch (error) {
      next(error);
    }
  }
);

// Get current simulation session for participant
router.get(
  '/participant/:participantId',
  authenticateToken,
  param('participantId').isUUID(),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const session = await SimulationSession.findByParticipant(req.params.participantId);
      if (!session) {
        return res.status(404).json({ status: 'error', message: 'No active simulation session found' });
      }

      const scenario = await Scenario.findById(session.scenario_id);
      res.json({ status: 'success', data: { session, scenario } });
    } catch (error) {
      next(error);
    }
  }
);

// Submit decisions for a round and calculate outcomes
router.post(
  '/:sessionId/round/:round/submit',
  authenticateToken,
  [
    param('sessionId').isUUID(),
    param('round').isInt({ min: 1 }),
    body('decisions').isArray().withMessage('Decisions array is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const sessionId = req.params.sessionId;
      const round = parseInt(req.params.round);

      const session = await SimulationSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ status: 'error', message: 'Simulation session not found' });
      }

      if (session.status !== 'active') {
        return res.status(400).json({ status: 'error', message: 'Simulation session is not active' });
      }

      const scenario = await Scenario.findById(session.scenario_id);
      if (!scenario) {
        return res.status(404).json({ status: 'error', message: 'Scenario not found' });
      }

      // Save state before decisions
      await DataCollector.saveStateSnapshot(sessionId, round, 'before', session.state_snapshot || {});

      // Save all decisions
      const decisions = [];
      for (const decisionData of req.body.decisions) {
        const decision = await Decision.create({
          simulation_session_id: sessionId,
          round,
          category_id: decisionData.category_id,
          category_type: decisionData.category_type,
          values: decisionData.values,
          time_spent: decisionData.time_spent,
          intermediate_changes: decisionData.intermediate_changes,
        });
        decisions.push(decision);
      }

      // Calculate outcomes
      const { metrics, newState } = OutcomeCalculator.calculate(
        scenario.config,
        session.state_snapshot || {},
        decisions
      );

      // Apply market dynamics
      const finalState = OutcomeCalculator.applyMarketDynamics(
        newState,
        scenario.config,
        round
      );

      // Save outcome
      const outcome = await Outcome.create({
        simulation_session_id: sessionId,
        round,
        metrics,
        state_snapshot: finalState,
      });

      // Save state after decisions
      await DataCollector.saveStateSnapshot(sessionId, round, 'after', finalState);

      // Update simulation session
      const nextRound = round + 1;
      const isComplete = nextRound > session.total_rounds;
      
      await SimulationSession.update(sessionId, {
        current_round: isComplete ? session.total_rounds : nextRound,
        status: isComplete ? 'completed' : 'active',
        state_snapshot: finalState,
        completed_at: isComplete ? new Date().toISOString() : undefined,
      });

      res.json({
        status: 'success',
        data: {
          outcome,
          newState: finalState,
          nextRound: isComplete ? null : nextRound,
          isComplete,
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get outcomes for a simulation session
router.get(
  '/:sessionId/outcomes',
  authenticateToken,
  param('sessionId').isUUID(),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const round = req.query.round ? parseInt(req.query.round as string) : undefined;
      const outcomes = await Outcome.findBySession(req.params.sessionId, round);

      res.json({ status: 'success', data: outcomes });
    } catch (error) {
      next(error);
    }
  }
);

// Save pre-simulation questionnaire data
router.post(
  '/:sessionId/pre-simulation',
  [
    param('sessionId').isUUID().withMessage('Invalid session ID'),
    body('demographics').isObject().withMessage('Demographics data is required'),
    body('baselineStrategicDecision').isObject().withMessage('Baseline strategic decision data is required'),
    body('cognitiveReflectionTest').isObject().withMessage('Cognitive Reflection Test data is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      console.log('[API] POST /:sessionId/pre-simulation - Request received', {
        sessionId: req.params.sessionId,
        hasDemographics: !!req.body.demographics,
        hasBaseline: !!req.body.baselineStrategicDecision,
        hasCRT: !!req.body.cognitiveReflectionTest
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[API] Validation errors:', errors.array());
        return res.status(400).json({ 
          status: 'error', 
          error: 'Validation failed',
          errors: errors.array() 
        });
      }

      const { sessionId } = req.params;
      const { demographics, baselineStrategicDecision, cognitiveReflectionTest } = req.body;

      // Get the simulation session to find the participant
      const session = await SimulationSession.findById(sessionId);
      if (!session) {
        console.error('[API] Simulation session not found:', sessionId);
        return res.status(404).json({ 
          status: 'error', 
          error: 'Simulation session not found' 
        });
      }

      console.log('[API] Found simulation session:', { sessionId: session.id, participantId: session.participant_id });

      // Get the participant
      const participant = await Participant.findById(session.participant_id);
      if (!participant) {
        console.error('[API] Participant not found:', session.participant_id);
        return res.status(404).json({ 
          status: 'error', 
          error: 'Participant not found' 
        });
      }

      console.log('[API] Found participant:', { participantId: participant.id });

      // Merge existing demographics and covariates with new data
      const updatedDemographics = {
        ...(participant.demographics || {}),
        ...demographics
      };

      const updatedCovariates = {
        ...(participant.covariates || {}),
        baselineStrategicDecision,
        cognitiveReflectionTest
      };

      console.log('[API] Updating participant with pre-simulation data', {
        participantId: participant.id,
        demographicsKeys: Object.keys(updatedDemographics),
        covariatesKeys: Object.keys(updatedCovariates),
        hasBaselineStrategicDecision: !!updatedCovariates.baselineStrategicDecision,
        hasCognitiveReflectionTest: !!updatedCovariates.cognitiveReflectionTest
      });

      // Update participant with pre-simulation data
      const updatedParticipant = await Participant.update(participant.id!, {
        demographics: updatedDemographics,
        covariates: updatedCovariates
      });

      if (!updatedParticipant) {
        console.error('[API] Failed to update participant:', participant.id);
        return res.status(500).json({ 
          status: 'error', 
          error: 'Failed to update participant data' 
        });
      }

      console.log('[API] Pre-simulation data saved successfully', {
        participantId: updatedParticipant.id,
        savedDemographics: updatedParticipant.demographics ? Object.keys(updatedParticipant.demographics) : [],
        savedCovariates: updatedParticipant.covariates ? Object.keys(updatedParticipant.covariates) : []
      });

      res.json({ 
        status: 'success', 
        data: { 
          message: 'Pre-simulation data saved successfully',
          participant: updatedParticipant
        } 
      });
    } catch (error: any) {
      console.error('[API] Error saving pre-simulation data:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        sessionId: req.params.sessionId
      });
      next(error);
    }
  }
);

export default router;