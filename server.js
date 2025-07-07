const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
// In-memory store for users and messages
let onlineUsers = new Map(); // Using a Map to store socket.id -> {username, isAdmin}

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);
  
  // Send current online user count to the new user
  socket.emit('onlineUsers', onlineUsers.size);

  // Listen for a user joining
  socket.on('userJoin', ({ username, isAdmin }) => {
    // Store user information
    onlineUsers.set(socket.id, { username, isAdmin });
    console.log(`${username} (${isAdmin ? 'Admin' : 'User'}) joined.`);
    
    // Notify all clients that a new user has joined
    io.emit('userJoined', { username, onlineCount: onlineUsers.size });
  });

  // Listen for new messages
  socket.on('message', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      const message = {
        id: Date.now(), // Unique ID for the message
        username: user.username,
        content: data.content,
        type: data.type,
        timestamp: new Date().toISOString()
      };
      // Broadcast the message to all clients
      console.log(`Message from ${message.username}: ${message.content}`);
      io.emit('message', message);
    }
  });

  // Listen for an admin clearing all messages
  socket.on('clearMessages', () => {
    const user = onlineUsers.get(socket.id);
    if (user && user.isAdmin) {
      // Broadcast to all clients that messages have been cleared
      io.emit('messagesCleared');
      console.log(`Admin ${user.username} cleared all messages.`);
    }
  });
  
  // Listen for a user leaving (e.g., logout button)
  socket.on('userLeave', ({ username }) => {
    if (onlineUsers.has(socket.id)) {
      onlineUsers.delete(socket.id);
      // Notify all clients that a user has left
      io.emit('userLeft', { username, onlineCount: onlineUsers.size });
      console.log(`${username} has logged out.`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (onlineUsers.has(socket.id)) {
      const { username } = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);
      // Notify all clients that a user has left
      io.emit('userLeft', { username, onlineCount: onlineUsers.size });
      console.log(`User disconnected: ${socket.id}, Username: ${username}`);
    } else {
      console.log(`An anonymous user disconnected: ${socket.id}`);
    }
  });
});

module.exports = server;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
