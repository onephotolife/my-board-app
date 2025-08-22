import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getToken } from 'next-auth/jwt';
import { parse } from 'url';
import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';

let io: SocketIOServer | null = null;

export interface SocketUser {
  id: string;
  email: string;
  name: string;
  socketId: string;
}

const connectedUsers = new Map<string, SocketUser>();

export function initSocketServer(httpServer: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    path: '/api/socket',
    addTrailingSlash: false,
  });

  io.use(async (socket, next) => {
    try {
      const req = socket.request as any;
      const { pathname } = parse(req.url || '', true);
      
      req.nextUrl = { pathname };
      req.headers = socket.handshake.headers;
      req.cookies = socket.handshake.headers.cookie;

      const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      });

      if (!token || !token.emailVerified) {
        return next(new Error('Unauthorized'));
      }

      const user: SocketUser = {
        id: (token.id as string) || (token.sub as string),
        email: token.email as string,
        name: token.name as string,
        socketId: socket.id,
      };

      socket.data.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`🔌 User connected: ${user.email} (${socket.id})`);
    
    connectedUsers.set(socket.id, user);
    
    socket.join('board-updates');
    
    socket.emit('connected', {
      userId: user.id,
      socketId: socket.id,
    });

    socket.on('post:create', async (data) => {
      try {
        await connectDB();
        const post = await Post.findById(data.postId);
        
        if (post) {
          socket.to('board-updates').emit('post:new', {
            post: post.toJSON(),
            author: user,
          });
        }
      } catch (error) {
        console.error('Error broadcasting new post:', error);
      }
    });

    socket.on('post:update', async (data) => {
      try {
        await connectDB();
        const post = await Post.findById(data.postId);
        
        if (post && post.author._id === user.id) {
          socket.to('board-updates').emit('post:updated', {
            post: post.toJSON(),
            author: user,
          });
        }
      } catch (error) {
        console.error('Error broadcasting post update:', error);
      }
    });

    socket.on('post:delete', async (data) => {
      try {
        socket.to('board-updates').emit('post:deleted', {
          postId: data.postId,
          author: user,
        });
      } catch (error) {
        console.error('Error broadcasting post deletion:', error);
      }
    });

    socket.on('post:like', async (data) => {
      try {
        await connectDB();
        const post = await Post.findById(data.postId);
        
        if (post) {
          io?.to('board-updates').emit('post:liked', {
            postId: data.postId,
            likeCount: post.likes.length,
            userId: user.id,
            action: data.action,
          });
        }
      } catch (error) {
        console.error('Error broadcasting like update:', error);
      }
    });

    socket.on('typing:start', (data) => {
      socket.to('board-updates').emit('user:typing', {
        userId: user.id,
        userName: user.name,
        postId: data.postId,
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to('board-updates').emit('user:stopped-typing', {
        userId: user.id,
        postId: data.postId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${user.email} (${socket.id})`);
      connectedUsers.delete(socket.id);
      
      io?.to('board-updates').emit('user:offline', {
        userId: user.id,
      });
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function getConnectedUsers(): SocketUser[] {
  return Array.from(connectedUsers.values());
}

export function broadcastToAll(event: string, data: any) {
  if (io) {
    io.to('board-updates').emit(event, data);
  }
}

export function broadcastToUser(userId: string, event: string, data: any) {
  if (io) {
    const userSocket = Array.from(connectedUsers.values()).find(u => u.id === userId);
    if (userSocket) {
      io.to(userSocket.socketId).emit(event, data);
    }
  }
}