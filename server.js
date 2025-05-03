const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// App state
const users = {};
let sharedCode = '';

// Socket.io events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Assign a random color to the user
  const userColor = generateRandomColor();
  users[socket.id] = { color: userColor };

  // Send initial setup
  socket.emit('init', { color: userColor, code: sharedCode });

  // Listen for code changes
  socket.on('code-change', ({ code, cursorPos }) => {
    sharedCode = code;
    socket.broadcast.emit('code-update', {
      code,
      cursorPos,
      userId: socket.id,
      userColor
    });
  });

  // Listen for cursor movements
  socket.on('cursor-position', (cursorPos) => {
    socket.broadcast.emit('user-cursor', {
      cursorPos,
      userId: socket.id,
      userColor: users[socket.id]?.color
    });
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete users[socket.id];
    io.emit('user-left', socket.id);
  });
});

// Random color generator
function generateRandomColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).send('Internal Server Error');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
