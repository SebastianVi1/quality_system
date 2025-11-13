# QC Dashboard - Documentación Completa

## 📋 Descripción General

Aplicación de escritorio (Electron) para un **Dashboard de Control de Calidad (QC)**. 
Sistema que:
- Recibe imágenes de piezas inspeccionadas (OK/ERROR)
- Acumula piezas OK hasta alcanzar 4
- Genera automáticamente etiquetas verificadas
- Muestra estadísticas en tiempo real
- Se reinicia automáticamente después de generar cada etiqueta

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│   ELECTRON MAIN PROCESS (main.js)       │
│   - Node.js runtime                     │
│   - File System Access                  │
│   - Manages App Window                  │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  EXPRESS.js Server  │
        │  (Port 3001)        │
        │                     │
        │  /api/piece         │
        │  /api/label-image   │
        │  /api/qc-result     │
        │  /api/piece-image   │
        │  /api/label-image   │
        └──────────▲──────────┘
                   │
        ┌──────────▼──────────┐
        │  REACT Frontend     │
        │  (src/App.jsx)      │
        │                     │
        │  Polling (3s)       │
        │  Display UI         │
        │  Show Images        │
        └─────────────────────┘
```

---

## 📦 Stack Técnico

| Componente | Versión | Propósito |
|-----------|---------|----------|
| **Electron** | 39.1.2 | Desktop Container |
| **React** | 18.3.1 | Frontend UI |
| **Express** | Latest | HTTP API Server |
| **Node.js** | 18+ | Runtime |
| **CSS3** | ES2020 | Styling & Animations |

---

## 🗂️ Estructura de Archivos

```
SICALinx_App/
├── src/
│   ├── main.js              ← Backend Express + State
│   ├── App.jsx              ← React Frontend
│   ├── App.css              ← Styles
│   ├── index.html           ← HTML Entry
│   ├── preload.js           ← Electron Bridge
│   ├── renderer.jsx         ← Electron Renderer
│   └── assets/              ← Images & Resources
├── temp/                    ← Generated (Images Storage)
│   ├── pieza_*.png          ← Piece Images
│   └── label_*.png          ← Label Images
├── package.json             ← Dependencies
├── forge.config.js          ← Electron Forge Config
├── webpack.*.config.js      ← Build Config
└── CAMBIOS_REALIZADOS.md    ← This Session's Changes
```

---

## 🔄 Flujo de Trabajo

### 1️⃣ **Captura de Pieza**
```
POST /api/piece
{
  image: "base64_string",
  isOk: true|false
}
```

**Backend:**
- Guarda imagen en `temp/pieza_${timestamp}.png`
- Incrementa `totalPiecesOk` (si OK) o `totalPiecesRejected` (si ERROR)
- Si OK: Incrementa `currentPiecesOkCount` (máximo 4)
- Si `currentPiecesOkCount == 4` y hay etiqueta en cola → Genera etiqueta

**Frontend (Polling cada 3s):**
- Recibe `currentPieceImagePath`
- Muestra imagen con borde verde (OK) o rojo (ERROR)
- Actualiza contador `X/4`

### 2️⃣ **Generación de Etiqueta**
```
POST /api/label-image
{
  image: "base64_string"
}
```

**Backend:**
- Almacena etiqueta en cola (`lastLabelImage`)
- Reinicia contador para nuevo ciclo
- Cuando se alcancen 4 piezas OK → Genera etiqueta física

**Lógica:**
1. Detecta `currentPiecesOkCount == 4`
2. Genera `label_${timestamp}.png` con marca de agua
3. Incrementa `totalLabelsGenerated`
4. Muestra etiqueta por 2 segundos
5. **Auto-reinicia**: Resetea counter, limpia etiqueta

### 3️⃣ **Estadísticas en Tiempo Real**
```
GET /api/qc-result
{
  isOk: true|false,
  currentPiecesOk: 0-4,
  currentPieceImagePath: "...",
  printedLabelPath: "...",
  totalOk: N,           ← ACUMULATIVO
  totalRejected: N,     ← ACUMULATIVO
  totalLabels: N        ← ACUMULATIVO
}
```

---

## 📊 Estados y Transiciones

### Estado del Contador

```
0 → 1 → 2 → 3 → 4 (Genera Etiqueta)
                ↓
         [Muestra 2s]
                ↓
              REINICIO
                ↓
                0
