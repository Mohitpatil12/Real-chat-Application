const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

const server = http.createServer();
const PORT = process.env.PORT || 3001;

const wss = new WebSocket.Server({ server });
const clients = new Map();

function broadcast(data, senderId) {
  clients.forEach((client, id) => {
    if (id !== senderId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  const clientId = crypto.randomUUID().slice(0, 8); // Shortened ID
  const username = `User${Math.floor(Math.random() * 1000)}`;
  
  clients.set(clientId, { ws, username });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    data: {
      clientId,
      username,
      message: 'Connected to chat',
      timestamp: Date.now(),
      onlineCount: clients.size
    }
  }));

  // Notify others
  broadcast({
    type: 'userJoined',
    data: { clientId, username, timestamp: Date.now() }
  }, clientId);

  // Message handler
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      
      if (msg.type === 'chat') {
        broadcast({
          type: 'chat',
          data: {
            from: clientId,
            username,
            text: msg.text,
            timestamp: Date.now()
          }
        }, clientId);
      }
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  // Cleanup on disconnect
  ws.on('close', () => {
    clients.delete(clientId);
    broadcast({
      type: 'userLeft',
      data: { clientId, username, timestamp: Date.now() }
    }, clientId);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on ws://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  wss.clients.forEach(client => client.close());
  wss.close();
  server.close();
});