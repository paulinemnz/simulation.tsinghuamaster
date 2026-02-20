import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Act1DocumentsSequence.css';

// Document sequence steps - single source of truth
// Step order: 1. Company Overview, 2. Procurement Crisis, 3. Executive Meeting, 4. Union Letter
// Asset mapping:
// - Step 1: Company Overview document (paper on desk with "Terraform Industries – Company Overview")
// - Step 2: Procurement Crisis memo/presentation slide
// - Step 3: Executive Meeting photo (board members: Emma Thalman, Dr. Milo Gergiev, David Werner, Laura Moreau)
// - Step 4: Union Letter / HR document
const steps = [
  {
    key: 'company-overview',
    title: 'Company Overview',
    subtitle: 'Terraform Industries – Company Overview',
    src: '/act1/company-overview.png' // Paper document on desk
  },
  {
    key: 'procurement-crisis',
    title: 'Procurement Crisis',
    subtitle: 'Internal Memo - Supply Chain Optimization System Proposal',
    src: '/act1/procurement-crisis.png' // Procurement crisis memo/slide
  },
  {
    key: 'executive-meeting',
    title: 'Executive Meeting',
    subtitle: 'Stakeholder Discussion',
    src: '/act1/executive-meeting.png' // Board meeting photo (Emma, Milo, David, Laura)
  },
  {
    key: 'union-letter',
    title: 'Union Letter',
    subtitle: 'Employee Protection Concerns',
    src: '/act1/union-letter.png' // Union letter / HR document (uses HR.png asset)
  }
];

const Act1DocumentsSequence: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);

  const currentDocument = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Defensive logging: Log src + step key whenever step is rendered
  React.useEffect(() => {
    console.log('[Act1DocumentsSequence] Step rendered:', {
      step: currentStep + 1,
      key: currentDocument.key,
      title: currentDocument.title,
      src: currentDocument.src
    });
  }, [currentStep, currentDocument]);

  const handleNext = () => {
    if (isLastStep) {
      // Navigate to Act 1 dashboard after final step
      if (sessionId) {
        navigate(`/sim/${sessionId}/act/1`);
      } else {
        navigate('/');
      }
    } else {
      setCurrentStep(currentStep + 1);
      setImageError(null); // Reset error when moving to next step
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
      setImageError(null); // Reset error when moving back
    }
  };

  const handleImageError = (src: string, key: string) => {
    console.error('[Act1DocumentsSequence] ❌ Image failed to load:', {
      src,
      key,
      step: currentStep + 1,
      title: currentDocument.title
    });
    setImageError(src);
  };

  return (
    <div className="act1-documents-sequence">
      <div className="documents-viewer">
        <div 
          key={currentDocument.src} 
          className="document-container full-screen"
        >
          <div className="document-image-wrapper">
            {imageError === currentDocument.src ? (
              <div className="document-error-panel">
                <div className="error-icon">⚠️</div>
                <h3>Missing Asset</h3>
                <p className="error-message">
                  Missing asset: <code>{currentDocument.src}</code> for step <code>{currentDocument.key}</code>
                </p>
                <p className="error-hint">
                  Please ensure the image file exists in <code>/public/act1/</code>
                </p>
                <button 
                  className="error-retry-button"
                  onClick={() => {
                    setImageError(null);
                    // Force image reload by changing key
                    const img = document.querySelector('.document-image') as HTMLImageElement;
                    if (img) {
                      img.src = '';
                      setTimeout(() => {
                        img.src = currentDocument.src;
                      }, 100);
                    }
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <img
                key={currentDocument.src}
                src={currentDocument.src}
                alt={currentDocument.title}
                className="document-image"
                onLoad={() => {
                  console.log('[Act1DocumentsSequence] ✅ Image loaded successfully:', {
                    src: currentDocument.src,
                    key: currentDocument.key,
                    step: currentStep + 1,
                    title: currentDocument.title
                  });
                  setImageError(null);
                }}
                onError={() => handleImageError(currentDocument.src, currentDocument.key)}
              />
            )}
          </div>
        </div>

        {/* Floating navigation buttons for all slides */}
        <>
          <div className="floating-nav-top-left">
            <div className="floating-step-indicator">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <div className="floating-nav-top-right">
            <button
              className="floating-nav-button floating-nav-back"
              onClick={handleBack}
              disabled={isFirstStep}
              title="Back"
            >
              ← Back
            </button>
            <button
              className="floating-nav-button floating-nav-next"
              onClick={handleNext}
              title={isLastStep ? 'Continue to Dashboard' : 'Next'}
            >
              {isLastStep ? 'Continue →' : 'Next →'}
            </button>
          </div>
        </>
      </div>
    </div>
  );
};

export default Act1DocumentsSequence;
