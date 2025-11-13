// client/src/RoomPage.js
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './RoomPage.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL;
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

// --- Participants Sidebar Component (Unchanged) ---
const ParticipantsSidebar = ({ isOpen, localUser, remoteUsers }) => {
  const totalParticipants = 1 + remoteUsers.length;

  return (
    <div className={`participants-sidebar ${!isOpen ? 'closed' : ''}`}>
      <div className="participants-header">
        Participants ({totalParticipants})
      </div>
      <div className="participants-list">
        {/* Local User */}
        <div className="participant-item">
          <div className="participant-avatar">
            {localUser.name.charAt(0).toUpperCase()}
          </div>
          <span className="participant-name-text">{localUser.name} (You)</span>
        </div>
        
        {/* Remote Users */}
        {remoteUsers.map(user => (
          <div key={user.id} className="participant-item">
            <div className="participant-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="participant-name-text">{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Room Page Component ---
function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [userName] = useState(location.state?.userName || 'Guest');
  
  // const [socket, setSocket] = useState(null); // <-- FIX 1: This line is removed
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  
  const screenStreamRef = useRef(null);
  const localVideoRef = useRef();
  const peerConnectionsRef = useRef(new Map());

  // 1. Get user's media (Unchanged)
  useEffect(() => {
    async function getMedia() {
      const hqConstraints = {
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      };
      const standardConstraints = { video: { facingMode: 'user' }, audio: true };
      const fallbackConstraints = { video: true, audio: true };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(hqConstraints);
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Failed to get HQ (720p) media, trying standard.", error);
        try {
          const stream = await navigator.mediaDevices.getUserMedia(standardConstraints);
          setLocalStream(stream);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        } catch (fallbackError) {
          console.error("Standard media failed, trying absolute fallback.", fallbackError);
          try {
            const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            setLocalStream(stream);
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          } catch (finalError) {
            console.error("All media attempts failed.", finalError);
            alert("Cannot access camera/mic. Please check permissions.");
          }
        }
      }
    }
    getMedia();
  }, []);

  // 2. Set up Socket.io and WebRTC (Unchanged)
  useEffect(() => {
    if (!localStream || !SERVER_URL) return;

    const newSocket = io(SERVER_URL);
    // setSocket(newSocket); // <-- FIX 1: This line is removed

    const createPeerConnection = (targetSocketId, targetName) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
      pc.ontrack = (event) => {
        setRemoteStreams(prev => [
          ...prev.filter(s => s.id !== targetSocketId),
          { id: targetSocketId, stream: event.streams[0], name: targetName }
        ]);
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          newSocket.emit('ice-candidate', {
            target: targetSocketId,
            candidate: event.candidate,
            sender: newSocket.id
          });
        }
      };
      peerConnectionsRef.current.set(targetSocketId, pc);
      return pc;
    };
    newSocket.on('connect', () => {
      newSocket.emit('join-room', roomId, newSocket.id, userName);
    });
    newSocket.on('all-users', (otherUsers) => {
      otherUsers.forEach(async (user) => {
        const pc = createPeerConnection(user.id, user.name);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        newSocket.emit('offer', {
          target: user.id,
          sdp: offer,
          caller: newSocket.id
        });
      });
    });
    newSocket.on('user-joined', (user) => { /* Waiting for offer */ });
    newSocket.on('offer', async (payload) => {
      const pc = createPeerConnection(payload.caller, payload.callerName);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      newSocket.emit('answer', {
        target: payload.caller,
        sdp: answer,
        answerer: newSocket.id
      });
    });
    newSocket.on('answer', async (payload) => {
      const pc = peerConnectionsRef.current.get(payload.answerer);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });
    newSocket.on('ice-candidate', async (payload) => {
      const pc = peerConnectionsRef.current.get(payload.sender);
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
        catch (error) { console.error("Error adding ICE candidate", error); }
      }
    });
    newSocket.on('user-left', (userId) => {
      peerConnectionsRef.current.get(userId)?.close();
      peerConnectionsRef.current.delete(userId);
      setRemoteStreams(prev => prev.filter(s => s.id !== userId));
    });

    // --- FIX 2: exhaustive-deps fix ---
    // Store the ref value in a variable inside the effect
    const connections = peerConnectionsRef.current;
    
    // Clean up
    return () => {
      console.log('Disconnecting...');
      localStream?.getTracks().forEach(track => track.stop());
      // Use the variable in the cleanup function
      connections.forEach(pc => pc.close());
      newSocket.disconnect();
    };
  }, [roomId, localStream, userName]);

  // --- Control Functions (Unchanged) ---
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsMicOn(!isMicOn);
    }
  };
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsVideoOn(!isVideoOn);
    }
  };
  const handleLeaveRoom = () => { navigate('/home'); }; // Corrected leave path
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShowCopyNotification(true);
      setTimeout(() => {
        setShowCopyNotification(false);
      }, 2000);
    }, (err) => {
      console.error('Failed to copy link: ', err);
      alert('Failed to copy link.');
    });
  };

  // --- Screen Share Logic (Unchanged) ---
  const stopScreenShare = () => {
    const cameraTrack = localStream.getVideoTracks()[0];
    peerConnectionsRef.current.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) { sender.replaceTrack(cameraTrack); }
    });
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    localVideoRef.current.srcObject = localStream;
    setIsScreenSharing(false);
    screenStreamRef.current = null;
  };
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      const screenTrack = stream.getVideoTracks()[0];
      peerConnectionsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) { sender.replaceTrack(screenTrack); }
      });
      localVideoRef.current.srcObject = stream;
      setIsScreenSharing(true);
      screenTrack.onended = () => { stopScreenShare(); };
    } catch (err) {
      console.error("Error starting screen share", err);
    }
  };
  const handleToggleScreenShare = () => {
    if (isScreenSharing) { stopScreenShare(); } else { startScreenShare(); }
  };

  // --- Toggle Participants (Unchanged) ---
  const toggleParticipants = () => {
    setIsParticipantsOpen(prev => !prev);
  };

  // --- Remote Video Component (Unchanged) ---
  const RemoteVideo = ({ stream }) => {
    const videoRef = useRef();
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);
    return (<video ref={videoRef} autoPlay playsInline className="participant-video" />);
  };

  // --- Main Render (Unchanged) ---
  return (
    <div className="main-room-layout">
      {/* --- Video Area --- */}
      <div className="video-container">
        
        <div className={`copy-notification ${showCopyNotification ? 'show' : ''}`}>
          Link Copied!
        </div>

        <div className="video-grid">
          
          {/* Local Video */}
          <div className="participant-wrapper">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="participant-video"
              style={{ 
                transform: isScreenSharing ? 'none' : 'scaleX(-1)',
                visibility: isVideoOn ? 'visible' : 'hidden' 
              }}
            />
            {!isVideoOn && (
              <div className="avatar-placeholder">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="participant-name">
              {isScreenSharing ? "You are sharing your screen" : `${userName} (You)`}
            </div>
          </div>
          
          {/* Remote Videos */}
          {remoteStreams.map(({ id, stream, name }) => (
            <div key={id} className="participant-wrapper">
              <RemoteVideo stream={stream} />
              {/* We can add remote avatars here later */}
              <div className="participant-name">{name}</div>
            </div>
          ))}
          
        </div>

        {/* --- Controls Bar (Unchanged) --- */}
        <div className="controls-bar">
          <button className={`control-button ${!isMicOn ? 'off' : ''}`} onClick={toggleMic}>
            {isMicOn ? '🎤' : '🔇'}
          </button>
          <button className={`control-button ${!isVideoOn ? 'off' : ''}`} onClick={toggleVideo} disabled={isScreenSharing}>
            {isVideoOn ? '📹' : '⏹️'}
          </button>
          
          <button 
            className={`control-button screenshare ${isScreenSharing ? 'on' : ''}`} 
            onClick={handleToggleScreenShare}
          >
            🖥️
          </button>

          <button className="control-button share" onClick={handleCopyLink}>
            🔗
          </button>

          <button className="control-button share" onClick={toggleParticipants}>
            👥
          </button>
          
          <button className="control-button leave" onClick={handleLeaveRoom}>
            📞
          </button>
        </div>
      </div>
      
      {/* --- Participants Sidebar --- */}
      <ParticipantsSidebar
        isOpen={isParticipantsOpen}
        localUser={{ name: userName }}
        remoteUsers={remoteStreams} 
      />
    </div>
  );
}

export default RoomPage;