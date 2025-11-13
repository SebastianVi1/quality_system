const { app, BrowserWindow } = require('electron');
const express = require('express');
const cors = require('cors');

const SERVER_PORT = 3001;
const ESP32_BASE_URL = 'http://192.168.1.100/led';

let mainWindow;
let expressServer;
let latestQcResult = {
  imageUrl: '',
  isOk: null,
  timestamp: null,
};

const log = (...args) => {
  console.log('[QC]', ...args);
};

const createExpressApp = () => {
  const server = express();

  server.use(cors());
  server.use(express.json());

  server.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  server.get('/api/qc-result', (_req, res) => {
    res.json(latestQcResult);
  });

  server.post('/api/qc-result', async (req, res) => {
    const { imageUrl, isOk } = req.body ?? {};

    if (typeof imageUrl !== 'string' || typeof isOk !== 'boolean') {
      res.status(400).json({ message: 'Payload inválido. Se espera imageUrl (string) e isOk (boolean).' });
      return;
    }

    latestQcResult = {
      imageUrl,
      isOk,
      timestamp: new Date().toISOString(),
    };

    log('Resultado recibido:', latestQcResult);

    const color = isOk ? 'green' : 'red';
    const targetUrl = `${ESP32_BASE_URL}?color=${color}`;

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`ESP32 respondió con estado ${response.status}`);
      }
      log(`ESP32 notificado con color ${color}`);
    } catch (error) {
      console.error('[QC] No fue posible actualizar el ESP32:', error);
    }

    res.status(204).send();
  });

  return server;
};

const startExpressServer = () => {
  const server = createExpressApp();
  expressServer = server.listen(SERVER_PORT, '127.0.0.1', () => {
    log(`Servidor Express escuchando en http://localhost:${SERVER_PORT}`);
  });
  expressServer.on('error', (error) => {
    console.error('[QC] Error en el servidor Express:', error);
  });
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

app.whenReady().then(() => {
  startExpressServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (expressServer) {
    expressServer.close(() => {
      log('Servidor Express detenido');
    });
  }
});
