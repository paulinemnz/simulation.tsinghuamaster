import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './PostTaskReflection.css';

const PostTaskReflection: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [question1, setQuestion1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [question3, setQuestion3] = useState('');
  const [question4, setQuestion4] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Session mode and AI questions state
  const [sessionMode, setSessionMode] = useState<'C0' | 'C1' | 'C2' | null>(null);
  const [loadingMode, setLoadingMode] = useState(true);
  
  // AI Attitude Questions (only for C1 and C2)
  const [aiQuestion1, setAiQuestion1] = useState<number>(0); // General AI Trust 1
  const [aiQuestion2, setAiQuestion2] = useState<number>(0); // General AI Trust 2 (R)
  const [aiQuestion3, setAiQuestion3] = useState<number>(0); // General AI Trust 3
  const [aiQuestion4, setAiQuestion4] = useState<number>(0); // General AI Trust 4
  const [aiQuestion5, setAiQuestion5] = useState<number>(0); // Simulation-Specific AI Trust 1
  const [aiQuestion6, setAiQuestion6] = useState<number>(0); // Simulation-Specific AI Trust 2
  const [aiQuestion7, setAiQuestion7] = useState<number>(0); // Simulation-Specific AI Trust 3
  const [aiQuestion8, setAiQuestion8] = useState<number>(0); // AI Usage Frequency
  const [submittingAiQuestions, setSubmittingAiQuestions] = useState(false);
  const [aiQuestionsSubmitted, setAiQuestionsSubmitted] = useState(false);
  const [aiQuestionsError, setAiQuestionsError] = useState<string | null>(null);
  
  // Fetch session mode on mount
  useEffect(() => {
    const fetchSessionMode = async () => {
      if (!sessionId) {
        setLoadingMode(false);
        return;
      }
      
      try {
        const response = await api.get(`/sim/${sessionId}/state`);
        if (response.data.status === 'success' && response.data.data.session) {
          setSessionMode(response.data.data.session.mode || 'C0');
        } else {
          setSessionMode('C0');
        }
      } catch (err: any) {
        console.error('Error fetching session mode:', err);
        setSessionMode('C0'); // Default to C0 on error
      } finally {
        setLoadingMode(false);
      }
    };
    
    fetchSessionMode();
  }, [sessionId]);
  
  const isC1OrC2 = sessionMode === 'C1' || sessionMode === 'C2';

  // Scroll to AI questions section when memo is submitted and mode is C1/C2
  useEffect(() => {
    if (submitted && isC1OrC2 && !loadingMode) {
      // Small delay to ensure the AI questions section is rendered
      const timer = setTimeout(() => {
        const aiQuestionsSection = document.getElementById('ai-attitude-section');
        if (aiQuestionsSection) {
          aiQuestionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [submitted, isC1OrC2, loadingMode]);

  const totalWordCount = useMemo(() => {
    const allText = `${question1} ${question2} ${question3} ${question4}`.trim();
    return allText.split(/\s+/).filter(Boolean).length;
  }, [question1, question2, question3, question4]);

  const handleSubmit = async () => {
    console.log('[PostTaskReflection] handleSubmit called', { sessionId, totalWordCount, submitting, submitted });
    
    if (!sessionId) {
      console.error('[PostTaskReflection] No sessionId');
      setError('Session ID is missing. Please refresh the page.');
      return;
    }
    
    // Combine all answers into a structured memo
    const memoText = `1. What were the three most critical decisions you made as CEO, and why?\n\n${question1.trim()}\n\n2. What key factors influenced your response to the PolskaStal crisis?\n\n${question2.trim()}\n\n3. Looking back, what would you do differently if you led Terraform in reality?\n\n${question3.trim()}\n\n4. What is the single most important lesson you take from this experience?\n\n${question4.trim()}`;
    
    // Check if all questions have some content
    if (!question1.trim() || !question2.trim() || !question3.trim() || !question4.trim()) {
      setError('Please provide answers to all questions');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      console.log('[PostTaskReflection] Submitting memo...', { sessionId, actNumber: 4, textLength: memoText.trim().length });
      const response = await api.post('/sim/memo/submit', {
        sessionId,
        actNumber: 4,
        text: memoText.trim()
      });
      console.log('[PostTaskReflection] Memo submitted successfully', response.data);
      setSubmitted(true);
    } catch (err: any) {
      console.error('[PostTaskReflection] Error submitting memo:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to submit memo. Please try again.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleSubmitAiQuestions = async () => {
    if (!sessionId) return;
    
    // Validate all questions are answered (values > 0)
    if (aiQuestion1 === 0 || aiQuestion2 === 0 || aiQuestion3 === 0 || aiQuestion4 === 0 ||
        aiQuestion5 === 0 || aiQuestion6 === 0 || aiQuestion7 === 0 || aiQuestion8 === 0) {
      setAiQuestionsError('Please answer all questions');
      return;
    }
    
    setSubmittingAiQuestions(true);
    setAiQuestionsError(null);
    try {
      await api.post('/sim/ai-attitude/submit', {
        sessionId,
        responses: {
          generalAiTrust1: aiQuestion1,
          generalAiTrust2: aiQuestion2, // (R) - reversed
          generalAiTrust3: aiQuestion3,
          generalAiTrust4: aiQuestion4,
          simulationAiTrust1: aiQuestion5,
          simulationAiTrust2: aiQuestion6,
          simulationAiTrust3: aiQuestion7,
          aiUsageFrequency: aiQuestion8
        }
      });
      setAiQuestionsSubmitted(true);
    } catch (err: any) {
      setAiQuestionsError(err?.response?.data?.message || 'Failed to submit AI attitude questions');
    } finally {
      setSubmittingAiQuestions(false);
    }
  };

  return (
    <div className="post-task-page">
      <div className="post-task-card">
        <h2>Strategic Memo to the Board of Directors</h2>
        <p className="post-task-intro">
          The simulation of strategic decisions has ended. You will now pass your position to a new CEO and need to write a memo on what has happened in those years and the choices you made. This section is completed without AI assistance.
        </p>
        <p className="post-task-instructions">
          Please respond to the following questions:
        </p>
        
        <div className="post-task-questions">
          <div className="post-task-question">
            <label>
              <strong>1. What were the three most critical decisions you made as CEO, and why?</strong>
            </label>
            <textarea
              value={question1}
              onChange={event => setQuestion1(event.target.value)}
              placeholder="Write your answer..."
              rows={5}
              disabled={submitted}
            />
          </div>

          <div className="post-task-question">
            <label>
              <strong>2. What key factors influenced your response to the PolskaStal crisis?</strong>
            </label>
            <textarea
              value={question2}
              onChange={event => setQuestion2(event.target.value)}
              placeholder="Write your answer..."
              rows={5}
              disabled={submitted}
            />
          </div>

          <div className="post-task-question">
            <label>
              <strong>3. Looking back, what would you do differently if you led Terraform in reality?</strong>
            </label>
            <textarea
              value={question3}
              onChange={event => setQuestion3(event.target.value)}
              placeholder="Write your answer..."
              rows={5}
              disabled={submitted}
            />
          </div>

          <div className="post-task-question">
            <label>
              <strong>4. What is the single most important lesson you take from this experience?</strong>
            </label>
            <textarea
              value={question4}
              onChange={event => setQuestion4(event.target.value)}
              placeholder="Write your answer..."
              rows={5}
              disabled={submitted}
            />
          </div>
        </div>

        <div className="post-task-meta">
          <span>Total word count: {totalWordCount}</span>
        </div>
        {error && <div className="post-task-error">{error}</div>}
        {!submitted ? (
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Memo'}
          </button>
        ) : (
          <div className="post-task-success">
            <p style={{ fontSize: '18px', fontWeight: '500', color: '#1f2937', marginBottom: '12px' }}>
              Your memo has been submitted successfully!
            </p>
            {isC1OrC2 && !loadingMode ? (
              <p style={{ color: '#667085', fontSize: '14px' }}>
                Please continue to the AI Attitude Assessment below.
              </p>
            ) : (
              <>
                <p style={{ fontSize: '16px', color: '#344054', lineHeight: '1.6', marginBottom: '8px' }}>
                  Thank you so much for your participation in this research. Your insights and reflections are incredibly valuable to us.
                </p>
                <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
                  Shortly, you will receive an email with the results and insights from this research study. We appreciate your time and thoughtful contributions.
                </p>
                <button onClick={() => navigate('/')}>Return Home</button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* AI Attitude Questions Section - Only for C1 and C2, after memo submission */}
      {submitted && isC1OrC2 && !loadingMode && (
        <div id="ai-attitude-section" className="post-task-card" style={{ marginTop: '2rem' }}>
          <h2>AI Attitude Assessment</h2>
          <p className="post-task-intro">
            This section was administered only to participants in the Generative AI and Agentic AI conditions. 
            The No-AI condition did not complete this section.
          </p>
          <p className="post-task-instructions">
            Please indicate your agreement with the following statements:
          </p>
          
          <div className="post-task-questions">
            <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>General AI Attitudes (1-7 Likert Scale)</h3>
            
            <div className="post-task-question">
              <label>
                <strong>1. I generally trust the output of AI systems to be accurate and reliable.</strong>
              </label>
              <div className="likert-scale">
                {[1, 2, 3, 4, 5, 6, 7].map(value => (
                  <label key={value} className="likert-option">
                    <input
                      type="radio"
                      name="aiQuestion1"
                      value={value}
                      checked={aiQuestion1 === value}
                      onChange={() => setAiQuestion1(value)}
                      disabled={aiQuestionsSubmitted}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <div className="likert-labels">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>

            <div className="post-task-question">
              <label>
                <strong>2. I feel uncomfortable making decisions based on AI recommendations. (R)</strong>
              </label>
              <div className="likert-scale">
                {[1, 2, 3, 4, 5, 6, 7].map(value => (
                  <label key={value} className="likert-option">
                    <input
                      type="radio"
                      name="aiQuestion2"
                      value={value}
                      checked={aiQuestion2 === value}
                      onChange={() => setAiQuestion2(value)}
                      disabled={aiQuestionsSubmitted}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <div className="likert-labels">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>

            <div className="post-task-question">
              <label>
                <strong>3. I am familiar with how large language models (like ChatGPT, Claude, Gemini) work.</strong>
              </label>
              <div className="likert-scale">
                {[1, 2, 3, 4, 5, 6, 7].map(value => (
                  <label key={value} className="likert-option">
                    <input
                      type="radio"
                      name="aiQuestion3"
                      value={value}
                      checked={aiQuestion3 === value}
                      onChange={() => setAiQuestion3(value)}
                      disabled={aiQuestionsSubmitted}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <div className="likert-labels">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>

            <div className="post-task-question">
              <label>
                <strong>4. AI tools are integrated into my daily work/study routines.</strong>
              </label>
              <div className="likert-scale">
                {[1, 2, 3, 4, 5, 6, 7].map(value => (
                  <label key={value} className="likert-option">
                    <input
                      type="radio"
                      name="aiQuestion4"
                      value={value}
                      checked={aiQuestion4 === value}
                      onChange={() => setAiQuestion4(value)}
                      disabled={aiQuestionsSubmitted}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <div className="likert-labels">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>

            <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Simulation-Specific AI Trust (1-7 Likert Scale)</h3>

            <div className="post-task-question">
              <label>
                <strong>5. The AI support I received in this simulation was trustworthy.</strong>
              </label>
              <div className="likert-scale">
                {[1, 2, 3, 4, 5, 6, 7].map(value => (
                  <label key={value} className="likert-option">
                    <input
                      type="radio"
                      name="aiQuestion5"
                      value={value}
                      checked={aiQuestion5 === value}
                      onChange={() => setAiQuestion5(value)}
                      disabled={aiQuestionsSubmitted}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <div className="likert-labels">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>

            <div className="post-task-question">
              <label>
                <strong>6. I relied on AI recommendations when making my decisions.</strong>
              </label>
              <div className="likert-scale">
                {[1, 2, 3, 4, 5, 6, 7].map(value => (
                  <label key={value} className="likert-option">
                    <input
                      type="radio"
                      name="aiQuestion6"
                      value={value}
                      checked={aiQuestion6 === value}
                      onChange={() => setAiQuestion6(value)}
                      disabled={aiQuestionsSubmitted}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <div className="likert-labels">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>

            <div className="post-task-question">
              <label>
                <strong>7. The AI helped me see things I would have missed.</strong>
              </label>
              <div className="likert-scale">
                {[1, 2, 3, 4, 5, 6, 7].map(value => (
                  <label key={value} className="likert-option">
                    <input
                      type="radio"
                      name="aiQuestion7"
                      value={value}
                      checked={aiQuestion7 === value}
                      onChange={() => setAiQuestion7(value)}
                      disabled={aiQuestionsSubmitted}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <div className="likert-labels">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>

            <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>AI Usage Frequency (Behavioral Self-Report)</h3>

            <div className="post-task-question">
              <label>
                <strong>8. How often do you use AI tools for work or study?</strong>
              </label>
              <div className="likert-scale">
                {[1, 2, 3, 4, 5].map(value => (
                  <label key={value} className="likert-option">
                    <input
                      type="radio"
                      name="aiQuestion8"
                      value={value}
                      checked={aiQuestion8 === value}
                      onChange={() => setAiQuestion8(value)}
                      disabled={aiQuestionsSubmitted}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <div className="likert-labels">
                <span>Never</span>
                <span>Multiple times daily</span>
              </div>
              <div className="usage-frequency-labels" style={{ marginTop: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                <span>1 = Never</span>
                <span>2 = Rarely/monthly</span>
                <span>3 = Occasionally/weekly</span>
                <span>4 = Frequently/daily</span>
                <span>5 = Multiple times daily</span>
              </div>
            </div>
          </div>
          
          {aiQuestionsError && <div className="post-task-error">{aiQuestionsError}</div>}
          {!aiQuestionsSubmitted ? (
            <button onClick={handleSubmitAiQuestions} disabled={submittingAiQuestions}>
              {submittingAiQuestions ? 'Submitting...' : 'Submit AI Attitude Assessment'}
            </button>
          ) : (
            <div className="post-task-success">
              <p style={{ fontSize: '18px', fontWeight: '500', color: '#1f2937', marginBottom: '12px' }}>
                Your AI Attitude Assessment has been submitted successfully!
              </p>
              <p style={{ fontSize: '16px', color: '#344054', lineHeight: '1.6', marginBottom: '8px' }}>
                Thank you so much for your participation in this research. Your insights and reflections are incredibly valuable to us.
              </p>
              <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
                Shortly, you will receive an email with the results and insights from this research study. We appreciate your time and thoughtful contributions.
              </p>
              <button onClick={() => navigate('/')}>Return Home</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostTaskReflection;
