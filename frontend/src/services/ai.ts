import api from './api';

export interface AiUsage {
  used: number;
  remaining: number;
}

export interface AiChatResponse {
  reply: string;
  used: number | null;
  remaining: number | null;
  questionCategory?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export const aiService = {
  getUsage: async (
    actNumber: number,
    sessionId?: string,
    isPreview?: boolean
  ): Promise<AiUsage> => {
    if (isPreview && !sessionId) {
      return { used: 0, remaining: 3 };
    }

    const response = await api.get('/ai/usage', {
      params: {
        sessionId,
        actNumber,
        isPreview: Boolean(isPreview)
      }
    });
    return response.data.data as AiUsage;
  },

  getHistory: async (
    actNumber: number,
    sessionId?: string,
    isPreview?: boolean
  ): Promise<ChatMessage[]> => {
    if (isPreview && !sessionId) {
      return [];
    }

    try {
      const response = await api.get('/ai/history', {
        params: {
          sessionId,
          actNumber,
          isPreview: Boolean(isPreview)
        }
      });
      return response.data.data.messages || [];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [];
    }
  },

  sendChat: async (params: {
    actNumber: number;
    message: string;
    sessionId?: string;
    isPreview?: boolean;
  }): Promise<AiChatResponse> => {
    const response = await api.post('/ai/chat', {
      sessionId: params.sessionId,
      actNumber: params.actNumber,
      message: params.message,
      isPreview: Boolean(params.isPreview)
    });
    return response.data.data as AiChatResponse;
  },

  saveMessage: async (params: {
    actNumber: number;
    messageText: string;
    messageId?: string;
    sessionId?: string;
    isPreview?: boolean;
  }) => {
    if (params.isPreview && !params.sessionId) {
      return { saved: true };
    }

    const response = await api.post('/ai/save', {
      sessionId: params.sessionId,
      actNumber: params.actNumber,
      messageText: params.messageText,
      messageId: params.messageId,
      isPreview: Boolean(params.isPreview)
    });
    return response.data.data;
  }
};
