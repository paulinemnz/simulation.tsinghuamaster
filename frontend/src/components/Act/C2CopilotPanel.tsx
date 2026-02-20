import React, { useEffect, useMemo, useRef, useState } from 'react';
import { copilotService, CopilotContextPack, CopilotAction, CopilotMessage } from '../../services/copilot';
import './C2CopilotPanel.css';

const ACT_EXPIRY_HOURS = 24;

const buildActMemoryKey = (sessionId: string | undefined, actNumber: number) =>
  `c2ActMemory:${sessionId || 'preview'}:act:${actNumber}`;

interface ActMemory {
  actNumber: number;
  sessionId?: string;
  messages: CopilotMessage[];
  remaining?: number; // Optional, -1 indicates unlimited
  createdAt: number;
  lastAccessed: number;
}

interface C2CopilotPanelProps {
  actNumber: number;
  sessionId?: string;
  isPreview: boolean;
  contextPack: CopilotContextPack | null;
  selectedOptionId?: string | null;
  justificationText: string;
  justificationSaved: boolean;
  minJustificationLength: number;
  onJustificationUpdate: (text: string, saved: boolean) => void;
  preSubmitTrigger: number;
}

const C2CopilotPanel: React.FC<C2CopilotPanelProps> = ({
  actNumber,
  sessionId,
  isPreview,
  contextPack,
  selectedOptionId,
  justificationText,
  justificationSaved,
  minJustificationLength,
  onJustificationUpdate,
  preSubmitTrigger
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelOpenAt = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isRestoringRef = useRef(false);

  const canSend = useMemo(() => !loading && input.trim().length > 0, [input, loading]);

  // Initialize BroadcastChannel for multi-tab sync
  useEffect(() => {
    if (isPreview) return;
    
    const channelName = `c2-act-${actNumber}-${sessionId || 'preview'}`;
    const channel = new BroadcastChannel(channelName);
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data.type === 'chat-update') {
        const { messages: newMessages } = event.data;
        if (!isRestoringRef.current) {
          setMessages(newMessages);
        }
      }
    };

    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [actNumber, sessionId, isPreview]);

  // Broadcast updates to other tabs
  const broadcastUpdate = (newMessages: CopilotMessage[]) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'chat-update',
        messages: newMessages
      });
    }
  };

  // Save to localStorage
  const saveToLocalStorage = (msgs: CopilotMessage[]) => {
    try {
      const memory: ActMemory = {
        actNumber,
        sessionId,
        messages: msgs,
        remaining: -1, // -1 indicates unlimited
        createdAt: Date.now(),
        lastAccessed: Date.now()
      };
      localStorage.setItem(buildActMemoryKey(sessionId, actNumber), JSON.stringify(memory));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  };

  // Load from localStorage
  const loadFromLocalStorage = (): ActMemory | null => {
    try {
      const key = buildActMemoryKey(sessionId, actNumber);
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const memory: ActMemory = JSON.parse(stored);
      
      // Check if act has expired (24 hours)
      const now = Date.now();
      const hoursSinceCreation = (now - memory.createdAt) / (1000 * 60 * 60);
      if (hoursSinceCreation >= ACT_EXPIRY_HOURS) {
        localStorage.removeItem(key);
        return null;
      }
      
      // Update last accessed
      memory.lastAccessed = now;
      localStorage.setItem(key, JSON.stringify(memory));
      
      return memory;
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
      return null;
    }
  };

  // Restore chat history on mount
  useEffect(() => {
    let mounted = true;
    if (isPreview) return;

    isRestoringRef.current = true;

    const restoreHistory = async () => {
      try {
        // First try to load from localStorage (fastest)
        const localMemory = loadFromLocalStorage();
        
        if (localMemory && localMemory.messages.length > 0) {
          if (mounted) {
            setMessages(localMemory.messages);
          }
        }

        // Then load from backend (authoritative source)
        if (sessionId) {
          const history = await copilotService.getHistory(actNumber, sessionId, isPreview);
          if (mounted && history.length > 0) {
            setMessages(history);
            saveToLocalStorage(history);
          }
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Failed to restore history:', err);
        }
      } finally {
        if (mounted) {
          isRestoringRef.current = false;
        }
      }
    };

    restoreHistory();
    return () => {
      mounted = false;
    };
  }, [actNumber, sessionId, isPreview]);

  // C2 mode has unlimited queries - no warnings needed

  useEffect(() => {
    panelOpenAt.current = Date.now();
    copilotService
      .logEvent({
        sessionId,
        actNumber,
        event: 'panel_open',
        payload: { openedAt: panelOpenAt.current },
        isPreview
      })
      .catch(() => {});
    return () => {
      const closedAt = Date.now();
      const openedAt = panelOpenAt.current || closedAt;
      copilotService
        .logEvent({
          sessionId,
          actNumber,
          event: 'panel_close',
          payload: { openedAt, closedAt, durationMs: closedAt - openedAt },
          isPreview
        })
        .catch(() => {});
    };
  }, [actNumber, isPreview, sessionId]);

  useEffect(() => {
    if (!contextPack) return;
    copilotService
      .updateContext({
        sessionId,
        actNumber,
        contextPack,
        isPreview
      })
      .catch(() => {});
  }, [actNumber, contextPack, isPreview, sessionId]);

  useEffect(() => {
    if (!contextPack) return;
    const sendProactive = async () => {
      setLoading(true);
      try {
        const response = await copilotService.sendMessage({
          sessionId,
          actNumber,
          action: 'proactive',
          contextPack,
          isPreview,
          selectedOptionId
        });
        setMessages([{ id: `assistant-${Date.now()}`, role: 'assistant', content: response.reply, action: 'proactive' }]);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load copilot message');
      } finally {
        setLoading(false);
      }
    };
    sendProactive();
  }, [actNumber, contextPack, isPreview, selectedOptionId, sessionId]);

  useEffect(() => {
    if (!contextPack || !preSubmitTrigger) return;
    const sendPreSubmit = async () => {
      setLoading(true);
      try {
        const response = await copilotService.sendMessage({
          sessionId,
          actNumber,
          action: 'pre_submit',
          message: justificationText,
          contextPack,
          isPreview,
          selectedOptionId
        });
        setMessages(prev => [
          ...prev,
          { id: `assistant-${Date.now()}`, role: 'assistant', content: response.reply, action: 'pre_submit' }
        ]);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load copilot message');
      } finally {
        setLoading(false);
      }
    };
    sendPreSubmit();
  }, [preSubmitTrigger, actNumber, contextPack, isPreview, justificationText, selectedOptionId, sessionId]);

  const logButton = (button: string) => {
    copilotService
      .logEvent({
        sessionId,
        actNumber,
        event: 'button',
        payload: { button },
        isPreview
      })
      .catch(() => {});
  };

  const appendUserMessage = (text: string) => {
    setMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: text, action: 'user_message' }
    ]);
  };

  const appendAssistantMessage = (text: string, action?: CopilotAction) => {
    setMessages(prev => [
      ...prev,
      { id: `assistant-${Date.now()}`, role: 'assistant', content: text, action }
    ]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !contextPack) return;
    setInput('');
    setError(null);
    
    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      action: 'user_message'
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);
    
    try {
      const response = await copilotService.sendMessage({
        sessionId,
        actNumber,
        action: 'user_message',
        message: trimmed,
        contextPack,
        isPreview,
        selectedOptionId
      });
      
      const assistantMessage: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        action: 'user_message'
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Save to localStorage and broadcast
      saveToLocalStorage(finalMessages);
      broadcastUpdate(finalMessages);
    } catch (err: any) {
      // Failed API calls - remove user message and restore state
      setMessages(messages);
      setError(err?.response?.data?.message || 'Copilot request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: CopilotAction, buttonKey: string) => {
    if (!contextPack || loading) return;
    logButton(buttonKey);
    setError(null);
    setLoading(true);
    try {
      const response = await copilotService.sendMessage({
        sessionId,
        actNumber,
        action,
        message: input.trim() || justificationText,
        contextPack,
        isPreview,
        selectedOptionId
      });
      appendAssistantMessage(response.reply, action);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Copilot request failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="c2-copilot-panel">
      <div className="c2-copilot-header">
        <div className="c2-title">C2 Agentic Copilot</div>
        <div className="c2-subtitle">Executive reflection mode with strong memory</div>
      </div>

      <div className="c2-action-row">
        <button type="button" onClick={() => handleAction('clarify', 'clarify')} disabled={loading || !contextPack}>
          Clarify my goals
        </button>
        <button type="button" onClick={() => handleAction('stress_test', 'stress_test')} disabled={loading || !contextPack}>
          Stress test my choice
        </button>
      </div>

      <div className="c2-messages">
        {messages.length === 0 && (
          <div className="c2-empty">Loading copilot...</div>
        )}
        {messages.map(message => (
          <div key={message.id} className={`c2-message ${message.role}`}>
            <div className="c2-message-content">{message.content}</div>
          </div>
        ))}
      </div>

      {error && <div className="c2-error">{error}</div>}

      <div className="c2-input">
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask the copilot a question..."
          rows={3}
          disabled={loading || !contextPack}
        />
        <button type="button" onClick={handleSend} disabled={!canSend || !contextPack}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

    </div>
  );
};

export default C2CopilotPanel;
