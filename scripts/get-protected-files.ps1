# get-protected-files.ps1 —— 受锁文件单一收集函数（受锁文件）
# lock-protected.ps1 / unlock-protected.ps1 两脚本 dot-source 共用本件。
# 受锁集合与 scripts/check-locks.mjs protectedFiles() 跨语言对齐：
# 修改任一侧需同步另一侧，并走 [locked-change] 流程（见 AGENTS.md）。
# 由来（F-LOCK-01）：unlock/lock 两脚本受锁集合不对称——unlock 收集面漏
# scripts/dup-constants.baseline.json；三处独立定义漂移后收敛为单一来源。
$root = Split-Path -Parent $PSScriptRoot

function Get-ProtectedFiles {
  $files = @()
  $files += Get-ChildItem -Path (Join-Path $root 'tests') -Recurse -File
  $files += Get-ChildItem -Path (Join-Path $root 'src/shared') -Recurse -File
  $files += Get-ChildItem -Path (Join-Path $root 'src/main/db/migrations') -Recurse -File
  # [T3-U1] renderer/public 静态面整目录入锁（theme-boot.js 首帧注入脚本——
  # FOUC 防线件；与 check-locks.mjs protectedFiles() 对齐；目录暂缺零项）
  $publicDir = Join-Path $root 'src/renderer/public'
  if (Test-Path $publicDir) { $files += Get-ChildItem -Path $publicDir -Recurse -File }
  $files += Get-ChildItem -Path $root -Recurse -File -Include *.test.ts, *.test.tsx |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\out\\|\\dist\\|\\coverage\\' }
  foreach ($cfg in @('docs/invariants.md', 'vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml',
      'playwright.config.ts', 'electron.vite.config.ts',
      'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json',
      'scripts/dup-constants.baseline.json',
      'scripts/test-surface.baseline.json',
      'scripts/test-surface.exemptions.json',
      'tickets/archive/README.md',
      'docs/defense-lifecycle.md',
      'src/renderer/app/StatusBar.tsx')) { # [T3-U1] 状态条哑件单件入锁（自动保存槽真文本契约面）
    $p = Join-Path $root $cfg
    if (Test-Path $p) { $files += Get-Item $p }
  }
  $files += Get-ChildItem -Path (Join-Path $root 'scripts') -Recurse -File -Include *.mjs, *.ps1
  $files | Sort-Object -Property FullName -Unique
}
