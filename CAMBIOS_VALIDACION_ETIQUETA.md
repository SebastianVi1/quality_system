# 🚨 Validación de Etiqueta Obligatoria - Resumen de Cambios

## 📋 Resumen Ejecutivo

Se implementó una **validación obligatoria**: antes de poder contar piezas OK, el usuario DEBE escanear primero una etiqueta del contenedor.

Si intenta contar piezas sin etiqueta:
- ❌ Se rechaza la pieza
- 🚨 Aparece advertencia roja parpadeante
- 📱 Mensaje: "⚠️ Debe escanear una ETIQUETA antes de escanear piezas"

---

## 🔧 Cambios Técnicos

### Backend (`src/main.js`)

**Nuevas Variables:**
```javascript
let labelRequiredWarning = null;  // Almacena mensaje de advertencia
```

**En `latestQcResult`:**
```javascript
{
  // ... otros campos ...
  labelRequiredWarning: null,  // Se envía al frontend
}
```

**Lógica en POST `/api/piece`:**
```javascript
if (isOk) {
  // 🔍 VALIDACIÓN: ¿Existe etiqueta?
  if (!lastLabelImage) {
    // ❌ NO HAY ETIQUETA - RECHAZAR
    labelRequiredWarning = '⚠️ Debe escanear una ETIQUETA antes de escanear piezas';
    return res.status(400).json({ message, warning: true });
  }
  
  // ✓ SÍ HAY ETIQUETA - PROCEDER NORMALMENTE
  labelRequiredWarning = null;  // Limpiar aviso anterior
  totalPiecesOk += 1;
  // ... resto de lógica ...
}
```

**En POST `/api/label-image`:**
- Limpia automáticamente la advertencia cuando se recibe etiqueta

---

### Frontend (`src/App.jsx`)

**Nuevo Campo en Estado:**
```javascript
labelRequiredWarning: null,
```

**Componente de Advertencia (en status-panel):**
```jsx
{latestResult.labelRequiredWarning && (
  <div className="label-required-warning">
    {latestResult.labelRequiredWarning}
  </div>
)}
```

---

### Estilos (`src/App.css`)

**Nueva Clase `.label-required-warning`:**
```css
.label-required-warning {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(248, 113, 113, 0.2);      /* Rojo semitransparente */
  border: 2px solid rgba(248, 113, 113, 0.6); /* Borde rojo destacado */
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fca5a5;                             /* Rojo claro */
  text-align: center;
  animation: pulse-warning 2s ease-in-out infinite;  /* Parpadea */
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
}
```

**Animación:**
- Parpadea cada 2 segundos
- Escala ligeramente para efecto "pulso"
- Llama la atención del usuario

---

## 📊 Flujo de Operación

```
┌─────────────────────────────────────────────────────────────┐
│                    CICLO COMPLETO                            │
└─────────────────────────────────────────────────────────────┘

PASO 1: ESCANEAR ETIQUETA
  ├─ POST /api/label-image { image: "base64" }
  ├─ Backend:
  │  ├─ lastLabelImage = "base64"
  │  ├─ labelRequiredWarning = null
  │  ├─ currentPiecesOkCount = 0
  │  └─ printedLabelPath = null
  └─ Frontend:
     └─ ✓ Advertencia desaparece (si existía)

PASO 2-5: ESCANEAR 4 PIEZAS OK
  ├─ POST /api/piece { image: "base64", isOk: true }
  ├─ Backend:
  │  ├─ Verifica: if (!lastLabelImage) → ✓ Existe
  │  ├─ labelRequiredWarning = null
  │  ├─ totalPiecesOk += 1
  │  ├─ currentPiecesOkCount += 1 (máx 4)
  │  └─ Si currentPiecesOkCount == 4:
  │     ├─ Genera etiqueta física
  │     ├─ totalLabelsGenerated += 1
  │     ├─ printedLabelPath = "/api/label-image/..."
  │     └─ Espera 2 segundos (mostrar etiqueta)
  └─ Frontend:
     ├─ Muestra imagen con borde verde
     └─ Actualiza contador: X/4

AUTO-REINICIO (después de 2 segundos)
  ├─ currentPiecesOkCount = 0
  ├─ printedLabelPath = null
  └─ Listo para nuevo contenedor

NUEVO CICLO: Volver a PASO 1
```

