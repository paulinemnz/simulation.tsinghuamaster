import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import './AdminStyles.css';

const TABS = ['timeline', 'decisions', 'memos', 'chats', 'scores'] as const;
type Tab = (typeof TABS)[number];

const AdminParticipantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('timeline');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/admin/participants/${id}`)
      .then(response => setData(response.data.data))
      .catch(err => setError(err?.response?.data?.message || 'Failed to load participant'));
  }, [id]);


  if (error) {
    return <div className="admin-page">Error: {error}</div>;
  }

  if (!data) {
    return <div className="admin-page">Loading participant...</div>;
  }

  return (
    <div className="admin-page">
      <h2>Participant {data.participant.participant_code || data.participant.id}</h2>
      <div className="admin-tabs">
        {TABS.map(item => (
          <button
            key={item}
            className={tab === item ? 'active' : ''}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'timeline' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Act</th>
              <th>Type</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {data.eventLogs.map((event: any) => (
              <tr key={event.id}>
                <td>{new Date(event.timestamp).toLocaleString()}</td>
                <td>{event.act_number ?? '-'}</td>
                <td>{event.event_type}</td>
                <td>{event.event_value || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'decisions' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Act</th>
              <th>Option</th>
              <th>Decision Time (ms)</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {data.decisions.map((decision: any) => (
              <tr key={decision.id}>
                <td>{decision.act_number}</td>
                <td>{decision.option_id}</td>
                <td>{decision.decision_time_ms ?? '-'}</td>
                <td>{new Date(decision.submitted_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'memos' && (
        <div className="admin-section">
          {data.memos.map((memo: any) => {
            // Parse memo text to extract questions and answers
            // Format: "1. Question text\n\nAnswer text\n\n2. Question text\n\nAnswer text..."
            const parseMemo = (text: string) => {
              const questions = [
                'What were the three most critical decisions you made as CEO, and why?',
                'What key factors influenced your response to the PolskaStal crisis?',
                'Looking back, what would you do differently if you led Terraform in reality?',
                'What is the single most important lesson you take from this experience?'
              ];
              
              const parsed: Array<{ question: string; answer: string }> = [];
              
              // Split text by numbered question pattern (e.g., "1. ", "2. ", etc.)
              const sections = text.split(/(?=\d+\.\s+)/);
              
              sections.forEach((section) => {
                const trimmed = section.trim();
                if (!trimmed) return;
                
                // Check if this section starts with a numbered question
                // Use [\s\S] instead of . with s flag for ES compatibility
                const match = trimmed.match(/^(\d+)\.\s+([\s\S]+?)(?:\n\n|\n|$)([\s\S]*)$/);
                if (match) {
                  const questionNum = parseInt(match[1], 10);
                  const questionText = match[2].trim();
                  let answer = match[3] || '';
                  
                  // Clean up answer (remove leading/trailing newlines)
                  answer = answer.replace(/^\n+/, '').replace(/\n+$/, '').trim();
                  
                  // Use the standard question text if we can match it
                  const standardQuestion = questions[questionNum - 1];
                  parsed.push({
                    question: standardQuestion || questionText,
                    answer: answer || 'No answer provided'
                  });
                }
              });
              
              // Fallback: if regex parsing failed, try direct question matching
              if (parsed.length === 0) {
                questions.forEach((q, idx) => {
                  const qLower = q.toLowerCase();
                  const textLower = text.toLowerCase();
                  const qIndex = textLower.indexOf(qLower);
                  
                  if (qIndex !== -1) {
                    const answerStart = qIndex + q.length;
                    // Find the start of the next question or end of text
                    let nextQIndex = text.length;
                    if (idx < questions.length - 1) {
                      const nextQ = questions[idx + 1].toLowerCase();
                      const nextQPos = textLower.indexOf(nextQ, answerStart);
                      if (nextQPos !== -1) {
                        nextQIndex = nextQPos;
                      }
                    }
                    
                    const answer = text.substring(answerStart, nextQIndex)
                      .replace(/^\n+/, '')
                      .replace(/\n+$/, '')
                      .trim();
                    
                    parsed.push({ 
                      question: q, 
                      answer: answer || 'No answer provided' 
                    });
                  }
                });
              }
              
              // Final fallback: if still no parsing, return full text
              if (parsed.length === 0) {
                return [{ question: 'Full Memo Text', answer: text }];
              }
              
              return parsed;
            };
            
            const parsedMemo = parseMemo(memo.text);
            
            return (
              <div key={memo.id} className="admin-card" style={{ marginBottom: '2rem' }}>
                <h4>Strategic Memo - Act {memo.act_number}</h4>
                <p style={{ color: '#667085', fontSize: '0.9em', marginBottom: '1.5rem' }}>
                  Submitted: {new Date(memo.submitted_at).toLocaleString()} | Word count: {memo.word_count || '-'}
                </p>
                
                {parsedMemo.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: idx < parsedMemo.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <h5 style={{ marginBottom: '0.75rem', color: '#1f2937', fontSize: '1.1em' }}>
                      Question {idx + 1}
                    </h5>
                    <p style={{ marginBottom: '1rem', fontWeight: 500, color: '#374151' }}>
                      {item.question}
                    </p>
                    <div style={{ 
                      background: '#f9fafb', 
                      padding: '1rem', 
                      borderRadius: '6px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6',
                      color: '#1f2937'
                    }}>
                      {item.answer || <em style={{ color: '#9ca3af' }}>No answer provided</em>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'chats' && (
        <div className="admin-section">
          {data.chatLogs.map((chat: any) => (
            <div key={chat.id} className="admin-card">
              <strong>
                Act {chat.act_number} · {chat.role}
              </strong>
              <p>{chat.content}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'scores' && (
        <div className="admin-section">
          <pre>{JSON.stringify(data.computedScores, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AdminParticipantDetail;
