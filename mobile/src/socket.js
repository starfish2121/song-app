import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// Production Render backend URL
const PROD_URL = 'https://song-app-wtjd.onrender.com';
const LAN_HOST = '192.168.0.227';

const getSocketUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return hostname === 'localhost' ? 'http://localhost:4000' : PROD_URL;
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return `http://${LAN_HOST}:4000`;
  }
  return PROD_URL;
};

export const SERVER_URL = getSocketUrl();

export const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

export const initializeUserSession = (userProfile) => {
  socket.emit('user:register', userProfile);
};
