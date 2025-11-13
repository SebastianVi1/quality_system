# Script de Prueba Completa - QC Dashboard con Estadísticas

## Requisitos Previos
- Aplicación ejecutándose: `npm start`
- Backend en puerto 3001
- Frontend en puerto 3000

## Prueba 1: Ciclo Completo con OK

```powershell
# Enviar 4 piezas OK
for ($i = 1; $i -le 4; $i++) {
    $base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    $payload = @{
        image = $base64Image
        isOk  = $true
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "http://localhost:3001/api/piece" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload | Out-Null
    
    Write-Host "✅ Pieza OK #$i enviada"
    Start-Sleep -Seconds 1
}

# Verificar estado después de 4 piezas OK
$result = Invoke-WebRequest -Uri "http://localhost:3001/api/qc-result" | ConvertFrom-Json
Write-Host "Estado actual:" 
Write-Host "  - currentPiecesOk: $($result.currentPiecesOk)/4"
Write-Host "  - totalOk: $($result.totalOk)"
Write-Host "  - totalLabels: $($result.totalLabels)"
Write-Host "  - printedLabelPath: $($result.printedLabelPath)"

# Esperar a que se muestre la etiqueta y se reinicie automáticamente
Write-Host "Esperando 3 segundos para reinicio automático..."
Start-Sleep -Seconds 3

$result = Invoke-WebRequest -Uri "http://localhost:3001/api/qc-result" | ConvertFrom-Json
Write-Host "Después del reinicio:"
Write-Host "  - currentPiecesOk: $($result.currentPiecesOk)/4"
Write-Host "  - printedLabelPath: $($result.printedLabelPath)"
```

## Prueba 2: Mezcla de OK y ERROR

```powershell
# Enviar 2 OK, 1 ERROR, 1 OK, 1 ERROR
$sequence = @(
    @{ isOk = $true; desc = "OK" },
    @{ isOk = $true; desc = "OK" },
    @{ isOk = $false; desc = "ERROR" },
    @{ isOk = $true; desc = "OK" },
    @{ isOk = $false; desc = "ERROR" }
)

foreach ($piece in $sequence) {
    $base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    $payload = @{
        image = $base64Image
        isOk  = $piece.isOk
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "http://localhost:3001/api/piece" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload | Out-Null
    
    $result = Invoke-WebRequest -Uri "http://localhost:3001/api/qc-result" | ConvertFrom-Json
    
    Write-Host "$($piece.desc): currentPiecesOk=$($result.currentPiecesOk), totalOk=$($result.totalOk), totalRejected=$($result.totalRejected)"
    Start-Sleep -Seconds 1
}
```

## Prueba 3: Verificar Estadísticas Acumuladas

```powershell
# Después de ejecutar múltiples ciclos, verificar que se acumulan correctamente

$result = Invoke-WebRequest -Uri "http://localhost:3001/api/qc-result" | ConvertFrom-Json

Write-Host "📊 Estadísticas Finales:"
Write-Host "  ✅ Total Aceptadas: $($result.totalOk)"
Write-Host "  ❌ Total Rechazadas: $($result.totalRejected)"
Write-Host "  🏷️  Total Etiquetas: $($result.totalLabels)"
Write-Host ""
Write-Host "Estado Actual del Ciclo:"
Write-Host "  - Piezas OK Actuales: $($result.currentPiecesOk)/4"
Write-Host "  - Etiqueta Impresa: $($result.printedLabelPath)"
```

## Prueba 4: Monitoreo en Tiempo Real

```powershell
# Ver actualizaciones cada 3 segundos durante 30 segundos

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

while ($stopwatch.Elapsed.TotalSeconds -lt 30) {
    Clear-Host
    
    $result = Invoke-WebRequest -Uri "http://localhost:3001/api/qc-result" | ConvertFrom-Json
    
    Write-Host "=== QC Dashboard Monitor ==="
    Write-Host "Tiempo: $([Math]::Round($stopwatch.Elapsed.TotalSeconds, 1))s"
    Write-Host ""
    Write-Host "📍 Estado Actual del Ciclo:"
    Write-Host "   Piezas OK: $($result.currentPiecesOk)/4"
    Write-Host "   Última pieza: $(if ($result.isOk -eq $null) { 'Ninguna' } elseif ($result.isOk) { '✅ OK' } else { '❌ ERROR' })"
    Write-Host ""
    Write-Host "📊 Estadísticas Acumuladas:"
    Write-Host "   Total Aceptadas: $($result.totalOk)"
    Write-Host "   Total Rechazadas: $($result.totalRejected)"
    Write-Host "   Total Etiquetas: $($result.totalLabels)"
    Write-Host ""
    if ($result.lastPrintAt) {
        Write-Host "🏷️  Última etiqueta: $($result.lastPrintAt)"
    }
    
    Start-Sleep -Seconds 3
}
```

## Casos de Prueba Específicos

### ✅ Caso 1: 4 OK → Reinicio Automático
- Enviar 4 piezas OK consecutivas
- Verificar: currentPiecesOk = 4, totalOk = 4, totalLabels = 1
- Esperar 3 segundos
- Verificar: currentPiecesOk = 0, printedLabelPath = null

### ✅ Caso 2: Rechazos No Afectan Contador
- Enviar 2 OK
- Enviar 1 ERROR
- Verificar: currentPiecesOk = 2, totalRejected = 1
- Enviar 2 OK más
- Verificar: currentPiecesOk = 4, totalOk = 4, totalRejected = 1

### ✅ Caso 3: Múltiples Ciclos
- Ejecutar 2 ciclos de 4 OK cada uno
- Verificar: totalOk = 8, totalLabels = 2

### ✅ Caso 4: Solo Rechazos
- Enviar 5 ERROR consecutivos
- Verificar: currentPiecesOk = 0, totalRejected = 5, totalLabels = 0

