const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'join') {
        const roomId = msg.roomId;
        if (!rooms.has(roomId)) {
          rooms.set(roomId, []);
        }
        const room = rooms.get(roomId);
        room.push(ws);
        ws.roomId = roomId;
        console.log(`Client joined room: ${roomId}, peers: ${room.length}`);

        // Notify others in room
        room.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-joined' }));
          }
        });
      }
      else if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
        // Relay to other peer in room
        const room = rooms.get(ws.roomId);
        if (room) {
          room.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(msg));
            }
          });
        }
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      const room = rooms.get(ws.roomId);
      const idx = room.indexOf(ws);
      if (idx > -1) room.splice(idx, 1);
      console.log(`Client left room: ${ws.roomId}, remaining: ${room.length}`);
    }
  });
});

server.listen(8001, () => {
  console.log('Signaling server on ws://localhost:8001');
});
