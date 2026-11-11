const { WebSocketServer, WebSocket } = require('ws');
const { eventBus } = require('./services/events');
const { verifyAccessToken } = require('./middleware/auth');

function attachRealtime(server, allowedOrigins) {
  const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    const origin = request.headers.origin;
    if (requestUrl.pathname !== '/ws' || (origin && !allowedOrigins.has(origin))) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      webSocketServer.emit('connection', webSocket, request);
    });
  });

  webSocketServer.on('connection', (webSocket) => {
    let identity = null;
    const authenticationTimeout = setTimeout(() => {
      webSocket.close(4001, 'Authentication required');
    }, 5000);

    const forwardEvent = (event) => {
      if (identity?.role === 'owner' && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(event));
      }
    };
    eventBus.on('event', forwardEvent);

    webSocket.on('message', (message) => {
      if (identity) return;
      try {
        const request = JSON.parse(message.toString());
        if (request.type !== 'authenticate' || typeof request.token !== 'string') {
          webSocket.close(4002, 'Invalid authentication message');
          return;
        }
        identity = verifyAccessToken(request.token);
        clearTimeout(authenticationTimeout);
        webSocket.send(JSON.stringify({ type: 'authenticated', role: identity.role }));
      } catch {
        webSocket.close(4003, 'Authentication failed');
      }
    });

    webSocket.once('close', () => {
      clearTimeout(authenticationTimeout);
      eventBus.off('event', forwardEvent);
    });
    webSocket.once('error', () => {
      clearTimeout(authenticationTimeout);
      eventBus.off('event', forwardEvent);
    });
  });

  return webSocketServer;
}

module.exports = { attachRealtime };
