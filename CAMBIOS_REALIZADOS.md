# Cambios Realizados - QC Dashboard

## Resumen
Se implementó el sistema completo de estadísticas y reinicio automático del ciclo después de generar la etiqueta.

---

## Cambios en Backend (`src/main.js`)

### 1. **Variables Globales de Estadísticas** (Líneas 16-22)
```javascript
let totalPiecesOk = 0;           // Contador acumulativo de piezas aceptadas
let totalPiecesRejected = 0;     // Contador acumulativo de piezas rechazadas
let totalLabelsGenerated = 0;    // Contador acumulativo de etiquetas generadas
```

### 2. **Extensión del Objeto `latestQcResult`** (Líneas 29-39)
Se agregaron tres nuevos campos para enviar las estadísticas al frontend:
```javascript
totalOk: 0,        // Total de piezas aceptadas
totalRejected: 0,  // Total de piezas rechazadas
totalLabels: 0,    // Total de etiquetas generadas
```

### 3. **Lógica de Contador y Estadísticas en `/api/piece`** (POST Handler)

**Para Piezas OK:**
- Incrementa `totalPiecesOk` siempre (estadística global)
- Incrementa `currentPiecesOkCount` solo si es < 4 (contador actual del lote)
- Cuando `currentPiecesOkCount` llega a 4 y hay etiqueta en cola:
  - Genera la etiqueta
  - Incrementa `totalLabelsGenerated`
  - Muestra la etiqueta por 2 segundos
  - **Auto-reinicia**: Resetea contador, limpia etiqueta y lastLabelImage

**Para Piezas Rechazadas:**
- Incrementa `totalPiecesRejected`
- No afecta el contador del lote
- Se muestra en rojo en la UI

### 4. **Auto-Reinicio Automático** (Lines 236-245)
Después de generar y mostrar la etiqueta por 2 segundos:
```javascript
setTimeout(() => {
  currentPiecesOkCount = 0;
  latestQcResult.currentPiecesOk = 0;
  latestQcResult.printedLabelPath = null;
  latestQcResult.lastPrintAt = null;
  lastLabelImage = null;
  log('🔄 Ciclo completado. Reiniciado para nuevo lote.');
}, 2000);
```

---

## Cambios en Frontend (`src/App.jsx`)

### 1. **Extensión del Estado Vacío** (Lines 17-24)
Se agregaron los tres campos de estadísticas al estado por defecto:
```javascript
totalOk: 0,
totalRejected: 0,
totalLabels: 0,
```

### 2. **Nueva Sección de Estadísticas** (Summary Panel)
Se insertó un nuevo div con información de:
- **Total Aceptadas**: Piezas OK acumuladas
- **Total Rechazadas**: Piezas ERROR acumuladas
- **Total Etiquetas**: Etiquetas generadas

---

## Cambios en Estilos (`src/App.css`)

### 1. **Nueva Sección `.statistics-section`**
- Fondo semitransparente con bordes sutiles
- Grid de 3 columnas para los 3 estadísticos

### 2. **Estilos `.stat-item`**
Cada estadístico tiene su propio color:
- **OK Stat**: Verde (#22c55e)
- **Error Stat**: Rojo (#f87171)
- **Label Stat**: Azul (#3b82f6)

Cada estadístico muestra:
- Etiqueta en mayúsculas y letra pequeña
- Valor grande y en negrita con color de categoría

---

## Flujo Completo Actualizado

```
1. Usuario envía pieza OK/ERROR → POST /api/piece
   ↓
2. Si OK: Incrementa totalPiecesOk e currentPiecesOkCount (si < 4)
   Si ERROR: Incrementa totalPiecesRejected, contador sin cambios
   ↓
3. Si currentPiecesOkCount == 4 y hay etiqueta en cola:
   - Genera etiqueta
   - Incrementa totalLabelsGenerated
   - Muestra etiqueta por 2 segundos
   ↓
4. Después de 2 segundos (auto-reinicio):
   - Resetea currentPiecesOkCount a 0
   - Limpia printedLabelPath
   - Limpia lastLabelImage
   - Está listo para nuevo lote
   ↓
5. Frontend (cada 3 segundos) → GET /api/qc-result
   - Muestra pieza actual con color (verde/rojo)
   - Muestra contador actual (X/4)
   - Muestra estadísticas acumuladas (Total OK/ERROR/Etiquetas)
   - Muestra etiqueta si hay una impresa
```

---

## Puntos Clave

✅ **Estadísticas Acumulativas**: Se mantienen durante toda la sesión
✅ **Auto-Reinicio**: Se activa automáticamente 2 segundos después de mostrar la etiqueta
✅ **Contador Acotado**: El contador del lote nunca supera 4
✅ **Piezas Rechazadas**: Se cuentan pero no afectan el lote
✅ **UI en Tiempo Real**: Polling cada 3 segundos actualiza todos los valores

---

## Pruebas Recomendadas

1. Enviar 4 piezas OK → Debe llegar a 4 y generar etiqueta
2. Enviar rechazo → Counter no cambia, totalRejected incrementa
3. Esperar 2 segundos → Counter y etiqueta deben limpiarse automáticamente
4. Enviar 4 OK más → Debe incrementar totalLabels a 2
5. Verificar estadísticas → Deben mostrar totales correctos

