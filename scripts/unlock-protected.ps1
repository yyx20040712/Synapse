# unlock-protected.ps1 —— 解除受锁文件只读（人工操作入口）
# 用法：npm run locks:unlock
# 修改完成后必须：npm run locks:apply 重新锁定并更新 manifest，提交带 [locked-change]。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

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

$unlocked = 0
$files | Sort-Object -Property FullName -Unique | ForEach-Object {
  try { $_.IsReadOnly = $false; $unlocked++ } catch {}
}
Write-Host "已解锁 $unlocked 个文件。改完后运行 npm run locks:apply 重新锁定。"