```

**Reglas:**
- ✅ Pieza OK: Incrementa (máximo 4)
- ❌ Pieza ERROR: No cambia
- 🏷️ Etiqueta: Incrementa `totalLabels`, resetea counter

### Estadísticas Acumuladas

```
totalOk:       Suma de todas las piezas OK (nunca decrece)
totalRejected: Suma de todas las piezas ERROR (nunca decrece)
totalLabels:   Cantidad de etiquetas generadas (nunca decrece)
```

---

## 🎨 Interfaz de Usuario

### Sección Izquierda: Estado Actual
- **Texto Grande**: "OK" (Verde) | "ERROR" (Rojo) | "ESPERANDO" (Amarillo)
- **Imagen**: Última pieza capturada
- **Bordes de Color**: 
  - Verde (#22c55e) para OK
  - Rojo (#f87171) para ERROR

### Sección Derecha: Panel de Resumen
- **Contador Actual**: `X/4` piezas OK en lote actual
- **Estado**: "Listo" | "N pend." (Pendientes)
- **Estadísticas**:
  - Total Aceptadas (verde)
  - Total Rechazadas (rojo)
  - Total Etiquetas (azul)
- **Etiqueta Impresa**: Muestra imagen cuando disponible

### Colores
- **Verde (#22c55e)**: OK, Aceptado
- **Rojo (#f87171)**: ERROR, Rechazado
- **Azul (#3b82f6)**: Etiquetas
- **Amarillo (#facc15)**: Espera/Advertencia

---

## 🚀 Configuración e Inicio

### Instalación
```bash
npm install
```

### Desarrollo
```bash
npm start
```

### Build
```bash
npm run make
```

---

## 🔌 Endpoints API

### `GET /api/qc-result`
Obtiene estado completo actual.
```javascript
{
  isOk: boolean | null,
  timestamp: ISO8601,
  currentPieceImagePath: "/api/piece-image/...",
  currentPiecesOk: 0-4,
  printedLabelPath: "/api/label-image/..." | null,
  lastPrintAt: ISO8601 | null,
  totalOk: number,
  totalRejected: number,
  totalLabels: number
}
```

### `POST /api/piece`
Registra una pieza inspeccionada.
```javascript
{
  image: "base64_string",
  isOk: boolean
}
// Respuesta: 204 No Content
```

### `POST /api/label-image`
Registra una etiqueta en cola.
```javascript
{
  image: "base64_string"
}
// Respuesta: 204 No Content
```

### `GET /api/piece-image/:filename`
Descarga imagen de pieza.

### `GET /api/label-image/:filename`
Descarga imagen de etiqueta.

---

## 🔧 Configuración

### Constantes en `main.js`

```javascript
const GOOD_PIECES_THRESHOLD = 4;      // Piezas OK para generar etiqueta
const TEMP_DIR = './temp';            // Directorio de almacenamiento
const EXPRESS_PORT = 3001;            // Puerto backend
const REFRESH_INTERVAL_MS = 3000;     // Polling frontend (ms)
```

### Auto-Reinicio
```javascript
setTimeout(() => {
  currentPiecesOkCount = 0;
  latestQcResult.currentPiecesOk = 0;
  latestQcResult.printedLabelPath = null;
  latestQcResult.lastPrintAt = null;
  lastLabelImage = null;
}, 2000); // Espera 2 segundos después de mostrar etiqueta
```

---

## 📈 Flujo de Datos Completo

```
Usuario/Sistema External
         │
         ├─→ POST /api/label-image (Etiqueta en cola)
         │   └─→ Backend almacena en lastLabelImage
         │
         └─→ POST /api/piece (Imagen + OK/ERROR)
             └─→ Backend:
                 ├─→ Guarda imagen
                 ├─→ Incrementa estadísticas
                 ├─→ Si OK: Incrementa counter
                 ├─→ Si counter == 4 y etiqueta existe:
                 │   ├─→ Genera etiqueta física
                 │   ├─→ Incrementa totalLabels
                 │   ├─→ Muestra por 2s
                 │   └─→ Auto-reinicia (counter=0)
                 │
                 └─→ GET /api/qc-result
                     └─→ Frontend (cada 3s):
                         ├─→ Muestra imagen actual
                         ├─→ Muestra contador X/4
                         ├─→ Muestra estadísticas
                         └─→ Muestra etiqueta si existe
```

---

## 🧪 Pruebas Recomendadas

Ver `PRUEBAS_ESTADISTICAS.md` para scripts completos.

**Casos Críticos:**
1. ✅ 4 OK consecutivos → Auto-reinicio
2. ❌ ERROR no afecta counter
3. 📊 Estadísticas acumulan correctamente
4. 🔄 Múltiples ciclos mantienen stats
5. ⏱️ Reinicio automático después de 2s

---

## 🐛 Troubleshooting

### Imagen no aparece
- Verificar formato base64 válido
- Revisar que no incluya `data:image/png;base64,` (se limpia automáticamente)
- Confirmar `temp/` directorio existe

### Counter no llega a 4
- Verificar que `isOk: true` en POST `/api/piece`
- Revisar logs backend para ver incrementos

### Etiqueta no se genera
- Verificar que POST `/api/label-image` fue ejecutado ANTES
- Revisar que `currentPiecesOkCount` llegó a 4

### Auto-reinicio no funciona
- Verificar que etiqueta se muestre en UI (2 segundos)
- Revisar logs de timeout del backend

### Conexión rechazada
- Verificar puerto 3001 disponible
- Revisar CORS habilitado en Express
- Confirmar `contextIsolation: false` en Electron

---

## 📝 Versión de Cambios

**v1.0 - Sesión Actual**
- ✅ Estadísticas completas (totalOk, totalRejected, totalLabels)
- ✅ Auto-reinicio después de generar etiqueta
- ✅ UI mejorada con sección de estadísticas
- ✅ Contador acotado a máximo 4
- ✅ Piezas rechazadas no afectan counter

---

## 📞 Contacto / Soporte

Para problemas, revisar:
1. `CAMBIOS_REALIZADOS.md` - Cambios de esta sesión
2. `PRUEBAS_ESTADISTICAS.md` - Scripts de prueba
3. Logs del backend en consola

