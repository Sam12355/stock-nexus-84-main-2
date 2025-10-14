// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private currentToken: string | null = null;
  private currentBranchId: string | null = null;

  connect(token: string, branchId: string) {
    // Always disconnect and reconnect to ensure fresh connection
    this.disconnect();

    console.log('🔌 Connecting to Socket.IO server...');
    console.log('🔌 Token:', token ? 'Present' : 'Missing');
    console.log('🔌 Branch ID:', branchId);
    
    this.currentToken = token;
    this.currentBranchId = branchId;
    
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://ims-sy.vercel.app';
    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      query: {
        branchId: branchId
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server:', this.socket?.id);
      this.isConnected = true;
      
      // Join the user's branch room
      if (branchId) {
        this.socket?.emit('join-branch', branchId);
        console.log(`👥 Joined branch room: branch-${branchId}`);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to Socket.IO server after', attemptNumber, 'attempts');
      this.isConnected = true;
      
      // Rejoin the branch room after reconnection
      if (branchId) {
        this.socket?.emit('join-branch', branchId);
        console.log(`👥 Rejoined branch room: branch-${branchId}`);
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentToken = null;
      this.currentBranchId = null;
    }
  }

  onNotificationUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('notification-update', (data) => {
        console.log('📢 Received notification update:', data);
        callback(data);
      });
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  forceReconnect() {
    console.log('🔄 Forcing Socket.IO reconnection...');
    if (this.currentToken && this.currentBranchId) {
      this.connect(this.currentToken, this.currentBranchId);
    }
  }
}

export const socketService = new SocketService();
