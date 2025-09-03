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
    console.log('Initializing Socket.io server...');
    
    global.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    global.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      socket.join('board-updates');
      
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  return global.io;
}

export function broadcastEvent(event: string, data: any) {
  const io = getSocketIO();
  if (io) {
    io.to('board-updates').emit(event, data);
    console.log(`Broadcasting event: ${event}`, data);
  }
}