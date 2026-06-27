import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import { initSchema } from './db.js';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import tableRoutes from './routes/tables.js';
import userRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';
import logRoutes from './routes/logs.js';

// Chargement simple d'un éventuel fichier .env (sans dépendance externe).
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

initSchema();

const app = express();
const server = http.createServer(app);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '8mb' }));

// Photos des plats téléversées (servies statiquement).
const uploadsPath = join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/logs', logRoutes);

// En production, on sert le build Vite depuis backend
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

io.on('connection', (socket) => {
  // Les écrans (caisse/cuisine) rejoignent des salles dédiées si besoin.
  socket.on('join', (room) => socket.join(room));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API Resto Manager démarrée sur http://localhost:${PORT}`);
});