---

## ⚠️ Casos de Error

### Caso 1: Usuario Olvida Escanear Etiqueta
```
Usuario intenta: POST /api/piece { isOk: true }
↓
Backend verifica: if (!lastLabelImage) → SÍ es nulo
↓
Respuesta: HTTP 400
{
  message: "⚠️ Debe escanear una ETIQUETA antes de escanear piezas",
  warning: true
}
↓
Frontend (polling): Recibe labelRequiredWarning
↓
UI: Muestra ADVERTENCIA ROJA PARPADEANTE
```

### Caso 2: Etiqueta Expirada (Después de Reinicio)
```
Ciclo anterior completó y reinició
↓
lastLabelImage se limpió a null
↓
Usuario intenta contar pieza sin escanear etiqueta nueva
↓
ADVERTENCIA: Mismo flujo que Caso 1
↓
Solución: Escanear etiqueta del NUEVO contenedor
```

---

## ✅ Validación de Requisitos

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| No permite contar sin etiqueta | ✅ | HTTP 400 en POST /api/piece |
| Muestra advertencia clara | ✅ | Texto: "⚠️ Debe escanear una ETIQUETA..." |
| Advertencia es visible | ✅ | Color rojo + animación pulsante |
| Se limpia automáticamente | ✅ | Al recibir POST /api/label-image |
| Visible en tiempo real | ✅ | Polling cada 3 segundos |

---

## 🧪 Pruebas Recomendadas

### Test 1: Validación Básica
```
1. Iniciar aplicación
2. Intentar POST /api/piece { isOk: true }
   ESPERADO: ❌ HTTP 400 + labelRequiredWarning poblado
3. Frontend debe mostrar advertencia roja parpadeante
```

### Test 2: Limpieza de Advertencia
```
1. Desde estado de error (sin etiqueta)
2. Enviar POST /api/label-image { image: "base64" }
3. GET /api/qc-result
   ESPERADO: labelRequiredWarning = null
4. Frontend: Advertencia desaparece
```

### Test 3: Ciclo Completo
```
1. POST /api/label-image (Etiqueta)
   → labelRequiredWarning = null
2. POST /api/piece OK (x4 veces)
   → Cada uno debe SUCCESS (204)
   → currentPiecesOkCount incrementa
3. Al llegar a 4:
   → Genera etiqueta
   → Muestra por 2 segundos
   → Auto-reinicia (currentPiecesOkCount = 0)
4. Intentar POST /api/piece sin etiqueta nueva
   → ❌ HTTP 400 + ADVERTENCIA
```

### Test 4: Múltiples Errores
```
1. Intentar 3 veces sin etiqueta
   → Todas retornan HTTP 400
   → Advertencia visible todo el tiempo
2. Escanear etiqueta
   → Advertencia desaparece
3. Ahora funciona normalmente
```

---

## 🎨 Experiencia del Usuario

### ❌ Flujo Incorrecto (Sin Etiqueta)
```
Usuario intenta escanear pieza
        ↓
    ❌ ERROR 400
        ↓
UI ROJA PARPADEANTE
"⚠️ Debe escanear una ETIQUETA antes de escanear piezas"
        ↓
Usuario escanea ETIQUETA
        ↓
    ✓ Advertencia desaparece
        ↓
Ahora puede escanear piezas normalmente
```

### ✅ Flujo Correcto (Con Etiqueta)
```
1️⃣ Escanear ETIQUETA del contenedor
        ↓
2️⃣ Escanear 4 piezas OK (verde)
        ↓
3️⃣ Etiqueta genera automáticamente
        ↓
4️⃣ Espera 2 segundos para mostrar
        ↓
5️⃣ Auto-reinicia
        ↓
Volver a paso 1️⃣ para próximo contenedor
```

---

## 📝 Archivo de Cambios

- `src/main.js`: Backend - Validación y variables
- `src/App.jsx`: Frontend - Componente de advertencia
- `src/App.css`: Estilos - Animación parpadeante

Todos los cambios mantienen compatibilidad con código existente.

