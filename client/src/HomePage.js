import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

function HomePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [showUI, setShowUI] = useState(false);
  const [roomCreated, setRoomCreated] = useState(false);

  // 🎬 Show rope + UI after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowUI(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateRoom = () => {
    if (!name) return alert("Enter your name");
    const id = uuidv4();
    setRoomId(id);
    setRoomCreated(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied");
  };

  const handleJoinCreatedRoom = () => {
    navigate(`/room/${roomId}`, { state: { userName: name } });
  };

  const handleJoinWithCode = () => {
    if (!name || !roomId) return alert("Fill all fields");
    navigate(`/room/${roomId}`, { state: { userName: name } });
  };

  // 🔙 NEW: Back button handler
  const handleBack = () => {
    setRoomCreated(false);
    setRoomId(""); // optional but clean UX
  };

  return (
    <div className="page">
      {/* 🎥 Background Video */}
      <video className="bg-video" autoPlay muted loop playsInline>
        <source src="/mv-meet-intro.mp4" type="video/mp4" />
      </video>

      {/* Light overlay */}
      <div className="overlay" />

      {/* 🎬 Rope + UI appear together */}
      {showUI && (
        <>
          {/* 🪢 Single Rope */}
          <div className="rope-layer">
            <div className="rope-single"></div>
          </div>

          {/* 🧊 UI */}
          <div className="ui rope-drop">
            <div className="glass-card">
              {roomCreated ? (
                <>
                  <h1>Meeting Ready</h1>
                  <p>Share this Room ID</p>

                  <input value={roomId} readOnly />

                  <button onClick={handleCopy}>
                    Copy Room ID
                  </button>

                  <button onClick={handleJoinCreatedRoom}>
                    Join Meeting
                  </button>

                  {/* 🔙 BACK BUTTON */}
                  <button
                    className="back-btn"
                    onClick={handleBack}
                  >
                    ← Back
                  </button>
                </>
              ) : (
                <>
                  <p>Create or join a meeting</p>

                  <input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <button onClick={handleCreateRoom}>
                    New Meeting
                  </button>

                  <div className="divider">OR</div>

                  <input
                    placeholder="Meeting ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  />

                  <button onClick={handleJoinWithCode}>
                    Join
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default HomePage;
