import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import './PreSimulation.css';

const PreSimulation: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Demographics state
  const [professionalExperience, setProfessionalExperience] = useState<string>('');
  const [managementExperience, setManagementExperience] = useState<string>('');
  const [education, setEducation] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [industryOrStudies, setIndustryOrStudies] = useState<string>('');

  // Baseline strategic decision quality state
  const [tradeOffs, setTradeOffs] = useState<string>('');
  const [strategicOptions, setStrategicOptions] = useState<string>('');
  const [recommendation, setRecommendation] = useState<string>('');

  // Cognitive Reflection Test state
  const [crt1, setCrt1] = useState<string>('');
  const [crt2, setCrt2] = useState<string>('');
  const [crt3, setCrt3] = useState<string>('');

  const [currentSection, setCurrentSection] = useState<'demographics' | 'baseline' | 'crt'>('demographics');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateDemographics = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    if (!professionalExperience || professionalExperience.trim() === '') {
      missingFields.push('Professional work experience');
    }
    if (!managementExperience || managementExperience.trim() === '') {
      missingFields.push('Management or leadership experience');
    }
    if (!education || education.trim() === '') {
      missingFields.push('Highest level of education');
    }
    if (!age || age.trim() === '') {
      missingFields.push('Age');
    }
    if (!gender || gender.trim() === '') {
      missingFields.push('Gender');
    }
    if (!industryOrStudies || industryOrStudies.trim() === '') {
      missingFields.push('Current industry or field of studies');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  const validateBaseline = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    if (!tradeOffs || tradeOffs.trim() === '') {
      missingFields.push('Key trade-offs');
    }
    if (!strategicOptions || strategicOptions.trim() === '') {
      missingFields.push('Strategic options');
    }
    if (!recommendation || recommendation.trim() === '') {
      missingFields.push('Recommendation');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  const validateCRT = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    if (!crt1 || crt1.trim() === '') {
      missingFields.push('Cognitive Reflection Test question 1');
    }
    if (!crt2 || crt2.trim() === '') {
      missingFields.push('Cognitive Reflection Test question 2');
    }
    if (!crt3 || crt3.trim() === '') {
      missingFields.push('Cognitive Reflection Test question 3');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  const handleNext = () => {
    if (currentSection === 'demographics') {
      const validation = validateDemographics();
      if (!validation.isValid) {
        const fieldsList = validation.missingFields.join(', ');
        setError(`Please complete all demographic questions. Missing: ${fieldsList}`);
        return;
      }
      setError(null);
      setCurrentSection('baseline');
    } else if (currentSection === 'baseline') {
      const validation = validateBaseline();
      if (!validation.isValid) {
        const fieldsList = validation.missingFields.join(', ');
        setError(`Please answer all three questions about the logistics case. Missing: ${fieldsList}`);
        return;
      }
      setError(null);
      setCurrentSection('crt');
    }
  };

  const handleBack = () => {
    if (currentSection === 'baseline') {
      setCurrentSection('demographics');
      setError(null);
    } else if (currentSection === 'crt') {
      setCurrentSection('baseline');
      setError(null);
    }
  };

  const handleSubmit = async () => {
    const validation = validateCRT();
    if (!validation.isValid) {
      const fieldsList = validation.missingFields.join(', ');
      setError(`Please answer all three Cognitive Reflection Test questions. Missing: ${fieldsList}`);
      return;
    }

    if (!sessionId) {
      setError('Session ID is missing. Please refresh the page.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const preSimulationData = {
        demographics: {
          professionalExperience,
          managementExperience,
          education,
          age: parseInt(age) || null,
          gender,
          industryOrStudies: industryOrStudies.trim()
        },
        baselineStrategicDecision: {
          tradeOffs: tradeOffs.trim(),
          strategicOptions: strategicOptions.trim(),
          recommendation: recommendation.trim()
        },
        cognitiveReflectionTest: {
          question1: crt1.trim(),
          question2: crt2.trim(),
          question3: crt3.trim()
        }
      };

      const response = await api.post(`/simulations/${sessionId}/pre-simulation`, preSimulationData);

      if (response.data.status === 'success' || response.data.ok) {
        // Navigate to intro video
        navigate(`/sim/${sessionId}/intro`);
      } else {
        setError(response.data.error || 'Failed to save pre-simulation data');
      }
    } catch (err: any) {
      console.error('Error submitting pre-simulation data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save pre-simulation data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pre-simulation-page">
      <div className="pre-simulation-container">
        <div className="pre-simulation-header">
          <h1>Pre-Simulation Questionnaire</h1>
          <div className="section-indicator">
            <span className={`indicator-dot ${currentSection === 'demographics' ? 'active' : currentSection === 'baseline' || currentSection === 'crt' ? 'completed' : ''}`}></span>
            <span className={`indicator-dot ${currentSection === 'baseline' ? 'active' : currentSection === 'crt' ? 'completed' : ''}`}></span>
            <span className={`indicator-dot ${currentSection === 'crt' ? 'active' : ''}`}></span>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="pre-simulation-content">
          {/* Demographics Section */}
          {currentSection === 'demographics' && (
            <div className="question-section">
              <h2>Demographics and Experience</h2>
              <p className="section-description">
                Please provide some basic information about your background. This information helps us understand the diversity of our participants and ensures the validity of our research.
              </p>

              <div className="form-group">
                <label htmlFor="professionalExperience">
                  How many years of professional work experience do you have? <span className="required">*</span>
                </label>
                <select
                  id="professionalExperience"
                  value={professionalExperience}
                  onChange={(e) => setProfessionalExperience(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select...</option>
                  <option value="0-2">0-2 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="6-10">6-10 years</option>
                  <option value="11-15">11-15 years</option>
                  <option value="16-20">16-20 years</option>
                  <option value="20+">20+ years</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="managementExperience">
                  How many years of management or leadership experience do you have? <span className="required">*</span>
                </label>
                <select
                  id="managementExperience"
                  value={managementExperience}
                  onChange={(e) => setManagementExperience(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select...</option>
                  <option value="0-2">0-2 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="6-10">6-10 years</option>
                  <option value="11-15">11-15 years</option>
                  <option value="16-20">16-20 years</option>
                  <option value="20+">20+ years</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="education">
                  What is your highest level of education completed? <span className="required">*</span>
                </label>
                <select
                  id="education"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select...</option>
                  <option value="High school">High school</option>
                  <option value="Bachelor's">Bachelor's</option>
                  <option value="Master's">Master's</option>
                  <option value="PhD, MD, JD">PhD, MD, JD</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="age">
                  What is your age? <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="form-input"
                  min="18"
                  max="100"
                  placeholder="Enter your age"
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">
                  What is your gender? <span className="required">*</span>
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="industryOrStudies">
                  What is your current industry or field of studies? <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="industryOrStudies"
                  value={industryOrStudies}
                  onChange={(e) => setIndustryOrStudies(e.target.value)}
                  className="form-input"
                  placeholder="e.g., Technology, Finance, Healthcare, Business Administration, etc."
                />
              </div>
            </div>
          )}

          {/* Baseline Strategic Decision Quality Section */}
          {currentSection === 'baseline' && (
            <div className="question-section">
              <h2>Baseline Strategic Decision Quality</h2>
              <p className="section-description">
                Please read the following scenario and answer the questions below. This exercise helps us establish a baseline measure of strategic decision-making quality.
              </p>

              <div className="case-scenario">
                <h3>Scenario</h3>
                <p>
                  You are the CEO of a mid-sized logistics company facing two simultaneous pressures: fuel costs have risen 22% over the past year, and you are experiencing a 15% shortage of qualified drivers. Your Head of Operations proposes a $4.2M investment in AI-powered route optimization software that would reduce fuel consumption by 12-18%. Your HR Director recommends increasing driver wages by 20% and signing bonuses, which would eliminate the shortage but add $3.8M in annual labor costs.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="tradeOffs">
                  1. What are the key trade-offs in this decision? <span className="required">*</span>
                </label>
                <textarea
                  id="tradeOffs"
                  value={tradeOffs}
                  onChange={(e) => setTradeOffs(e.target.value)}
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe the key trade-offs you see in this decision..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="strategicOptions">
                  2. What two distinct strategic options would you consider? <span className="required">*</span>
                </label>
                <textarea
                  id="strategicOptions"
                  value={strategicOptions}
                  onChange={(e) => setStrategicOptions(e.target.value)}
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe two distinct strategic options..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="recommendation">
                  3. Which option do you recommend and why? <span className="required">*</span>
                </label>
                <textarea
                  id="recommendation"
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  className="form-textarea"
                  rows={5}
                  placeholder="Explain your recommendation and reasoning..."
                />
              </div>
            </div>
          )}

          {/* Cognitive Reflection Test Section */}
          {currentSection === 'crt' && (
            <div className="question-section">
              <h2>Cognitive Reflection Test</h2>
              <p className="section-description">
                Please answer the following three questions. Take your time to think through each problem carefully.
              </p>

              <div className="form-group">
                <label htmlFor="crt1">
                  1. A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? <span className="required">*</span>
                </label>
                <div className="crt-input-wrapper">
                  <input
                    type="text"
                    id="crt1"
                    value={crt1}
                    onChange={(e) => setCrt1(e.target.value)}
                    className="form-input crt-input"
                    placeholder="Enter your answer"
                  />
                  <span className="crt-unit">cents</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="crt2">
                  2. If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets? <span className="required">*</span>
                </label>
                <div className="crt-input-wrapper">
                  <input
                    type="text"
                    id="crt2"
                    value={crt2}
                    onChange={(e) => setCrt2(e.target.value)}
                    className="form-input crt-input"
                    placeholder="Enter your answer"
                  />
                  <span className="crt-unit">minutes</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="crt3">
                  3. In a lake, there is a patch of lily pads. Every day, the patch doubles in size. If it takes 48 days for the patch to cover the entire lake, how long would it take for the patch to cover half the lake? <span className="required">*</span>
                </label>
                <div className="crt-input-wrapper">
                  <input
                    type="text"
                    id="crt3"
                    value={crt3}
                    onChange={(e) => setCrt3(e.target.value)}
                    className="form-input crt-input"
                    placeholder="Enter your answer"
                  />
                  <span className="crt-unit">days</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pre-simulation-actions">
          {currentSection !== 'demographics' && (
            <button
              className="back-button"
              onClick={handleBack}
              disabled={submitting}
            >
              Back
            </button>
          )}
          {currentSection !== 'crt' ? (
            <button
              className="next-button"
              onClick={handleNext}
              disabled={submitting}
            >
              Next
            </button>
          ) : (
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit and Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreSimulation;
