<#
    Codex verification loop runner.
    Protocol: docs/CODEX-VERIFICATION-LOOP.md

    Usage:
      powershell -NoProfile -File scripts/codex-loop.ps1 -Lens executable -Round 1
      powershell -NoProfile -File scripts/codex-loop.ps1 -Lens meta -Round 1 -Target "docs/reviews/codex-loop/2026-09-07-r1-*.md"

    Read-only: codex runs with --sandbox read-only and publishes nothing.

    This file is ASCII-only on purpose. Windows PowerShell 5.1 reads scripts in the
    system ANSI codepage, so Cyrillic inside the script breaks the parser before the
    first command runs. All Russian text lives in docs/codex-lenses/*.md and is read
    with an explicit -Encoding utf8.

    The task is handed to Codex as a FILE, not through stdin: piping Cyrillic through
    PowerShell into node turns it into "????" (measured 2026-09-07).
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('source', 'code', 'gate', 'chain', 'executable', 'meta')]
    [string]$Lens,

    [int]$Round = 1,

    [string]$Target = 'docs/tasks/codex',

    [string]$Codex = "$env:APPDATA\npm\codex.ps1",

    [string]$Effort = 'high'
)

$ErrorActionPreference = 'Stop'

$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

$repo = (git rev-parse --show-toplevel).Trim()
Set-Location $repo

$briefPath = Join-Path $repo "docs/codex-lenses/$Lens.md"
$headerPath = Join-Path $repo 'docs/codex-lenses/_task-header.md'
if (-not (Test-Path $briefPath)) { throw "lens brief not found: $briefPath" }
if (-not (Test-Path $headerPath)) { throw "task header not found: $headerPath" }
if (-not (Test-Path $Codex)) { throw "Codex CLI not found: $Codex" }

$sha = (git rev-parse --short HEAD).Trim()
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$porcelain = git status --porcelain
if ($porcelain) { $treeState = 'DIRTY (uncommitted changes are part of the audited object)' }
else { $treeState = 'clean' }
$date = Get-Date -Format 'yyyy-MM-dd'

$outDir = Join-Path $repo 'docs/reviews/codex-loop'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stem = "$date-r$Round-$Lens"
$outFile = Join-Path $outDir "$stem.md"
$logFile = Join-Path $outDir "$stem.log"
$taskFile = Join-Path $outDir "$stem.task.md"

$header = (Get-Content -Raw -Encoding utf8 $headerPath).
    Replace('{BRANCH}', $branch).
    Replace('{SHA}', $sha).
    Replace('{TREE}', $treeState).
    Replace('{ROUND}', "$Round").
    Replace('{TARGET}', $Target)

$brief = Get-Content -Raw -Encoding utf8 $briefPath
[System.IO.File]::WriteAllText($taskFile, $header + $brief, $utf8)

# stdin instruction is ASCII on purpose: it survives any pipeline re-encoding.
$stdin = "Read the file $taskFile as UTF-8 and follow it exactly as your task. Answer in Russian, in the format that file specifies."

Write-Host "lens $Lens, round $Round, tree $sha"
Write-Host "task: $taskFile"

# Codex writes progress to stderr. With ErrorActionPreference=Stop a redirected
# stderr record becomes a terminating error, so relax it just for this call.
$previousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$stdin | & $Codex exec --skip-git-repo-check --sandbox read-only `
    -c "model_reasoning_effort=$Effort" `
    --output-last-message $outFile - 2>&1 |
    Out-File -FilePath $logFile -Encoding utf8
$codexExit = $LASTEXITCODE
$ErrorActionPreference = $previousPreference

if ($codexExit -ne 0) { throw "codex exited with $codexExit (see $logFile)" }
if (-not (Test-Path $outFile)) { throw "codex wrote no verdict: $outFile (see $logFile)" }

$verdict = Get-Content -Raw -Encoding utf8 $outFile
if ($verdict -match '\?\?\?\?') { throw "verdict contains ???? - Cyrillic was lost in transit: $outFile" }
if ($verdict.Trim().Length -lt 200) { throw "verdict suspiciously short ($($verdict.Trim().Length) chars): $outFile" }

Write-Host "verdict: $outFile"
Write-Host "next: reproduce every finding's command and mark it confirmed or rejected (docs/CODEX-VERIFICATION-LOOP.md)"
