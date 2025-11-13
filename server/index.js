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

// This will store user info { roomId, name }
const userTracker = new Map(); 

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Join Room Logic (Updated with Name)
  socket.on('join-room', (roomId, userId, userName) => {
    console.log(`User ${userName} (${userId}) joining room ${roomId}`);
    socket.join(roomId);
    
    // Store this user's info
    userTracker.set(socket.id, { roomId, name: userName });

    // Get all other users in the room
    const otherUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter((id) => id !== socket.id)
      .map((id) => {
        // Get the name for each user
        return { id: id, name: userTracker.get(id)?.name || 'Someone' };
      });

    // Tell *this* socket about all *other* users (with their names)
    socket.emit('all-users', otherUsers);

    // Notify *other* users that a new peer has joined (with their name)
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
  
  // --- THIS IS THE UPDATED BLOCK ---
  socket.on('offer', (payload) => {
    // Find the sender's name from our tracker
    const senderInfo = userTracker.get(payload.caller); // 'caller' is the socket.id
    // Add the name to the payload
    payload.callerName = senderInfo ? senderInfo.name : 'Guest'; 
    
    // Send the *full* payload to the target
    io.to(payload.target).emit('offer', payload);
  });
  // --- END OF UPDATED BLOCK ---

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
      // Tell everyone else in that room this user left
      socket.to(roomId).emit('user-left', socket.id);
    }
    // Clean up tracker
    userTracker.delete(socket.id); 
  });
});
// --- End Main Room Logic ---

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
  console.log(`Allowing client connections from: ${clientUrl}`);
});