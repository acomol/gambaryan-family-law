# Публикация папки site/ на Cloudflare Pages — версия для PowerShell (Windows).
#
# Запуск из корня репозитория:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-pages.ps1
#
# Скрипт сам находит, в каком аккаунте лежит проект, и не создаёт дубликат
# при неверном аккаунте. Подробности: docs\DEPLOY.md

param(
  [string]$TokenFile = "C:\Users\alext\credentials\cf-adfix-token.txt",
  [string]$Project   = "gambarian-landing",
  [string]$Dir       = "site"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path "$Dir\index.html")) {
  Write-Host "Ошибка: $Dir\index.html не найден. Запускать из корня репозитория." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $TokenFile)) {
  Write-Host "Ошибка: файл с токеном не найден: $TokenFile" -ForegroundColor Red
  Write-Host "Посмотрите, что есть: Get-ChildItem C:\Users\alext\credentials"
  exit 1
}

# Токен читаем из файла. Переменную окружения CLOUDFLARE_API_TOKEN НЕ берём:
# на этой машине она указывает на аккаунт отчётов, а не лендингов.
$token = (Get-Content $TokenFile -Raw).Trim()

# Токен должен быть чистым ASCII: был случай, когда он копировался при
# русской раскладке и содержал кириллические двойники латинских букв.
$nonAscii = ($token.ToCharArray() | Where-Object { [int]$_ -gt 127 }).Count
if ($nonAscii -gt 0) {
  Write-Host "Ошибка: в токене $nonAscii не-ASCII символов (похоже, скопирован в русской раскладке)." -ForegroundColor Red
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
  "лендинги (alex@adfix.co.il)"       = "4799e9f76c607e036c430a148d06a80b"
  "отчёты (alex@digitalhook.co.il)"   = "b2ca16eaaad2ec903cb8da6798a165bc"
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
  Write-Host "НЕ создаю его вслепую: при неверном аккаунте появится дубликат без привязки к домену."
  Write-Host "Проверьте имя проекта в панели Cloudflare или возьмите токен другого аккаунта."
  exit 1
}
Write-Host "   найден в аккаунте $accountId" -ForegroundColor Green

# Продакшн-ветку спрашиваем у API, а не угадываем. Без явного --branch
# wrangler берёт имя текущей git-ветки: с рабочей ветки это создало бы
# ПРЕВЬЮ-деплой, а боевой адрес остался бы со старой сборкой — тихо и
# без единой ошибки.
$proj = Invoke-RestMethod "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$Project" -Headers $headers
$prodBranch = $proj.result.production_branch
Write-Host "   продакшн-ветка проекта: $prodBranch"

Write-Host "3. Публикую $Dir в продакшн ..." -ForegroundColor Cyan
$env:CLOUDFLARE_API_TOKEN  = $token
$env:CLOUDFLARE_ACCOUNT_ID = $accountId
npx --yes wrangler@latest pages deploy $Dir --project-name=$Project --branch=$prodBranch --commit-dirty=true
if ($LASTEXITCODE -ne 0) {
  Write-Host "wrangler завершился с кодом $LASTEXITCODE — публикация не выполнена." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "4. Проверяю живой адрес (два запроса подряд — эдж мог отдать старое)..." -ForegroundColor Cyan
Start-Sleep -Seconds 6
$url = "https://$Project.pages.dev/"
$checks = @(
  @{ Text = "Более 30 лет практики"; Want = $true;  Label = "цифра опыта — 30" },
  @{ Text = "Более 24 лет";          Want = $false; Label = "старой цифры 24 нет" },
  @{ Text = "onest-normal";          Want = $true;  Label = "шрифт Onest подключён" },
  @{ Text = "hero-duo-mob";          Want = $true;  Label = "мобильный кроп hero" },
  @{ Text = "alexander-card-v2";     Want = $true;  Label = "новый портрет Александра" },
  @{ Text = "fact-card";             Want = $true;  Label = "карточки фактов на месте" }
)
$failed = 0
for ($pass = 1; $pass -le 2; $pass++) {
  $page = (Invoke-WebRequest $url -UseBasicParsing).Content
  if ($pass -eq 2) {
    foreach ($c in $checks) {
      $found = $page.Contains($c.Text)
      if ($found -eq $c.Want) { Write-Host "   OK      $($c.Label)" }
      else { Write-Host "   ПРОВАЛ  $($c.Label)" -ForegroundColor Red; $failed++ }
    }
  }
  Start-Sleep -Seconds 3
}

Write-Host ""
if ($failed -eq 0) { Write-Host "Свежая версия на живом адресе: $url" -ForegroundColor Green }
else { Write-Host "Часть проверок не прошла — подождите минуту и откройте $url в браузере." -ForegroundColor Yellow }
