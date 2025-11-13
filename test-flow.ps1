# Test flow para QC Dashboard
# Este script prueba el flujo completo

$API_BASE = "http://localhost:3001/api"

# Imagen de prueba pequeña (1x1 pixel PNG en base64)
$testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

Write-Host "=== TEST FLUJO QC DASHBOARD ===" -ForegroundColor Green

# 1. Verificar salud del servidor
Write-Host "`n[1] Verificando servidor..." -ForegroundColor Yellow
try {
  $health = Invoke-WebRequest -Uri "$API_BASE/health" -Method Get -ErrorAction Stop
  Write-Host "✅ Servidor OK: $($health.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "❌ Servidor NO disponible" -ForegroundColor Red
  exit 1
}

# 2. Enviar etiqueta
Write-Host "`n[2] Enviando etiqueta..." -ForegroundColor Yellow
try {
  $body = @{image=$testImageBase64} | ConvertTo-Json
  $response = Invoke-WebRequest -Uri "$API_BASE/label-image" -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop
  Write-Host "✅ Etiqueta enviada: $($response.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "❌ Error enviando etiqueta: $_" -ForegroundColor Red
}

# 3. Enviar 4 piezas OK
Write-Host "`n[3] Enviando 4 piezas OK..." -ForegroundColor Yellow
for ($i = 1; $i -le 4; $i++) {
  try {
    $body = @{image=$testImageBase64; isOk=$true} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$API_BASE/piece" -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop
    Write-Host "  ✅ Pieza $i OK enviada" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
  } catch {
    Write-Host "  ❌ Error en pieza $i: $_" -ForegroundColor Red
  }
}

# 4. Verificar estado final
Write-Host "`n[4] Verificando estado final..." -ForegroundColor Yellow
try {
  $state = Invoke-WebRequest -Uri "$API_BASE/qc-result" -Method Get -ErrorAction Stop
  $data = $state.Content | ConvertFrom-Json
  
  Write-Host "`nEstado actual:" -ForegroundColor Cyan
  Write-Host "  - isOk: $($data.isOk)"
  Write-Host "  - currentPiecesOk: $($data.currentPiecesOk)"
  Write-Host "  - timestamp: $($data.timestamp)"
  Write-Host "  - printedLabelPath: $($data.printedLabelPath)"
  Write-Host "  - lastPrintAt: $($data.lastPrintAt)"
  Write-Host "  - currentPieceImagePath: $($data.currentPieceImagePath)"
  
  if ($data.printedLabelPath) {
    Write-Host "`n✅ ETIQUETA GENERADA CORRECTAMENTE" -ForegroundColor Green
  } else {
    Write-Host "`n⚠️ Etiqueta no se generó (verifica que currentPiecesOk = 4)" -ForegroundColor Yellow
  }
  
} catch {
  Write-Host "❌ Error obteniendo estado: $_" -ForegroundColor Red
}

# 5. Enviar una pieza rechazada
Write-Host "`n[5] Enviando pieza RECHAZADA..." -ForegroundColor Yellow
try {
  $body = @{image=$testImageBase64; isOk=$false} | ConvertTo-Json
  $response = Invoke-WebRequest -Uri "$API_BASE/piece" -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop
  Write-Host "✅ Pieza rechazada enviada" -ForegroundColor Green
  
  # Verificar que contador no cambió
  $state = Invoke-WebRequest -Uri "$API_BASE/qc-result" -Method Get -ErrorAction Stop
  $data = $state.Content | ConvertFrom-Json
  Write-Host "  - currentPiecesOk después de rechazo: $($data.currentPiecesOk) (debe ser 0 si etiqueta fue generada)" -ForegroundColor Cyan
  
} catch {
  Write-Host "❌ Error con pieza rechazada: $_" -ForegroundColor Red
}

Write-Host "`n=== TEST COMPLETADO ===" -ForegroundColor Green
