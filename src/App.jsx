import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';
const REFRESH_INTERVAL_MS = 3000;

const defaultSummary = {
  isOk: null,
  currentPiecesOk: 0,
  printedLabelPath: null,
  lastPrintAt: null,
  currentPieceImagePath: null,
};

const emptyResult = {
  isOk: null,
  timestamp: null,
  currentPiecesOk: 0,
  printedLabelPath: null,
  lastPrintAt: null,
  currentPieceImagePath: null,
  totalOk: 0,
  totalRejected: 0,
  totalLabels: 0,
  labelRequiredWarning: null,
};

const statusText = (isOk) => {
  if (isOk === null) {
    return 'ESPERANDO';
  }
  return isOk ? 'OK' : 'ERROR';
};

const statusClass = (isOk) => {
  if (isOk === null) {
    return 'status-pending';
  }
  return isOk ? 'status-ok' : 'status-error';
};

function App() {
  const [latestResult, setLatestResult] = useState(emptyResult);
  const [pollingError, setPollingError] = useState(false);

  const backgroundClass = useMemo(() => {
    if (latestResult.isOk === null) {
      return 'app-container neutral';
    }
    return latestResult.isOk ? 'app-container ok' : 'app-container error';
  }, [latestResult.isOk]);

  useEffect(() => {
    let isMounted = true;

    const fetchLatest = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/qc-result`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();

        if (isMounted) {
          setLatestResult(data || {});
          setPollingError(false);
        }
      } catch (error) {
        console.error('[POLLING ERROR]', error.message);
        if (isMounted) {
          setPollingError(true);
        }
      }
    };

    fetchLatest();
    const intervalId = setInterval(fetchLatest, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={backgroundClass}>
      <main className="dashboard">
        <section className="status-panel">
          <h1 className={`status-text ${statusClass(latestResult.isOk)}`}>
            {statusText(latestResult.isOk)}
          </h1>
          
          {latestResult.labelRequiredWarning && (
            <div className="label-required-warning">
              {latestResult.labelRequiredWarning}
            </div>
          )}
          
          <p className={`status-caption ${pollingError ? 'status-warning' : ''}`}>
            {pollingError
              ? 'Sin conexión con el backend.'
              : latestResult.timestamp
                  ? `Actualizado: ${new Date(latestResult.timestamp).toLocaleString()}`
                  : 'Esperando resultados...'}
          </p>
          <div className="image-wrapper">
            {latestResult.currentPieceImagePath ? (
              <img 
                src={`http://localhost:3001${latestResult.currentPieceImagePath}`}
                alt="Imagen de pieza" 
                className={`piece-image ${latestResult.isOk ? 'ok' : 'error'}`}
              />
            ) : (
              <span className="image-placeholder">Sin imagen</span>
            )}
          </div>
        </section>
        <section className="summary-panel">
          <h2>Estado actual</h2>
          <div className="summary-grid">
            <div>
              <span className="summary-title">Piezas OK</span>
              <span className="summary-value">{latestResult.currentPiecesOk || 0}/4</span>
            </div>
            <div>
              <span className="summary-title">Estado</span>
              <span className="summary-value">
                {(latestResult.currentPiecesOk || 0) >= 4 ? 'Listo' : `${4 - (latestResult.currentPiecesOk || 0)} pend.`}
              </span>
            </div>
          </div>
          {latestResult.lastPrintAt && (
            <p className="summary-updated">
              Última impresión: {new Date(latestResult.lastPrintAt).toLocaleString()}
            </p>
          )}
          
          <div className="statistics-section">
            <h3>Estadísticas</h3>
            <div className="statistics-grid">
              <div className="stat-item ok-stat">
                <span className="stat-label">Total Aceptadas</span>
                <span className="stat-value">{latestResult.totalOk || 0}</span>
              </div>
              <div className="stat-item error-stat">
                <span className="stat-label">Total Rechazadas</span>
                <span className="stat-value">{latestResult.totalRejected || 0}</span>
              </div>
              <div className="stat-item label-stat">
                <span className="stat-label">Total Etiquetas</span>
                <span className="stat-value">{latestResult.totalLabels || 0}</span>
              </div>
            </div>
          </div>

          {latestResult.printedLabelPath && (
            <div className="printed-label-section">
              <h3>Etiqueta impresa</h3>
              <img
                src={`http://localhost:3001${latestResult.printedLabelPath}`}
                alt="Etiqueta"
                className="printed-label-image"
              />
            </div>
          )}
          {pollingError && (
            <p className="alert">No se pudo contactar el servidor.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
