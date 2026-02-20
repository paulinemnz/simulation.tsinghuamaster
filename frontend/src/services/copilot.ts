import api from './api';

export interface CopilotContextPack {
  act_id: number;
  act_title: string;
  scenario_text: string;
  stakeholder_quotes: Array<{
    id?: string;
    name?: string;
    role?: string;
    quote: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    type?: string;
    content: string;
  }>;
  dashboard_metrics: Record<string, any>;
  participant_path_history: Array<{ act: number; option_id: string }>;
  current_decision_options: Array<{
    id: string;
    title: string;
    description: string;
    implications?: string[];
  }>;
}

export type CopilotAction =
  | 'proactive'
  | 'clarify'
  | 'stress_test'
  | 'rationale'
  | 'pre_submit'
  | 'user_message';

export interface CopilotUsage {
  used: number;
  remaining: number;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: string;
  createdAt?: string;
}

export const copilotService = {
  getUsage: async (
    actNumber: number,
    sessionId?: string,
    isPreview?: boolean
  ): Promise<CopilotUsage> => {
    if (isPreview && !sessionId) {
      return { used: 0, remaining: 3 };
    }

    const response = await api.get('/copilot/usage', {
      params: {
        sessionId,
        actNumber,
        isPreview: Boolean(isPreview)
      }
    });
    return response.data.data as CopilotUsage;
  },

  getHistory: async (
    actNumber: number,
    sessionId?: string,
    isPreview?: boolean
  ): Promise<CopilotMessage[]> => {
    if (isPreview && !sessionId) {
      return [];
    }

    try {
      const response = await api.get('/copilot/history', {
        params: {
          sessionId,
          actNumber,
          isPreview: Boolean(isPreview)
        }
      });
      return response.data.data.messages || [];
    } catch (error) {
      console.error('Failed to load copilot history:', error);
      return [];
    }
  },

  updateContext: async (params: {
    sessionId?: string;
    actNumber: number;
    contextPack: CopilotContextPack;
    isPreview?: boolean;
  }) => {
    const response = await api.post('/copilot/context', {
      sessionId: params.sessionId,
      actNumber: params.actNumber,
      contextPack: params.contextPack,
      isPreview: Boolean(params.isPreview)
    });
    return response.data.data;
  },

  sendMessage: async (params: {
    sessionId?: string;
    actNumber: number;
    action: CopilotAction;
    message?: string;
    contextPack?: CopilotContextPack;
    isPreview?: boolean;
    selectedOptionId?: string | null;
  }) => {
    const payload: Record<string, any> = {
      sessionId: params.sessionId,
      actNumber: params.actNumber,
      action: params.action,
      message: params.message,
      contextPack: params.contextPack,
      isPreview: Boolean(params.isPreview)
    };
    if (params.selectedOptionId) {
      payload.selectedOptionId = params.selectedOptionId;
    }

    const response = await api.post('/copilot/chat', payload);
    return response.data.data as { reply: string; remaining?: number | null };
  },

  logEvent: async (params: {
    sessionId?: string;
    actNumber: number;
    event: string;
    payload?: Record<string, any>;
    isPreview?: boolean;
  }) => {
    const response = await api.post('/copilot/log', {
      sessionId: params.sessionId,
      actNumber: params.actNumber,
      event: params.event,
      payload: params.payload,
      isPreview: Boolean(params.isPreview)
    });
    return response.data.data;
  },

  summarizeAct: async (params: {
    sessionId?: string;
    actNumber: number;
    isPreview?: boolean;
  }) => {
    const response = await api.post('/copilot/summary', {
      sessionId: params.sessionId,
      actNumber: params.actNumber,
      isPreview: Boolean(params.isPreview)
    });
    return response.data.data;
  }
};
