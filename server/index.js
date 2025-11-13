// server/index.js
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL;

if (!clientUrl) {
  console.error('Error: CLIENT_URL is not defined in your .env file');
  process.exit(1);
}

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
  },
});

app.get('/', (req, res) => {
  res.send('MV Meet Server is running!');
});

// --- Main Room Logic ---
const userTracker = new Map();

// --- NEW: Add a map to track room creation times ---
const roomCreationTimes = new Map();
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000; // 24 hours

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Join Room Logic (Updated with Expiration)
  socket.on('join-room', (roomId, userId, userName) => {
    
    // --- NEW Expiration Logic ---
    const now = new Date();
    let createdAt = roomCreationTimes.get(roomId);

    if (!createdAt) {
      // This is the first user in the room. Set the creation time.
      createdAt = now;
      roomCreationTimes.set(roomId, createdAt);
      console.log(`New room created: ${roomId} at ${createdAt.toISOString()}`);
    } else {
      // This is an existing room. Check if it's expired.
      const roomAge = now - createdAt;
      if (roomAge > ONE_DAY_IN_MS) {
        console.log(`Expired room join attempt: ${roomId}`);
        // Delete the expired room
        roomCreationTimes.delete(roomId);
        // Tell the user it's expired and stop them from joining
        socket.emit('room-expired', 'This room was created over 24 hours ago and has expired.');
        return; // Stop the function here
      }
    }
    // --- End of Expiration Logic ---

    // (The rest of the join logic remains the same)
    console.log(`User ${userName} (${userId}) joining room ${roomId}`);
    socket.join(roomId);
    
    userTracker.set(socket.id, { roomId, name: userName });

    const otherUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter((id) => id !== socket.id)
      .map((id) => {
        return { id: id, name: userTracker.get(id)?.name || 'Someone' };
      });

    socket.emit('all-users', otherUsers);

    socket.to(roomId).emit('user-joined', { 
      id: socket.id, 
      name: userName 
    });
  });

  // 2. Chat Logic (We'll use this later)
  socket.on('send-chat-message', (roomId, message, senderName) => {
    io.to(roomId).emit('receive-chat-message', { message, senderName });
  });

  // 3. WebRTC Signaling "Pass-through" (Updated)
  socket.on('offer', (payload) => {
    const senderInfo = userTracker.get(payload.caller);
    payload.callerName = senderInfo ? senderInfo.name : 'Guest'; 
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (payload) => {
    io.to(payload.target).emit('ice-candidate', payload);
  });
  
  // 4. Disconnect Logic (Updated)
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const userInfo = userTracker.get(socket.id);
    
    if (userInfo) {
      const { roomId } = userInfo;
      socket.to(roomId).emit('user-left', socket.id);
    }
    userTracker.delete(socket.id); 
  });
});
// --- End Main Room Logic ---

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
  console.log(`Allowing client connections from: ${clientUrl}`);
});