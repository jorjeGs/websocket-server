const WebSocket = require('ws');
const http = require('http');
const uuid = require('uuid');
const { Doc, decodeUpdate, encodeStateAsUpdate } = require('yjs'); // Use a generic Yjs Doc for flexibility
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// In-memory store for rooms and their Yjs documents
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
    // Initialize the Yjs document with your desired data structure (e.g., plain text, map, array)
    rooms[room] = {clients: new Set(), doc: new Doc()};
    // Optionally: rooms[room].createArray('shared-data'); // Create a shared array
  }

  rooms[room].clients.add(ws); // Assuming clients is a Set for efficient membership checks
  ws.room = room;

  // Send the current document state to the new user
  if (rooms[room].doc.getText()) { // Check if document has content (adjust for your data type)
    console.log('Sending state to new user:', rooms[room].doc.getText());
    ws.send(JSON.stringify({
      type: 'init',
      room,
      message: encodeStateAsUpdate(rooms[room].doc), // Encode the Yjs document state
    }));
  }
};

const handleSignal = (ws, data) => {
  const room = ws.room;
  if (!room) {
    console.log('Client not in any room');
    return;
  }
  console.log('decoding', data.message)
  const update = decodeUpdate(data.message);
  console.log('update', update)
  rooms[room].doc.applyUpdate(update); // Apply the update to the Yjs document

  // Broadcast the update to all clients in the room
  rooms[room].clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      console.log(`Sending signal to client in room: ${room}`);
      client.send(JSON.stringify({
        type: 'update',
        room,
        message: encodeStateAsUpdate(rooms[room].doc) // Encode and send the updated document state
      }));
    }
  });
};

const handleDisconnect = (ws) => {
  const room = ws.room;
  if (room && rooms[room]) {
    rooms[room].clients.delete(ws);
    if (rooms[room].clients.size === 0) {
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