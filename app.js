const WebSocket = require('ws');
const http = require('http');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const PORT = 5000;

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
    //si el room no existe, lo creamos
    rooms[room] = {clients: new Set()};
  }

  //se añade el cliente al room
  rooms[room].clients.add(ws);

  //se asigna el room al cliente (websocket)
  ws.room = room;

  //se envia mensaje de confirmacion al cliente
  ws.send(JSON.stringify({
    type: 'joined',
    room,
    message: 'Joined room'
  }));
};

const handleSignal = (ws, data) => {
  const room = ws.room;
  //dummy validation
  if (!room) {
    console.log('Client not in any room');
    return;
  }

  // Broadcast the update to all clients in the room
  rooms[room].clients.forEach(client => {
    //si no es el mismo cliente que envio el mensaje y el cliente esta conectado
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      console.log(`Sending signal to client in room: ${room}`);
      client.send(JSON.stringify({
        type: 'update',
        room,
        message: data.message
      }));
    }
  });
};

const handleDisconnect = (ws) => {
  const room = ws.room;
  //si el cliente esta en un room y el room existe
  if (room && rooms[room]) {
    rooms[room].clients.delete(ws);
    //si el room no tiene clientes, lo eliminamos
    if (rooms[room].clients.size === 0) {
      delete rooms[room];
    }
    console.log(`Client disconnected from room: ${room}`);
  }
};

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});