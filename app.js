const WebSocket = require('ws');
const http = require('http');
const uuid = require('uuid');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// In-memory store for rooms and their clients
const rooms = {};

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'join':
        handleJoinRoom(ws, data.room);
        break;
      case 'signal':
        handleSignal(ws, data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    handleDisconnect(ws);
  });
});

const handleJoinRoom = (ws, room) => {
  if (!rooms[room]) {
    rooms[room] = new Set();
  }
  rooms[room].add(ws);
  ws.room = room;
  //console.log(`Client joined room: ${room}`);
  //console.log(`Room has ${rooms[room].size} clients`);

  // Send the current document state to the new user
  if (rooms[room].state) {
    console.log('Sending state to new user', rooms[room].state);
    ws.send(JSON.stringify({ type: 'init', room, message: rooms[room].state }));
  }
};

const handleSignal = (ws, data) => {
  const room = ws.room;
  if (!room) {
    console.log('Client not in any room');
    return;
  }

  // Update the room state
  rooms[room].state = data.message;
  //console.log('Room state updated', rooms[room].state);
  
  rooms[room].forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      console.log(`Sending signal to client in room: ${room}`);
      console.log(JSON.stringify(data));
      client.send(JSON.stringify(data));
    }
  });
};

const handleDisconnect = (ws) => {
  const room = ws.room;
  if (room && rooms[room]) {
    rooms[room].delete(ws);
    if (rooms[room].size === 0) {
      delete rooms[room];
    }
    console.log(`Client disconnected from room: ${room}`);
  }
};

// Start the server
const PORT = process.env.PORT || 1234;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
