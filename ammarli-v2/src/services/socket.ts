import { io, Socket } from 'socket.io-client';
import { storage } from '../utils/storage';
import { useAuthStore } from '../store/useAuthStore';

// Use same base URL as api.ts — driven by EXPO_PUBLIC_API_URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const SOCKET_URL = BASE_URL; // Socket.io connects to root, namespace is /tracking

class SocketService {
  public socket: Socket | null = null;

  async connectAsUser() {
    if (this.socket?.connected) return;
    if (this.socket) this.disconnect();

    const token = await storage.get<string>('AUTH_TOKEN');
    const userId = useAuthStore.getState().userProfile?.id;
    
    if (!token || !userId) {
      console.warn('❌ Cannot connect socket: Missing token or userId');
      return;
    }

    this.socket = io(`${SOCKET_URL}/tracking`, {
      query: { userId },
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log(`✅ [Socket] Connected as USER. ID: ${userId}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      if (err.message === 'Unauthorized' || err.message.includes('jwt expired')) {
        const { useAuthStore } = require('../store/useAuthStore');
        useAuthStore.getState().logout();
      }
    });
  }

  async connectAsDriver(driverId: string) {
    if (this.socket?.connected) return;
    if (this.socket) this.disconnect();

    const token = await storage.get<string>('AUTH_TOKEN');

    this.socket = io(`${SOCKET_URL}/tracking`, {
      query: { driverId },
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected as driver');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Driver connection error:', err.message);
      if (err.message === 'Unauthorized' || err.message.includes('jwt expired')) {
        const { useAuthStore } = require('../store/useAuthStore');
        useAuthStore.getState().logout();
      }
    });
  }

  emitLocationUpdate(lat: number, lng: number) {
    if (this.socket?.connected) {
      this.socket.emit('update_location', { lat, lng });
    }
  }

  emitOffline() {
    if (this.socket?.connected) {
      this.socket.emit('go_offline');
    }
  }

  on(eventName: string, callback: (data: any) => void) {
    this.socket?.on(eventName, callback);
  }

  off(eventName: string, callback?: (data: any) => void) {
    this.socket?.off(eventName, callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
