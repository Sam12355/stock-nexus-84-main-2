// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

// Online member type for type safety
export interface OnlineMember {
  id: string;
  name: string;
  photoUrl: string | null;
  role?: string;
  branchId?: string;
  lastActiveAt?: string;
}

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
    
    // Use Render backend URL - must match where Android connects
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://stock-nexus-84-main-2-1.onrender.com';
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
    console.log('🔌 [SOCKET SERVICE] disconnect() called at:', new Date().toISOString());
    console.log('🔌 [SOCKET SERVICE] Socket exists:', !!this.socket);
    console.log('🔌 [SOCKET SERVICE] Socket connected:', this.socket?.connected);
    
    if (this.socket) {
      console.log('🔌 [SOCKET SERVICE] Calling socket.disconnect()...');
      this.socket.disconnect();
      console.log('🔌 [SOCKET SERVICE] socket.disconnect() completed');
      this.socket = null;
      this.isConnected = false;
      this.currentToken = null;
      this.currentBranchId = null;
    } else {
      console.log('🔌 [SOCKET SERVICE] No socket to disconnect');
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

  // Listen for online members list updates
  onOnlineMembers(callback: (members: OnlineMember[]) => void) {
    if (this.socket) {
      this.socket.on('online-members', (members: OnlineMember[]) => {
        console.log('👥 Received online members:', members.length, 'users');
        callback(members);
      });
    }
  }

  // Listen for individual user coming online
  onUserOnline(callback: (user: OnlineMember) => void) {
    if (this.socket) {
      this.socket.on('user-online', (user: OnlineMember) => {
        console.log('👤 User came online:', user.name);
        callback(user);
      });
    }
  }

  // Listen for individual user going offline
  onUserOffline(callback: (userId: string) => void) {
    if (this.socket) {
      this.socket.on('user-offline', (userId: string) => {
        console.log('👤 User went offline:', userId);
        callback(userId);
      });
    }
  }

  // Request current online members list
  getOnlineMembers(callback?: (response: { success: boolean; members?: OnlineMember[]; error?: string }) => void) {
    if (this.socket) {
      this.socket.emit('get-online-members', callback);
    }
  }

  // Remove all presence listeners (for cleanup)
  offPresenceListeners() {
    if (this.socket) {
      this.socket.off('online-members');
      this.socket.off('user-online');
      this.socket.off('user-offline');
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
