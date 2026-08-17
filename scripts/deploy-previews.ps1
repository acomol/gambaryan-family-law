# Публикация ВСЕХ клиентских Preview — версия для PowerShell (Windows).
# Боевой адрес не трогает: у каждого Preview свой branch alias.
#
# Запуск из корня репозитория:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-previews.ps1
#
# Один Preview:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-previews.ps1 -Only final-dev3
#
# Соглашения те же, что в deploy-pages.ps1: токен из файла (переменная
# CLOUDFLARE_API_TOKEN на этой машине указывает на аккаунт отчётов, не
# лендингов), проверка на ASCII, поиск нужного аккаунта. Подробности:
# docs\DEPLOY.md

param(
  [string]$TokenFile = "C:\Users\alext\credentials\cf-adfix-token.txt",
  [string]$Project   = "gambarian-landing",
  [string]$Only      = ""
)

$ErrorActionPreference = "Stop"

$mapPath = "scripts\client-preview-map.json"
if (-not (Test-Path $mapPath)) {
  Write-Host "Ошибка: $mapPath не найден. Запускать из корня репозитория." -ForegroundColor Red
  Write-Host "Найти репозиторий:  Get-ChildItem -Path C:\ -Filter gambaryan-family-law -Recurse -Directory -ErrorAction SilentlyContinue | Select-Object -First 5 FullName"
  exit 1
}
if (-not (Test-Path $TokenFile)) {
  Write-Host "Ошибка: файл с токеном не найден: $TokenFile" -ForegroundColor Red
  Write-Host "Посмотрите, что есть: Get-ChildItem C:\Users\alext\credentials"
  exit 1
}

$map      = Get-Content $mapPath -Raw | ConvertFrom-Json
$wrangler = "wrangler@$($map.wrangler_version)"
$previews = $map.previews
if ($Only) {
  $previews = @($previews | Where-Object { $_.branch -eq $Only })
  if ($previews.Count -eq 0) {
    Write-Host "Неизвестный alias '$Only'. Известные: $(($map.previews | ForEach-Object { $_.branch }) -join ', ')" -ForegroundColor Red
    exit 1
  }
}

# Сборки обязаны существовать: build\ не в git, пустой каталог уехал бы на
# живой адрес как пустой сайт.
$missing = @()
foreach ($p in $previews) {
  $index = Join-Path $p.directory "index.html"
  if (-not (Test-Path $index)) { $missing += "$($p.branch) -> $($p.directory)" }
}
if ($missing.Count -gt 0) {
  Write-Host "Не собраны варианты:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "   $_" }
  Write-Host ""
  Write-Host "Сначала собрать:"
  Write-Host "  python -B scripts\build-preview.py site/gambarian-standalone.html --standalone"
  Write-Host "  python -B scripts\build-hero-variants.py"
  Write-Host "  python -B scripts\build-font-variants.py"
  Write-Host "  python -B scripts\build-action-bar.py"
  Write-Host "  python -B scripts\build-review-numbered.py"
  exit 1
}

$token = (Get-Content $TokenFile -Raw).Trim()
$nonAscii = ($token.ToCharArray() | Where-Object { [int]$_ -gt 127 }).Count
if ($nonAscii -gt 0) {
  Write-Host "Ошибка: в токене $nonAscii не-ASCII символов (скопирован в русской раскладке)." -ForegroundColor Red
  exit 1
}
$headers = @{ Authorization = "Bearer $token" }

Write-Host "1. Проверяю токен..." -ForegroundColor Cyan
$verify = Invoke-RestMethod "https://api.cloudflare.com/client/v4/user/tokens/verify" -Headers $headers
Write-Host "   статус: $($verify.result.status)"
if ($verify.result.status -ne "active") {
  Write-Host "   Токен неактивен — нужен новый." -ForegroundColor Red
  exit 1
}

Write-Host "2. Ищу, в каком аккаунте лежит проект '$Project'..." -ForegroundColor Cyan
$accounts = [ordered]@{
  "лендинги (alex@adfix.co.il)"     = "4799e9f76c607e036c430a148d06a80b"
  "отчёты (alex@digitalhook.co.il)" = "b2ca16eaaad2ec903cb8da6798a165bc"
}
$accountId = $null
foreach ($a in $accounts.GetEnumerator()) {
  try {
    $r = Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$($a.Value)/pages/projects" -Headers $headers
    $names = @($r.result | ForEach-Object { $_.name })
    Write-Host "   $($a.Key): $($names -join ', ')"
    if ($names -contains $Project) { $accountId = $a.Value }
  } catch {
    Write-Host "   $($a.Key): этим токеном доступа нет"
  }
}
if (-not $accountId) {
  Write-Host ""
  Write-Host "Проект '$Project' не найден ни в одном доступном аккаунте." -ForegroundColor Red
  Write-Host "НЕ создаю вслепую: при неверном аккаунте появится дубликат без привязки к домену."
  exit 1
}
Write-Host "   найден в аккаунте $accountId" -ForegroundColor Green

$env:CLOUDFLARE_API_TOKEN  = $token
$env:CLOUDFLARE_ACCOUNT_ID = $accountId

Write-Host ""
Write-Host "3. Публикую $($previews.Count) Preview..." -ForegroundColor Cyan
$failed = @()
foreach ($p in $previews) {
  Write-Host ""
  Write-Host "=== $($p.branch)  <-  $($p.directory)" -ForegroundColor Cyan
  # --branch обязателен: без него wrangler возьмёт имя текущей git-ветки и
  # создаст Preview с чужим alias.
  npx --yes $wrangler pages deploy $p.directory `
    --project-name=$Project --branch=$p.branch --commit-dirty=true
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   wrangler завершился с кодом $LASTEXITCODE" -ForegroundColor Red
    $failed += $p.branch
  }
}

Write-Host ""
Write-Host "Опубликовано: $($previews.Count - $failed.Count); с ошибкой: $($failed.Count)"
if ($failed.Count -gt 0) { $failed | ForEach-Object { Write-Host "   ПРОВАЛ  $_" -ForegroundColor Red } }

# Exit code wrangler за доказательство не принимается: на части
# предупреждений он выходит с нулём (docs\FINAL-QA-CHECKLIST.md, OPEN).
Write-Host ""
Write-Host "4. Readback живых адресов..." -ForegroundColor Cyan
Start-Sleep -Seconds 8
python -B scripts\verify-live-previews.py
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Readback не сошёлся. Если прошло меньше минуты — эдж мог отдать старое, повторите:" -ForegroundColor Yellow
  Write-Host "   python -B scripts\verify-live-previews.py"
  exit 1
}
