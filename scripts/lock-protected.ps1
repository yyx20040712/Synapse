# lock-protected.ps1 —— 生成/应用受锁文件保护（受锁文件）
# 用法：
#   npm run locks:apply     解锁→重算 sha256→写 manifest→设只读
#   npm run locks:generate  仅重算 manifest（不设只读）
# 受锁集合与 scripts/check-locks.mjs 一致；合法修改流程见 AGENTS.md（需 [locked-change] 尾注）
param([switch]$GenerateOnly)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Get-ProtectedFiles {
  $files = @()
  $files += Get-ChildItem -Path (Join-Path $root 'tests') -Recurse -File
  $files += Get-ChildItem -Path (Join-Path $root 'src/shared') -Recurse -File
  $files += Get-ChildItem -Path (Join-Path $root 'src/main/db/migrations') -Recurse -File
  $files += Get-ChildItem -Path $root -Recurse -File -Include *.test.ts, *.test.tsx |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\out\\|\\dist\\|\\coverage\\' }
  foreach ($cfg in @('vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml')) {
    $p = Join-Path $root $cfg
    if (Test-Path $p) { $files += Get-Item $p }
  }
  $files += Get-ChildItem -Path (Join-Path $root 'scripts') -Recurse -File -Include *.mjs, *.ps1
  $files | Sort-Object -Property FullName -Unique
}

# 1) 先全部解锁（幂等 + 允许重新锁定更新后的内容）
Get-ProtectedFiles | ForEach-Object { try { $_.IsReadOnly = $false } catch {} }

# 2) 重算 manifest
$entries = @()
foreach ($f in (Get-ProtectedFiles)) {
  $rel = $f.FullName.Substring($root.Length + 1) -replace '\\', '/'
  $hash = (Get-FileHash -Path $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $entries += [ordered]@{ path = $rel; sha256 = $hash }
}
$manifest = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  files       = $entries
}
$locksDir = Join-Path $root 'locks'
New-Item -ItemType Directory -Force -Path $locksDir | Out-Null
$manifestJson = $manifest | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $locksDir 'manifest.json'), $manifestJson, [Text.UTF8Encoding]::new($false))

# 3) 设只读（GenerateOnly 跳过）
if (-not $GenerateOnly) {
  $locked = 0
  Get-ProtectedFiles | ForEach-Object { $_.IsReadOnly = $true; $locked++ }
  Write-Host "已锁定 $locked 个文件（只读）。manifest 记录 $($entries.Count) 条。"
} else {
  Write-Host "仅生成 manifest（$($entries.Count) 条），未设只读。"
}
Write-Host '提交 manifest 变更时，提交信息必须带 [locked-change] 尾注。'
