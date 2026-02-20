import React, { useEffect, useMemo, useState, useRef } from 'react';
import { aiService, ChatMessage } from '../../services/ai';
import './AIAssistPanel.css';

interface AIAssistPanelProps {
  actNumber: number;
  sessionId?: string;
  isPreview: boolean;
  enabled: boolean;
  mode?: 'C1' | 'C2';
}

type MessageRole = 'user' | 'assistant';

interface AiMessage {
  id: string;
  role: MessageRole;
  content: string;
  saved?: boolean;
}

const MAX_QUESTIONS = 3;
const ACT_EXPIRY_HOURS = 24;

const buildNoteKey = (sessionId: string | undefined, actNumber: number) =>
  `aiNotes:${sessionId || 'preview'}:act:${actNumber}`;

const buildActMemoryKey = (sessionId: string | undefined, actNumber: number) =>
  `c1ActMemory:${sessionId || 'preview'}:act:${actNumber}`;

interface ActMemory {
  actNumber: number;
  sessionId?: string;
  messages: AiMessage[];
  remaining: number;
  createdAt: number;
  lastAccessed: number;
}

const AIAssistPanel: React.FC<AIAssistPanelProps> = ({
  actNumber,
  sessionId,
  isPreview,
  enabled,
  mode = 'C1'
}) => {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(MAX_QUESTIONS);
  const [showWarning, setShowWarning] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isRestoringRef = useRef(false);

  const counterLabel = useMemo(() => {
    return `Queries: ${remaining}/${MAX_QUESTIONS} remaining`;
  }, [remaining]);

  // Initialize BroadcastChannel for multi-tab sync
  useEffect(() => {
    if (!enabled || mode !== 'C1') return;
    
    const channelName = `c1-act-${actNumber}-${sessionId || 'preview'}`;
    const channel = new BroadcastChannel(channelName);
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data.type === 'chat-update') {
        const { messages: newMessages, remaining: newRemaining } = event.data;
        if (!isRestoringRef.current) {
          setMessages(newMessages);
          setRemaining(newRemaining);
        }
      }
    };

    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [actNumber, sessionId, enabled, mode]);

  // Broadcast updates to other tabs
  const broadcastUpdate = (newMessages: AiMessage[], newRemaining: number) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'chat-update',
        messages: newMessages,
        remaining: newRemaining
      });
    }
  };

  // Save to localStorage
  const saveToLocalStorage = (msgs: AiMessage[], rem: number) => {
    try {
      const memory: ActMemory = {
        actNumber,
        sessionId,
        messages: msgs,
        remaining: rem,
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
    if (!enabled) return;

    isRestoringRef.current = true;

    const restoreHistory = async () => {
      try {
        // First try to load from localStorage (fastest)
        const localMemory = loadFromLocalStorage();
        
        if (localMemory && localMemory.messages.length > 0) {
          if (mounted) {
            setMessages(localMemory.messages);
            setRemaining(localMemory.remaining);
          }
        }

        // Then load from backend (authoritative source)
        if (!isPreview && sessionId) {
          const history = await aiService.getHistory(actNumber, sessionId, isPreview);
          if (mounted && history.length > 0) {
            const restoredMessages: AiMessage[] = history.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content
            }));
            setMessages(restoredMessages);
            
            // Also update remaining count
            const usage = await aiService.getUsage(actNumber, sessionId, isPreview);
            if (mounted && typeof usage.remaining === 'number') {
              setRemaining(usage.remaining);
              saveToLocalStorage(restoredMessages, usage.remaining);
            }
          }
        } else {
          // For preview mode, just load usage
          const usage = await aiService.getUsage(actNumber, sessionId, isPreview);
          if (mounted && typeof usage.remaining === 'number') {
            setRemaining(usage.remaining);
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
  }, [actNumber, enabled, isPreview, sessionId]);

  // Show warning when 1 query remaining (3rd query)
  useEffect(() => {
    if (remaining === 1 && messages.length > 0) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
    }
  }, [remaining, messages.length]);

  if (!enabled) {
    return null;
  }

  const canSend = !loading && remaining > 0 && input.trim().length > 0;

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading || remaining <= 0) return;

    setLoading(true);
    setError(null);
    setInput('');

    const userMessage: AiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const response = await aiService.sendChat({
        actNumber,
        sessionId,
        message: prompt,
        isPreview
      });

      const assistantMessage: AiMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Only update remaining if we got a successful response
      const newRemaining = typeof response.remaining === 'number' 
        ? response.remaining 
        : Math.max(0, remaining - 1);
      
      setRemaining(newRemaining);
      
      // Save to localStorage and broadcast
      saveToLocalStorage(finalMessages, newRemaining);
      broadcastUpdate(finalMessages, newRemaining);
      
      // Show warning if this was the 3rd query
      if (newRemaining === 0) {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
      }
    } catch (err: any) {
      // Failed API calls do NOT count - remove user message and restore state
      setMessages(messages);
      setError(err?.response?.data?.message || 'AI assist request failed. This query was not counted.');
      // Don't decrement remaining - failed calls don't count
    } finally {
      setLoading(false);
    }
  };

  const saveToNotes = async (message: AiMessage) => {
    try {
      const key = buildNoteKey(sessionId, actNumber);
      const existing = localStorage.getItem(key);
      const parsed = existing ? (JSON.parse(existing) as string[]) : [];
      const next = [...parsed, message.content];
      localStorage.setItem(key, JSON.stringify(next));

      await aiService.saveMessage({
        actNumber,
        sessionId,
        messageId: message.id,
        messageText: message.content,
        isPreview
      });

      setMessages(prev =>
        prev.map(item =>
          item.id === message.id ? { ...item, saved: true } : item
        )
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save note');
    }
  };

  return (
    <div className="ai-assist-panel">
      <div className="ai-assist-header">
        <h3>AI Assist ({mode})</h3>
        <span className="ai-assist-counter">{counterLabel}</span>
      </div>
      <div className="ai-assist-disclaimer">
        {mode === 'C1' 
          ? 'This assistant has no access to case documents or simulation logic. It only sees what you type.'
          : 'This assistant has access to revealed act materials and can help analyze tradeoffs and recommend decisions.'}
      </div>
      {showWarning && remaining === 0 && (
        <div className="ai-assist-warning" style={{ 
          padding: '10px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          ⚠️ No more queries. Start new act to continue.
        </div>
      )}
      {showWarning && remaining === 1 && (
        <div className="ai-assist-warning" style={{ 
          padding: '10px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          ⚠️ Last chance! This is your final query for this act.
        </div>
      )}
      <div className="ai-assist-messages">
        {messages.length === 0 && (
          <div className="ai-assist-empty">
            Ask up to three questions per act to help structure your thinking.
          </div>
        )}
        {messages.map(message => (
          <div key={message.id} className={`ai-assist-message ${message.role}`}>
            <div className="ai-message-content">{message.content}</div>
          </div>
        ))}
      </div>
      {error && <div className="ai-assist-error">{error}</div>}
      <div className="ai-assist-input">
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask a question..."
          rows={3}
          disabled={loading || remaining <= 0}
        />
        <button type="button" onClick={handleSend} disabled={!canSend}>
          {loading ? 'Sending...' : remaining <= 0 ? 'Limit Reached' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default AIAssistPanel;
