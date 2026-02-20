import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ImmersiveIntro.css';

import introVideo from '../../assets/images/Text to video 丨 Cinematic video, ultra-realistic, slow and deliberate pacing. Sc.mp4';

const ImmersiveIntro: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImmersiveIntro.tsx:12',message:'ImmersiveIntro render',data:{sessionId:sessionId || null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, [sessionId]);
  // #endregion

  const handleVideoEnd = () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImmersiveIntro.tsx:19',message:'Intro video ended, navigating directly to Act 1 documents',data:{sessionId:sessionId || null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('[ImmersiveIntro] Video ended, navigating directly to Act 1 documents sequence');
    if (sessionId) {
      navigate(`/sim/${sessionId}/act/1/documents`);
    } else {
      navigate('/');
    }
  };

  // Show video - after it ends, navigate directly to documents
  return (
    <div className="immersive-intro">
      <section className="intro-video-section intro-video-fullscreen">
        <video
          className="intro-video"
          src={introVideo}
          autoPlay
          playsInline
          onLoadedMetadata={(event) => {
            const target = event.currentTarget;
            target.playbackRate = 0.6;
          }}
          onEnded={handleVideoEnd}
        />
      </section>
    </div>
  );
};

export default ImmersiveIntro;
