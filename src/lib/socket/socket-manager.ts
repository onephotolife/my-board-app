import type { Server as HTTPServer } from 'http';

import { Server as SocketIOServer } from 'socket.io';

declare global {
  var io: SocketIOServer | undefined;
}

export function getSocketIO(): SocketIOServer | undefined {
  return global.io;
}

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (!global.io) {
    console.warn('Initializing Socket.io server...');

    global.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    global.io.on('connection', (socket) => {
      console.warn(`Client connected: ${socket.id}`);

      socket.join('board-updates');

      socket.on('disconnect', () => {
        console.warn(`Client disconnected: ${socket.id}`);
      });
    });
  }

  return global.io;
}

export function broadcastEvent(event: string, data: Record<string, unknown>) {
  const io = getSocketIO();
  if (io) {
    console.warn('[SOCKET-MANAGER] Broadcasting event:', {
      event,
      room: 'board-updates',
      dataKeys: Object.keys(data),
      hasNotification: !!data.notification,
      timestamp: new Date().toISOString(),
    });

    io.to('board-updates').emit(event, data);

    console.warn(`[SOCKET-MANAGER] Event broadcast completed: ${event}`);
  } else {
    console.error('[SOCKET-MANAGER] Socket.io not available for broadcasting');
  }
}
