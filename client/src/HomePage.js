// client/src/HomePage.js
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import './HomePage.css'; // Import the CSS
import MVMeetLogo from './assets/mv meet.png';

// --- NEW: Import Icons ---
import { 
  FaUser, 
  FaKeyboard, 
  FaVideo, 
  FaSignInAlt 
} from 'react-icons/fa';
// --- End New ---

function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [showLobby, setShowLobby] = useState(false);

  // --- (All handle... functions are unchanged) ---
  const handleCreateRoom = () => {
    if (!name) return alert('Please enter your name');
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    setShowLobby(true);
  };

  const handleJoinWithCode = () => {
    if (!name) return alert('Please enter your name');
    if (!roomId) return alert('Please enter a room code');
    navigate(`/room/${roomId}`, { state: { userName: name } });
  };

  const handleJoinFromLobby = () => {
    navigate(`/room/${roomId}`, { state: { userName: name } });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      alert('Room Code copied to clipboard!');
    }, () => {
      alert('Failed to copy. Please copy it manually.');
    });
  };

  // --- HeadTags Helper (Unchanged) ---
  const HeadTags = () => (
    <>
      <title>MV Meet - Simple & Free Video Calling</title>
      <meta name="description" content="Create free video call rooms and share the link to meet with friends or colleagues. No sign-up required." />
      <meta property="og:title" content="MV Meet - Simple & Free Video Calling" />
      <meta property="og:description" content="Create free video call rooms and share the link to meet with friends or colleagues." />
      <meta property="og:image" content="%PUBLIC_URL%/mv meet.png" />
      <meta property="og:url" content="http://localhost:3000" />
      <meta property="og:type" content="website" />
    </>
  );

  // --- Render Logic (Updated with Icons) ---

  if (showLobby) {
    // --- LOBBY VIEW ---
    return (
      <div className="home-container">
        <HeadTags />
        <img src={MVMeetLogo} alt="MV Meet Logo" className="app-logo" /> 
        
        <div className="home-content-wrapper">
          <h1>Your Room is Ready!</h1>
          <p>Share this code with others to join:</p>
          
          <div className="lobby-container">
            <input 
              type="text"
              value={roomId}
              readOnly
              className="lobby-input"
            />
            <button onClick={copyRoomId} className="lobby-copy-button">Copy</button>
          </div>

          <button onClick={handleJoinFromLobby} className="home-button primary">
            <FaSignInAlt /> {/* Icon */}
            Join Meet Now
          </button>
          <button 
            onClick={() => setShowLobby(false)} 
            className="lobby-back-button"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="home-container">
      <HeadTags />
      <img src={MVMeetLogo} alt="MV Meet Logo" className="app-logo" /> 

      <div className="home-content-wrapper">
        <h1>Welcome to MV Meet</h1>
        <p>Simple, free video calls.</p>
        
        {/* Updated Input with Icon */}
        <div className="input-wrapper">
          <FaUser className="input-icon" />
          <input 
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="home-input"
          />
        </div>

        {/* Updated Button with Icon */}
        <button onClick={handleCreateRoom} className="home-button primary">
          <FaVideo /> {/* Icon */}
          Create New Room
        </button>

        <p className="or-divider">— or join an existing room —</p>

        {/* Updated Input with Icon */}
        <div className="input-wrapper">
          <FaKeyboard className="input-icon" />
          <input 
            type="text"
            placeholder="Enter room code"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="home-input"
          />
        </div>
        
        {/* Updated Button with Icon */}
        <button onClick={handleJoinWithCode} className="home-button secondary">
          <FaSignInAlt /> {/* Icon */}
          Join Room
        </button>
      </div>
    </div>
  );
}

export default HomePage;