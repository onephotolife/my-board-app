/* eslint-disable @typescript-eslint/no-require-imports */

const { createServer } = require('http');
const { parse } = require('url');

const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Note: Socket.io uses its own upgrade route; no special handling here

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io server here to ensure availability across the app
  try {
    const { Server: SocketIOServer } = require('socket.io');
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    // Expose globally so app code can broadcast via global.io
    global.io = io;

    io.on('connection', (socket) => {
      try {
        console.warn(`Client connected: ${socket.id}`);
        // Default room used by broadcastEvent
        socket.join('board-updates');

        socket.on('disconnect', () => {
          console.warn(`Client disconnected: ${socket.id}`);
        });
      } catch (e) {
        console.error('Socket connection handler error:', e);
      }
    });
  } catch (e) {
    console.error('Failed to initialize Socket.io:', e);
  }

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.warn(`> Ready on http://${hostname}:${port}`);
      console.warn('> Socket.io support enabled');
    });
});
