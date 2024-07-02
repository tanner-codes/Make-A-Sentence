const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store for chat rooms and user profiles
const chatRooms = {};
const userProfiles = {};

// Socket.IO event handlers
io.on('connection', (socket) => {
  // Handle new user connection
  socket.on('new-user', (username, profilePic) => {
    userProfiles[socket.id] = { username, profilePic };
    io.emit('user-connected', socket.id, username, profilePic);
  });

  // Handle chat room creation
  socket.on('create-room', (roomName) => {
    chatRooms[roomName] = [];
    socket.join(roomName);
    io.emit('room-created', roomName);
  });

  // Handle joining a chat room
  socket.on('join-room', (roomName) => {
    socket.join(roomName);
    io.to(roomName).emit('user-joined', socket.id, userProfiles[socket.id]);
  });

  // Handle new message
  socket.on('new-message', (roomName, message, imageData) => {
    const sender = userProfiles[socket.id];
    const messageData = { sender, message, imageData };
    chatRooms[roomName].push(messageData);
    io.to(roomName).emit('message-received', messageData);
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const user = userProfiles[socket.id];
    if (user) {
      io.emit('user-disconnected', socket.id, user.username);
      delete userProfiles[socket.id];
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
