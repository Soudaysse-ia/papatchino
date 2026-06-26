import { io } from 'socket.io-client';

// Connexion Socket.io partagée. En dev, le proxy Vite relaie vers le backend.
let socket;

export function getSocket() {
  if (!socket) {
    socket = io({ autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}
