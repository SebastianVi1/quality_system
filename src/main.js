const { app, BrowserWindow } = require('electron');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const SERVER_PORT = 3001;
const GOOD_PIECES_THRESHOLD = 4;
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Asegurar que existe el directorio temporal
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

let currentPiecesOkCount = 0;
let lastLabelImage = null;
let lastPrintedLabelPath = null;
let lastPrintedLabelFilename = null;
let totalPiecesOk = 0;
let totalPiecesRejected = 0;
let totalLabelsGenerated = 0;
let labelRequiredWarning = null; // Advertencia si falta etiqueta

let mainWindow;
let expressServer;
let latestQcResult = {
  isOk: null,
  timestamp: null,
  currentPieceImagePath: null,
  currentPiecesOk: 0,
  printedLabelPath: null,
  lastPrintAt: null,
  totalOk: 0,
  totalRejected: 0,
  totalLabels: 0,
  labelRequiredWarning: null,
};

const log = (...args) => {
  console.log('[QC]', ...args);
};

const saveLabelImage = async (base64Image) => {
  try {
    const timestamp = Date.now();
    const filename = `etiqueta_${timestamp}.png`;
    const filePath = path.join(TEMP_DIR, filename);
    
    // Limpiar base64
    let cleanBase64 = base64Image;
    if (base64Image.includes(',')) {
      cleanBase64 = base64Image.split(',')[1];
    }
    
    // Validar base64
    if (!cleanBase64 || !/^[A-Za-z0-9+/=]*$/.test(cleanBase64)) {
      throw new Error('Base64 inválido');
    }
    
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    if (buffer.length === 0) {
      throw new Error('Buffer vacío');
    }
    
    await fs.promises.writeFile(filePath, buffer);
    log(`✅ Etiqueta guardada: ${filename} (${buffer.length} bytes)`);
    console.log('[SAVE-LABEL OK]', { filename, filePath, size: buffer.length });
    return { filePath, filename };
  } catch (error) {
    console.error('[SAVE-LABEL ERROR]', error.message);
    return null;
  }
};

const deleteLabelImage = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      log(`Etiqueta eliminada: ${filePath}`);
    }
  } catch (error) {
    console.error('[QC] Error al eliminar la etiqueta:', error);
  }
};

const savePieceImage = async (base64Image, timestamp) => {
  try {
    const filename = `pieza_${timestamp}.png`;
    const filePath = path.join(TEMP_DIR, filename);
    
    // Limpiar base64 (remover data:image/png;base64, si existe)
    let cleanBase64 = base64Image;
    if (base64Image.includes(',')) {
      cleanBase64 = base64Image.split(',')[1];
    }
    
    // Validar que sea válido base64
    if (!cleanBase64 || !/^[A-Za-z0-9+/=]*$/.test(cleanBase64)) {
      console.error('[BASE64 INVALID]', { length: base64Image.length, firstChars: base64Image.substring(0, 50) });
      throw new Error('Base64 inválido');
    }
    
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    // Validar que el buffer tenga contenido
    if (buffer.length === 0) {
      throw new Error('Buffer vacío después de decodificar');
    }
    
    await fs.promises.writeFile(filePath, buffer);
    log(`✅ Imagen guardada: ${filename} (${buffer.length} bytes)`);
    console.log('[SAVE-PIECE OK]', { filename, filePath, size: buffer.length });
    return filename;
  } catch (error) {
    console.error('[SAVE-PIECE ERROR]', error.message);
    return null;
  }
};

