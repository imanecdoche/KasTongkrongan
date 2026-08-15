import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data_kas.json');

app.use(express.json({ limit: '10mb' }));

// Initial default state
const DEFAULT_STATE = {
  users: [],
  loans: [],
  transactions: [],
  credit_restorations: [],
  rabs: [],
  config: {
    weekly_target: 20000,
    default_credit_limit: 20000,
    treasurer_name: 'Bendahara Tongkrongan',
    treasurer_phone: '0812-3456-7890',
    treasurer_bank_name: 'Bank BCA',
    treasurer_account_number: '1234567890',
    treasurer_ewallet: 'DANA (0812-3456-7890)',
  },
  updated_at: new Date().toISOString(),
};

// In-memory + Persistent JSON DB
let currentAppState = { ...DEFAULT_STATE };

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) {
        currentAppState = {
          users: parsed.users || [],
          loans: parsed.loans || [],
          transactions: parsed.transactions || [],
          credit_restorations: parsed.credit_restorations || [],
          rabs: parsed.rabs || [],
          config: parsed.config || DEFAULT_STATE.config,
          updated_at: parsed.updated_at || new Date().toISOString(),
        };
        console.log('[DB] Database loaded successfully. Total users:', currentAppState.users.length);
        return;
      }
    }
  } catch (err) {
    console.error('[DB] Error loading data_kas.json, using default state:', err);
  }

  // If file doesn't exist, save default state
  saveDatabase(DEFAULT_STATE);
}

function saveDatabase(stateToSave: typeof currentAppState) {
  try {
    stateToSave.updated_at = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(stateToSave, null, 2), 'utf-8');
    currentAppState = stateToSave;
  } catch (err) {
    console.error('[DB] Error saving data_kas.json:', err);
  }
}

// Initial DB load
loadDatabase();

// WebSocket Server for Realtime sync
const wss = new WebSocketServer({ server, path: '/ws/kas' });

function broadcastAppState(senderWs?: WebSocket) {
  const payload = JSON.stringify({
    type: 'SYNC_STATE',
    state: currentAppState,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  // Send current state to newly connected client immediately
  ws.send(
    JSON.stringify({
      type: 'INIT_STATE',
      state: currentAppState,
      timestamp: Date.now(),
    })
  );

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'UPDATE_STATE' && data.state) {
        saveDatabase(data.state);
        // Broadcast update to all other connected clients
        broadcastAppState(ws);
      }
    } catch (err) {
      console.error('[WS] Error processing message:', err);
    }
  });
});

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/state', (req, res) => {
  res.json({
    status: 'success',
    data: currentAppState,
  });
});

app.post('/api/state', (req, res) => {
  try {
    const newState = req.body;
    if (!newState || !Array.isArray(newState.users)) {
      return res.status(400).json({ error: 'Invalid state payload' });
    }

    saveDatabase(newState);
    broadcastAppState();

    res.json({
      status: 'success',
      message: 'State updated and synced realtime to database',
      data: currentAppState,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/reset', (req, res) => {
  currentAppState = { ...DEFAULT_STATE, updated_at: new Date().toISOString() };
  saveDatabase(currentAppState);
  broadcastAppState();
  res.json({ status: 'success', message: 'Database reset to default', data: currentAppState });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] KasTongkrongan server running on http://0.0.0.0:${PORT}`);
  });
}

start();
