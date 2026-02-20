import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './AdminStyles.css';

interface MemoData {
  id: string;
  participant_id: string;
  participant_code: string | null;
  mode: string | null;
  participant_status: string | null;
  act_number: number;
  text: string;
  word_count: number | null;
  submitted_at: string;
}

interface ParsedMemo {
  question: string;
  answer: string;
}

interface AIAttitudeResponse {
  id: string;
  participant_id: string;
  participant_code: string | null;
  mode: string | null;
  participant_status: string | null;
  simulation_session_id: string | null;
  general_ai_trust_1: number | null;
  general_ai_trust_2: number | null; // Reversed
  general_ai_trust_3: number | null;
  general_ai_trust_4: number | null;
  simulation_ai_trust_1: number | null;
  simulation_ai_trust_2: number | null;
  simulation_ai_trust_3: number | null;
  ai_usage_frequency: number | null;
  responses: any;
  submitted_at: string;
}

const AdminPostSimulation: React.FC = () => {
  const [memos, setMemos] = useState<MemoData[]>([]);
  const [aiAttitudeResponses, setAIAttitudeResponses] = useState<AIAttitudeResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'memos' | 'ai-attitude'>('memos');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [memosResponse, aiAttitudeResponse] = await Promise.all([
        api.get('/admin/post-simulation').catch(() => ({ data: { data: [] } })),
        api.get('/admin/ai-attitude').catch(() => ({ data: { data: [] } }))
      ]);

      setMemos(memosResponse.data.data || []);
      setAIAttitudeResponses(aiAttitudeResponse.data.data || []);
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load data');
      setLoading(false);
    }
  };

  const toggleMemo = (memoId: string) => {
    setExpandedMemos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memoId)) {
        newSet.delete(memoId);
      } else {
        newSet.add(memoId);
      }
      return newSet;
    });
  };

  // Parse memo text to extract questions and answers
  const parseMemo = (text: string): ParsedMemo[] => {
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
      
      const match = trimmed.match(/^(\d+)\.\s+([\s\S]+?)(?:\n\n|\n|$)([\s\S]*)$/);
      if (match) {
        const questionNum = parseInt(match[1], 10);
        const questionText = match[2].trim();
        let answer = match[3] || '';
        
        answer = answer.replace(/^\n+/, '').replace(/\n+$/, '').trim();
        
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
    
    if (parsed.length === 0) {
      return [{ question: 'Full Memo Text', answer: text }];
    }
    
    return parsed;
  };

  // Calculate statistics for AI attitude responses
  const calculateStats = () => {
    const validResponses = aiAttitudeResponses.filter(r => 
      r.general_ai_trust_1 !== null || r.simulation_ai_trust_1 !== null
    );

    if (validResponses.length === 0) {
      return null;
    }

    const calculateAverage = (field: keyof AIAttitudeResponse) => {
      const values = validResponses
        .map(r => r[field])
        .filter((v): v is number => v !== null && typeof v === 'number');
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };

    // For reversed question (general_ai_trust_2), reverse the score (8 - value)
    const calculateAverageReversed = () => {
      const values = validResponses
        .map(r => r.general_ai_trust_2)
        .filter((v): v is number => v !== null && typeof v === 'number')
        .map(v => 8 - v); // Reverse: 1->7, 2->6, etc.
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };

    return {
      totalResponses: validResponses.length,
      generalAI: {
        q1: calculateAverage('general_ai_trust_1'),
        q2: calculateAverageReversed(), // Reversed
        q3: calculateAverage('general_ai_trust_3'),
        q4: calculateAverage('general_ai_trust_4'),
        average: (calculateAverage('general_ai_trust_1') + calculateAverageReversed() + 
                  calculateAverage('general_ai_trust_3') + calculateAverage('general_ai_trust_4')) / 4
      },
      simulationAI: {
        q1: calculateAverage('simulation_ai_trust_1'),
        q2: calculateAverage('simulation_ai_trust_2'),
        q3: calculateAverage('simulation_ai_trust_3'),
        average: (calculateAverage('simulation_ai_trust_1') + 
                  calculateAverage('simulation_ai_trust_2') + 
                  calculateAverage('simulation_ai_trust_3')) / 3
      },
      byMode: {
        C1: validResponses.filter(r => r.mode === 'C1').length,
        C2: validResponses.filter(r => r.mode === 'C2').length,
        C0: validResponses.filter(r => r.mode === 'C0').length
      }
    };
  };

  const stats = calculateStats();

  // Render bar chart for a value
  const renderBarChart = (value: number, maxValue: number = 7, label: string) => {
    const percentage = (value / maxValue) * 100;
    return (
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.85em', color: '#374151' }}>{label}</span>
          <span style={{ fontSize: '0.85em', fontWeight: 600, color: '#1f2937' }}>
            {value.toFixed(2)} / {maxValue}
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: percentage >= 70 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.75em',
            fontWeight: 600
          }}>
            {percentage >= 15 && `${value.toFixed(1)}`}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="admin-page">Loading post-simulation data...</div>;
  }

  if (error) {
    return <div className="admin-page">Error: {error}</div>;
  }

  const questions = [
    'What were the three most critical decisions you made as CEO, and why?',
    'What key factors influenced your response to the PolskaStal crisis?',
    'Looking back, what would you do differently if you led Terraform in reality?',
    'What is the single most important lesson you take from this experience?'
  ];

  const aiQuestions = {
    general: [
      'I generally trust the output of AI systems to be accurate and reliable.',
      'I feel uncomfortable making decisions based on AI recommendations. (R)',
      'I am familiar with how large language models (like ChatGPT, Claude, Gemini) work.',
      'AI tools are integrated into my daily work/study routines.'
    ],
    simulation: [
      'The AI support I received in this simulation was trustworthy.',
      'I relied on AI recommendations when making my decisions.',
      'The AI helped me see things I would have missed.'
    ]
  };

  return (
    <div className="admin-page">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Post-Simulation Data</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={() => setActiveTab('memos')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d5d9e3',
              background: activeTab === 'memos' ? '#7c3aed' : '#fff',
              color: activeTab === 'memos' ? '#fff' : '#374151',
              cursor: 'pointer',
              fontWeight: activeTab === 'memos' ? 600 : 400
            }}
          >
            Strategic Memos ({memos.length})
          </button>
          <button
            onClick={() => setActiveTab('ai-attitude')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d5d9e3',
              background: activeTab === 'ai-attitude' ? '#7c3aed' : '#fff',
              color: activeTab === 'ai-attitude' ? '#fff' : '#374151',
              cursor: 'pointer',
              fontWeight: activeTab === 'ai-attitude' ? 600 : 400
            }}
          >
            AI Attitude Assessment ({aiAttitudeResponses.length})
          </button>
        </div>
      </div>

      {activeTab === 'memos' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Strategic Memos</h3>
          <p style={{ color: '#667085', marginBottom: '1.5rem' }}>
            All strategic memos submitted after completing the simulation (Act 4). Total: {memos.length}
          </p>

          {memos.length === 0 ? (
            <div className="admin-card">
              <p>No memos submitted yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', fontSize: '0.9em' }}>
                <thead>
                  <tr>
                    <th style={{ width: '120px', position: 'sticky', left: 0, background: '#fff', zIndex: 10 }}>Participant</th>
                    <th style={{ width: '60px' }}>Mode</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '150px' }}>Submitted</th>
                    <th style={{ width: '80px' }}>Words</th>
                    {questions.map((q, idx) => (
                      <th key={idx} style={{ minWidth: '250px', maxWidth: '350px' }}>
                        Q{idx + 1}
                      </th>
                    ))}
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {memos.map((memo) => {
                    const parsedMemo = parseMemo(memo.text);
                    const isExpanded = expandedMemos.has(memo.id);
                    const getAnswer = (questionIndex: number) => {
                      const item = parsedMemo[questionIndex];
                      if (!item || !item.answer) return '-';
                      const maxLength = 150;
                      if (item.answer.length > maxLength) {
                        return item.answer.substring(0, maxLength) + '...';
                      }
                      return item.answer;
                    };

                    return (
                      <React.Fragment key={memo.id}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => toggleMemo(memo.id)}>
                          <td style={{ position: 'sticky', left: 0, background: '#fff', fontWeight: 500 }}>
                            {memo.participant_code || memo.participant_id.slice(0, 8)}
                          </td>
                          <td>{memo.mode || '-'}</td>
                          <td>{memo.participant_status || '-'}</td>
                          <td>{new Date(memo.submitted_at).toLocaleDateString()}</td>
                          <td>{memo.word_count || '-'}</td>
                          {questions.map((_, idx) => (
                            <td key={idx} style={{ 
                              maxWidth: '350px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              padding: '0.5rem'
                            }}>
                              {getAnswer(idx)}
                            </td>
                          ))}
                          <td>
                            <Link 
                              to={`/admin/participants/${memo.participant_id}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: '#7c3aed', textDecoration: 'none' }}
                            >
                              View
                            </Link>
                            {' | '}
                            <span style={{ color: '#7c3aed', cursor: 'pointer' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} style={{ padding: '1rem', background: '#f9fafb' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                {parsedMemo.map((item, idx) => (
                                  <div key={idx} style={{ 
                                    background: '#fff', 
                                    padding: '1rem', 
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb'
                                  }}>
                                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95em', color: '#1f2937' }}>
                                      Question {idx + 1}
                                    </h5>
                                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85em', fontWeight: 500, color: '#374151' }}>
                                      {item.question}
                                    </p>
                                    <div style={{ 
                                      fontSize: '0.85em',
                                      whiteSpace: 'pre-wrap',
                                      lineHeight: '1.5',
                                      color: '#1f2937'
                                    }}>
                                      {item.answer || <em style={{ color: '#9ca3af' }}>No answer provided</em>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai-attitude' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>AI Attitude Assessment</h3>
          <p style={{ color: '#667085', marginBottom: '1.5rem' }}>
            AI attitude and trust responses from participants in Generative AI (C1) and Agentic AI (C2) conditions.
            Total responses: {aiAttitudeResponses.length}
          </p>

          {aiAttitudeResponses.length === 0 ? (
            <div className="admin-card">
              <p>No AI attitude responses submitted yet.</p>
            </div>
          ) : (
            <>
              {/* Dashboard Summary */}
              {stats && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  {/* General AI Attitudes */}
                  <div className="admin-card" style={{ maxWidth: '100%' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937' }}>
                      General AI Attitudes
                    </h4>
                    {renderBarChart(stats.generalAI.q1, 7, aiQuestions.general[0])}
                    {renderBarChart(stats.generalAI.q2, 7, aiQuestions.general[1] + ' (Reversed)')}
                    {renderBarChart(stats.generalAI.q3, 7, aiQuestions.general[2])}
                    {renderBarChart(stats.generalAI.q4, 7, aiQuestions.general[3])}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e5e7eb' }}>
                      {renderBarChart(stats.generalAI.average, 7, 'Overall Average')}
                    </div>
                  </div>

                  {/* Simulation-Specific AI Trust */}
                  <div className="admin-card" style={{ maxWidth: '100%' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937' }}>
                      Simulation-Specific AI Trust
                    </h4>
                    {renderBarChart(stats.simulationAI.q1, 7, aiQuestions.simulation[0])}
                    {renderBarChart(stats.simulationAI.q2, 7, aiQuestions.simulation[1])}
                    {renderBarChart(stats.simulationAI.q3, 7, aiQuestions.simulation[2])}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e5e7eb' }}>
                      {renderBarChart(stats.simulationAI.average, 7, 'Overall Average')}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="admin-card" style={{ maxWidth: '100%' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937' }}>
                      Summary Statistics
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Total Responses
                        </div>
                        <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#1f2937' }}>
                          {stats.totalResponses}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '0.5rem' }}>
                          By Mode
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.9em' }}>C1 (Generative AI):</span>
                            <span style={{ fontWeight: 600 }}>{stats.byMode.C1}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.9em' }}>C2 (Agentic AI):</span>
                            <span style={{ fontWeight: 600 }}>{stats.byMode.C2}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.9em' }}>C0 (No AI):</span>
                            <span style={{ fontWeight: 600 }}>{stats.byMode.C0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Responses Table */}
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Individual Responses</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', fontSize: '0.9em' }}>
                    <thead>
                      <tr>
                        <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 10 }}>Participant</th>
                        <th>Mode</th>
                        <th>Submitted</th>
                        <th colSpan={4} style={{ textAlign: 'center', background: '#f9fafb' }}>
                          General AI Attitudes
                        </th>
                        <th colSpan={3} style={{ textAlign: 'center', background: '#f9fafb' }}>
                          Simulation-Specific Trust
                        </th>
                        <th>Actions</th>
                      </tr>
                      <tr>
                        <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 10 }}></th>
                        <th></th>
                        <th></th>
                        <th style={{ fontSize: '0.8em', background: '#f9fafb' }}>Q1</th>
                        <th style={{ fontSize: '0.8em', background: '#f9fafb' }}>Q2 (R)</th>
                        <th style={{ fontSize: '0.8em', background: '#f9fafb' }}>Q3</th>
                        <th style={{ fontSize: '0.8em', background: '#f9fafb' }}>Q4</th>
                        <th style={{ fontSize: '0.8em', background: '#f9fafb' }}>Q1</th>
                        <th style={{ fontSize: '0.8em', background: '#f9fafb' }}>Q2</th>
                        <th style={{ fontSize: '0.8em', background: '#f9fafb' }}>Q3</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiAttitudeResponses.map((response) => {
                        // Reverse Q2 for display (show as if it's not reversed)
                        const displayQ2 = response.general_ai_trust_2 !== null 
                          ? 8 - response.general_ai_trust_2 
                          : null;

                        return (
                          <tr key={response.id}>
                            <td style={{ position: 'sticky', left: 0, background: '#fff', fontWeight: 500 }}>
                              {response.participant_code || response.participant_id.slice(0, 8)}
                            </td>
                            <td>{response.mode || '-'}</td>
                            <td>{new Date(response.submitted_at).toLocaleDateString()}</td>
                            <td style={{ textAlign: 'center' }}>
                              {response.general_ai_trust_1 !== null ? response.general_ai_trust_1 : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {displayQ2 !== null ? `${displayQ2.toFixed(0)}` : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {response.general_ai_trust_3 !== null ? response.general_ai_trust_3 : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {response.general_ai_trust_4 !== null ? response.general_ai_trust_4 : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {response.simulation_ai_trust_1 !== null ? response.simulation_ai_trust_1 : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {response.simulation_ai_trust_2 !== null ? response.simulation_ai_trust_2 : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {response.simulation_ai_trust_3 !== null ? response.simulation_ai_trust_3 : '-'}
                            </td>
                            <td>
                              <Link 
                                to={`/admin/participants/${response.participant_id}`}
                                style={{ color: '#7c3aed', textDecoration: 'none' }}
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPostSimulation;