const createExpressApp = () => {
  const server = express();

  server.use(cors());
  server.use(express.json({ limit: '10mb' }));

  server.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  server.get('/api/qc-result', (_req, res) => {
    res.json(latestQcResult);
  });

  server.get('/api/piece-image/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(TEMP_DIR, filename);

    // Validar que el archivo esté dentro de TEMP_DIR
    const normalizedPath = path.normalize(filePath);
    const normalizedTempDir = path.normalize(TEMP_DIR);

    if (!normalizedPath.startsWith(normalizedTempDir)) {
      res.status(403).json({ message: 'Acceso denegado' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Imagen no encontrada' });
      return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  });

  server.get('/api/label-image/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(TEMP_DIR, filename);

    // Validar que el archivo esté dentro de TEMP_DIR
    const normalizedPath = path.normalize(filePath);
    const normalizedTempDir = path.normalize(TEMP_DIR);

    if (!normalizedPath.startsWith(normalizedTempDir)) {
      res.status(403).json({ message: 'Acceso denegado' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Imagen no encontrada' });
      return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  });

  server.post('/api/piece', async (req, res) => {
    const { image, isOk } = req.body ?? {};

    if (typeof image !== 'string' || typeof isOk !== 'boolean') {
      res.status(400).json({ message: 'Payload inválido. Se espera {image: "base64", isOk: boolean}' });
      return;
    }

    log('Pieza recibida:', { isOk, imageLength: image.length });

    // Guardar imagen
    const timestamp = Date.now();
    const pieceImageFilename = await savePieceImage(image, timestamp);

    if (!pieceImageFilename) {
      res.status(500).json({ message: 'Error al guardar la imagen' });
      return;
    }

    // Actualizar estado
    latestQcResult.isOk = isOk;
    latestQcResult.currentPieceImagePath = `/api/piece-image/${pieceImageFilename}`;
    latestQcResult.timestamp = new Date().toISOString();

    // Solo contar piezas OK
    if (isOk) {
      // VALIDAR: Debe haber una etiqueta registrada para poder contar piezas OK
      if (!lastLabelImage) {
        labelRequiredWarning = '⚠️ Debe escanear una ETIQUETA antes de escanear piezas';
        latestQcResult.labelRequiredWarning = labelRequiredWarning;
        log('⚠️ ADVERTENCIA: Se intentó contar pieza OK sin etiqueta registrada');
        res.status(400).json({ 
          message: labelRequiredWarning,
          warning: true 
        });
        return;
      }
      
      // Limpiar advertencia si había una
      labelRequiredWarning = null;
      latestQcResult.labelRequiredWarning = null;
      
      totalPiecesOk += 1;
      latestQcResult.totalOk = totalPiecesOk;
      
      // No permitir que suba más de 4
      if (currentPiecesOkCount < GOOD_PIECES_THRESHOLD) {
        currentPiecesOkCount += 1;
      }
      latestQcResult.currentPiecesOk = currentPiecesOkCount;
      log(`✅ Piezas OK: ${currentPiecesOkCount}/${GOOD_PIECES_THRESHOLD} | Total: ${totalPiecesOk}`);

      // Si llegamos a 4 piezas OK y hay etiqueta en cola, generar etiqueta
      if (currentPiecesOkCount >= GOOD_PIECES_THRESHOLD && lastLabelImage) {
        log('🎉 Se alcanzó el umbral. Generando etiqueta con marca de agua...');

        const savedLabel = await saveLabelImage(lastLabelImage);

        // Eliminar etiqueta anterior
        if (lastPrintedLabelPath) {
          await deleteLabelImage(lastPrintedLabelPath);
        }

        if (savedLabel) {
          lastPrintedLabelPath = savedLabel.filePath;
          lastPrintedLabelFilename = savedLabel.filename;
          latestQcResult.printedLabelPath = `/api/label-image/${savedLabel.filename}`;
          latestQcResult.lastPrintAt = new Date().toISOString();
          totalLabelsGenerated += 1;
          latestQcResult.totalLabels = totalLabelsGenerated;
          log(`✅ Etiqueta generada: ${savedLabel.filename} | Total etiquetas: ${totalLabelsGenerated}`);

          // Esperar un momento antes de reiniciar (para que se muestre la etiqueta)
          setTimeout(() => {
            currentPiecesOkCount = 0;
            latestQcResult.currentPiecesOk = 0;
            latestQcResult.printedLabelPath = null;
            latestQcResult.lastPrintAt = null;
            lastLabelImage = null;
            log('🔄 Ciclo completado. Reiniciado para nuevo lote.');
          }, 2000); // Mostrar etiqueta por 2 segundos antes de reiniciar
        }
      }
    } else {
      totalPiecesRejected += 1;
      latestQcResult.totalRejected = totalPiecesRejected;
      
      // Pieza rechazada: no afecta el contador, solo se muestra en rojo
      latestQcResult.currentPiecesOk = currentPiecesOkCount;
      log(`❌ Pieza rechazada (descartada físicamente). Contador no cambia. Total rechazadas: ${totalPiecesRejected}`);
    }

    res.status(204).send();
  });

  server.post('/api/label-image', async (req, res) => {
    const { image } = req.body ?? {};

    if (typeof image !== 'string') {
      res.status(400).json({ message: 'Payload inválido. Se espera {image: "base64"}' });
      return;
    }

    log('📋 Imagen de etiqueta recibida. En cola esperando 4 piezas OK...');
    lastLabelImage = image;
    
    // Limpiar advertencia de etiqueta requerida
    labelRequiredWarning = null;
    latestQcResult.labelRequiredWarning = null;

    // Reiniciar contador y limpiar etiqueta anterior para nuevo lote
    currentPiecesOkCount = 0;
    latestQcResult.currentPiecesOk = 0;
    latestQcResult.printedLabelPath = null;
    latestQcResult.lastPrintAt = null;

    res.status(204).send();
  });

  return server;
};

const startExpressServer = () => {
  const server = createExpressApp();
  expressServer = server.listen(SERVER_PORT, '0.0.0.0', () => {
    log(`✅ Servidor Express escuchando en http://localhost:${SERVER_PORT}`);
  });
  expressServer.on('error', (error) => {
    console.error('[QC] Error en servidor:', error);
  });
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"],
      },
    });
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
