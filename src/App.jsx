import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';
const REFRESH_INTERVAL_MS = 3000;

const emptyResult = {
  imageUrl: '',
  isOk: null,
  timestamp: null,
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

const sampleCases = [
  {
    id: 'case-ok',
    label: 'Producto OK',
    summary: 'Sin defectos detectados',
    isOk: true,
    imageUrl: 'https://images.unsplash.com/photo-1582719478181-2cf4e7369d3f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'case-error',
    label: 'Producto con defecto',
    summary: 'Detectado defecto crítico',
    isOk: false,
    imageUrl: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?auto=format&fit=crop&w=1200&q=80',
  },
];

function App() {
  const [latestResult, setLatestResult] = useState(emptyResult);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
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
        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setLatestResult({
            imageUrl: data.imageUrl ?? '',
            isOk: typeof data.isOk === 'boolean' ? data.isOk : null,
            timestamp: data.timestamp ?? null,
          });
          setPollingError(false);
        }
      } catch (error) {
        console.error('No se pudo obtener el resultado más reciente', error);
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

  const handleSampleSend = async ({ imageUrl, isOk, label }) => {
    if (loading) {
      return;
    }

    const previousResult = latestResult;
    const optimisticResult = {
      imageUrl,
      isOk,
      timestamp: new Date().toISOString(),
    };

    setLatestResult(optimisticResult);
    setLoading(true);
    setFeedback(`Enviando ${label.toLowerCase()}...`);

    try {
      const response = await fetch(`${API_BASE_URL}/qc-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          isOk,
        }),
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`Error ${response.status}`);
      }

      setFeedback('Resultado simulado enviado.');
      setPollingError(false);
    } catch (error) {
      console.error('No se pudo enviar el resultado de QC', error);
      setLatestResult(previousResult);
      setFeedback('No se pudo enviar el resultado. Revisa la consola para más detalles.');
      setPollingError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={backgroundClass}>
      <main className="dashboard">
        <section className="status-panel">
          <h1 className={`status-text ${statusClass(latestResult.isOk)}`}>
            {statusText(latestResult.isOk)}
          </h1>
          <p className={`status-caption ${pollingError ? 'status-warning' : ''}`}>
            {pollingError
              ? 'Sin conexión con el backend. Mostrando último dato disponible.'
              : latestResult.timestamp
                  ? `Actualizado: ${new Date(latestResult.timestamp).toLocaleString()}`
                  : 'Esperando resultados...'}
          </p>
          <div className="image-wrapper">
            {latestResult.imageUrl ? (
              <img src={latestResult.imageUrl} alt="Resultado de inspección" />
            ) : (
              <span className="image-placeholder">Sin imagen</span>
            )}
          </div>
        </section>
        <section className="cases-panel">
          <h2>Casos de prueba</h2>
          <p className="cases-hint">Elige un escenario para enviar el resultado al backend.</p>
          <div className="cases-grid">
            {sampleCases.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`case-card ${item.isOk ? 'case-ok' : 'case-error'}`}
                onClick={() => handleSampleSend(item)}
                disabled={loading}
              >
                <span className="case-label">{item.label}</span>
                <span className="case-summary">{item.summary}</span>
              </button>
            ))}
          </div>
          {pollingError && (
            <p className="alert">No se pudo contactar el servidor. Se mantendrá el último estado conocido.</p>
          )}
          {feedback && <p className="feedback">{feedback}</p>}
        </section>
      </main>
    </div>
  );
}

export default App;
