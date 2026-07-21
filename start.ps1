$env:NODE_ENV='development'
$env:JWT_SECRET='dev-secret-2026'
$env:PORT='8081'
$env:CORS_ORIGIN='http://localhost:8081'
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " TikToolStream - Servidor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Puerto: 8081"
Write-Host " Login:   admin / Admin123!"
Write-Host ""
Write-Host " http://localhost:8081"
Write-Host " http://localhost:8081/app/dashboard"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
node server-new.js
