# PortfolioPro Studio — Local Dev Setup (Windows)
# รันจาก root โปรเจกต: .\scripts\setup-local-dev.ps1

param(
    [string]$DbPassword,
    [string]$DbPort = "5432",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [string]$DbName = "portfoliopro"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Psql15 = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
$Psql17 = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$GoBin = "C:\Program Files\Go\bin\go.exe"

function Find-Psql {
    if ($DbPort -eq "5433" -and (Test-Path $Psql17)) { return $Psql17 }
    if (Test-Path $Psql15) { return $Psql15 }
    if (Test-Path $Psql17) { return $Psql17 }
    throw "ไม่พบ psql — ติดตั้ง PostgreSQL ก่อน"
}

if (-not $DbPassword) {
    $secure = Read-Host "ใส่รหัสผ่าน PostgreSQL ของ user '$DbUser'" -AsSecureString
    $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}

$psql = Find-Psql
$env:PGPASSWORD = $DbPassword

Write-Host ">> สร้าง database '$DbName' (port $DbPort)..." -ForegroundColor Cyan
& $psql -h $DbHost -p $DbPort -U $DbUser -f "$PSScriptRoot\init-db.sql"
if ($LASTEXITCODE -ne 0) {
    throw "สร้าง database ไม่สำเร็จ — ตรวจรอบรหัสผ่านและ port (5432=PG15, 5433=PG17)"
}

$jwt = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
$envContent = @"
JWT_SECRET=$jwt
PORT=8080

DB_HOST=$DbHost
DB_PORT=$DbPort
DB_USER=$DbUser
DB_PASSWORD=$DbPassword
DB_NAME=$DbName
DB_SSLMODE=disable
"@

$envPath = Join-Path $Root "backend\.env"
Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host ">> สร้าง backend\.env แล้ว" -ForegroundColor Green

if (-not (Test-Path $GoBin)) {
    Write-Host ">> ไม่พบ Go — เปิด PowerShell ใหม่แล้วรัน: cd backend; go run main.go" -ForegroundColor Yellow
    exit 0
}

Write-Host ">> ดาวน์โหลด Go dependencies..." -ForegroundColor Cyan
Push-Location (Join-Path $Root "backend")
& $GoBin mod download
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "go mod download ล้มเหลว" }

Write-Host ">> รัน API ที่ http://localhost:8080 (Ctrl+C เพื่อหยุด)" -ForegroundColor Green
& $GoBin run main.go
Pop-Location
