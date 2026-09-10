# unlock-protected.ps1 —— 解除受锁文件只读（人工操作入口）
# 用法：npm run locks:unlock
# 修改完成后必须：npm run locks:apply 重新锁定并更新 manifest，提交带 [locked-change]。
$ErrorActionPreference = 'Stop'

# 受锁集合单一来源（F-LINT-03 异常项收敛，F-LOCK-01 落地）：
# scripts/get-protected-files.ps1 提供 Get-ProtectedFiles（含 dup-constants.baseline.json）
. (Join-Path $PSScriptRoot 'get-protected-files.ps1')

$unlocked = 0
Get-ProtectedFiles | ForEach-Object {
  try { $_.IsReadOnly = $false; $unlocked++ } catch {}
}
Write-Host "已解锁 $unlocked 个文件。改完后运行 npm run locks:apply 重新锁定。"
