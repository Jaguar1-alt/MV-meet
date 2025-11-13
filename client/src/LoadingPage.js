// client/src/LoadingPage.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoadingPage.css'; // Import the new CSS
import MVMeetLogo from './assets/mv meet.png'; // Import your logo

function LoadingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for 2.5 seconds
    const timer = setTimeout(() => {
      // Navigate to the new home page route
      navigate('/home');
    }, 2500); // 2500 milliseconds = 2.5 seconds

    // Clean up the timer if the component unmounts
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="loading-container">
      <img src={MVMeetLogo} alt="MV Meet Logo" className="loading-logo" />
    </div>
  );
}

export default LoadingPage;