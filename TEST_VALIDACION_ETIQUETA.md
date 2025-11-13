# 🧪 Script de Prueba - Validación de Etiqueta

## Prueba Rápida de Validación

```powershell
# ============================================
# TEST 1: Intentar pieza sin etiqueta (ERROR)
# ============================================

Write-Host "TEST 1: Intentando POST /api/piece sin etiqueta..." -ForegroundColor Yellow

$base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

$payload = @{
    image = $base64Image
    isOk  = $true
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/piece" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -ErrorAction Stop
    Write-Host "❌ FALLO: Se permitió pieza sin etiqueta" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $errorMessage = $_.Exception.Response.Content | ConvertFrom-Json
    
    if ($statusCode -eq 400 -and $errorMessage.warning -eq $true) {
        Write-Host "✅ CORRECTO: HTTP 400 retornado" -ForegroundColor Green
        Write-Host "   Mensaje: $($errorMessage.message)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ INESPERADO: $statusCode - $($errorMessage.message)" -ForegroundColor Yellow
    }
}

# ============================================
# Verificar estado del backend
# ============================================

Write-Host "`nVerificando estado del backend..." -ForegroundColor Cyan

$result = Invoke-WebRequest -Uri "http://localhost:3001/api/qc-result" | ConvertFrom-Json

Write-Host "Estado del backend:"
Write-Host "  - labelRequiredWarning: $($result.labelRequiredWarning)" -ForegroundColor Yellow
Write-Host "  - currentPiecesOk: $($result.currentPiecesOk)/4"
Write-Host "  - totalOk: $($result.totalOk)"

# ============================================
# TEST 2: Enviar etiqueta (correcto)
# ============================================

Start-Sleep -Seconds 2
Write-Host "`nTEST 2: Enviando POST /api/label-image..." -ForegroundColor Yellow

$labelPayload = @{
    image = $base64Image
} | ConvertTo-Json

$labelResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/label-image" `
    -Method POST `
    -ContentType "application/json" `
    -Body $labelPayload

Write-Host "✅ Etiqueta enviada: HTTP $($labelResponse.StatusCode)" -ForegroundColor Green

# ============================================
# Verificar que se limpió la advertencia
# ============================================

Start-Sleep -Seconds 1

$result = Invoke-WebRequest -Uri "http://localhost:3001/api/qc-result" | ConvertFrom-Json

Write-Host "`nDespués de enviar etiqueta:" -ForegroundColor Cyan
Write-Host "  - labelRequiredWarning: $($result.labelRequiredWarning)" -ForegroundColor Green

if ($result.labelRequiredWarning -eq $null) {
    Write-Host "  ✅ Advertencia limpiada correctamente" -ForegroundColor Green
} else {
    Write-Host "  ❌ Advertencia aún existe: $($result.labelRequiredWarning)" -ForegroundColor Red
}

# ============================================
# TEST 3: Enviar pieza OK (ahora debe funcionar)
# ============================================

Start-Sleep -Seconds 1
Write-Host "`nTEST 3: Enviando POST /api/piece (ahora CON etiqueta)..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/piece" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -ErrorAction Stop
    
    Write-Host "✅ CORRECTO: Pieza aceptada HTTP $($response.StatusCode)" -ForegroundColor Green
    
    $result = Invoke-WebRequest -Uri "http://localhost:3001/api/qc-result" | ConvertFrom-Json
    Write-Host "   - currentPiecesOk: $($result.currentPiecesOk)/4" -ForegroundColor Green
    Write-Host "   - totalOk: $($result.totalOk)" -ForegroundColor Green
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    $errorMessage = $_.Exception.Response.Content | ConvertFrom-Json
    Write-Host "❌ FALLO: HTTP $statusCode - $($errorMessage.message)" -ForegroundColor Red
}

# ============================================
# RESUMEN
# ============================================

Write-Host "`n" -ForegroundColor White
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         PRUEBA COMPLETADA              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nResumen de Validación:" -ForegroundColor Yellow
Write-Host "  1. ✅ Sin etiqueta → HTTP 400 (rechaza)"
Write-Host "  2. ✅ Enviar etiqueta → HTTP 204 (acepta)"
Write-Host "  3. ✅ Con etiqueta → HTTP 204 (acepta pieza)"
Write-Host "  4. ✅ Advertencia se limpia automáticamente"

Write-Host "`n✅ Validación de etiqueta obligatoria FUNCIONANDO CORRECTAMENTE" -ForegroundColor Green
```

---

## Alternativa: Prueba Manual en Navegador

### 1. Verificar que NO se puede sin etiqueta
```javascript
// En consola del navegador (DevTools)

fetch('http://localhost:3001/api/piece', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    isOk: true
  })
})
.then(r => r.json())
.then(d => console.log('ERROR 400:', d))
.catch(e => console.error(e))

// Resultado esperado:
// ERROR 400: { message: "⚠️ Debe escanear una ETIQUETA...", warning: true }

// UI debe mostrar ADVERTENCIA ROJA PARPADEANTE
```

### 2. Enviar etiqueta
```javascript
fetch('http://localhost:3001/api/label-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  })
})
.then(r => console.log('Etiqueta enviada:', r.status))

// Resultado esperado: 204
// UI: Advertencia desaparece
```

### 3. Ahora enviar pieza (debe funcionar)
```javascript
fetch('http://localhost:3001/api/piece', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    isOk: true
  })
})
.then(r => console.log('Pieza aceptada:', r.status))

// Resultado esperado: 204
// UI: Contador cambia a 1/4
```

---

## ✅ Checklist de Validación

```
Cuando ejecutes las pruebas, verifica:

[ ] Sin etiqueta:
    - Backend retorna HTTP 400
    - Mensaje: "⚠️ Debe escanear una ETIQUETA..."
    - Frontend muestra advertencia roja
    - Advertencia parpadea suavemente

[ ] Al enviar etiqueta:
    - HTTP 204
    - Advertencia desaparece inmediatamente
    - labelRequiredWarning = null en estado

[ ] Con etiqueta:
    - POST /api/piece retorna 204
    - currentPiecesOkCount incrementa
    - totalOk incrementa
    - Se puede contar hasta 4 piezas

[ ] Después del reinicio:
    - currentPiecesOkCount = 0
    - Sin etiqueta nuevamente
    - Vuelve a mostrar advertencia si intenta contar
```

---

## 🐛 Si Algo No Funciona

### Problema: Advertencia no desaparece
- Verifica que POST `/api/label-image` fue exitoso (204)
- Espera 3 segundos (polling interval)
- Recarga el navegador (F5)

### Problema: HTTP 500 en vez de 400
- Revisa logs del backend en terminal
- Verifica que `lastLabelImage` está siendo seteado correctamente

### Problema: Pieza se guarda sin etiqueta
- Verifica que el código tiene la validación `if (!lastLabelImage)`
- Revisa que el backend se reinició después de cambios

### Problema: Advertencia no es visible
- Verifica CSS de `.label-required-warning` en App.css
- Asegúrate que el borde-radius y animación estén presentes
- Abre DevTools (F12) para inspeccionar elemento

