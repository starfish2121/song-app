import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// LAN IP for Android physical devices, 10.0.2.2 for Android emulators
const LAN_HOST = '192.168.0.227';

const getSocketUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:4000`;
  }
  return `http://${LAN_HOST}:4000`;
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
