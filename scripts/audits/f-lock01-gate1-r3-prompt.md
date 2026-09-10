# F-LOCK-01 门一 R3 补证轮（R2 核验请求逐项出示）

R2 判 W2 NOT ADDRESSED（需含 vitest 摘要与 locks 输出的连续尾段）+新破坏1（get-protected-files.ps1 返回类型未出示）+N3 保留（lock 侧 dot-source 未出示）+新破坏2（Sort-Object Unique 疑删）+新破坏3（mjs 侧 baseline 未验）。逐项出示如下，请销项或升级。

## 出示一：scripts/get-protected-files.ps1 全文（销新破坏1/2——返回类型=FileInfo 数组；Sort-Object -Unique 在函数末行在场）

```powershell
﻿# get-protected-files.ps1 —— 受锁文件单一收集函数（受锁文件）
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
  $files += Get-ChildItem -Path $root -Recurse -File -Include *.test.ts, *.test.tsx |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\out\\|\\dist\\|\\coverage\\' }
  foreach ($cfg in @('docs/invariants.md', 'vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml',
      'playwright.config.ts', 'electron.vite.config.ts',
      'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json',
      'scripts/dup-constants.baseline.json')) {
    $p = Join-Path $root $cfg
    if (Test-Path $p) { $files += Get-Item $p }
  }
  $files += Get-ChildItem -Path (Join-Path $root 'scripts') -Recurse -File -Include *.mjs, *.ps1
  $files | Sort-Object -Property FullName -Unique
}

```

## 出示二：scripts/lock-protected.ps1 全文（销 N3 保留——lock 侧 dot-source 在场；$root 有 locksDir 消费点）

```powershell
﻿# lock-protected.ps1 —— 生成/应用受锁文件保护（受锁文件）
# 用法：
#   npm run locks:apply     解锁→重算 sha256→写 manifest→设只读
#   npm run locks:generate  仅重算 manifest（不设只读）
# 受锁集合由 scripts/get-protected-files.ps1 单一来源提供（lock/unlock 两脚本
# dot-source 共用，与 check-locks.mjs 跨语言对齐）；合法修改流程见 AGENTS.md（需 [locked-change] 尾注）
param([switch]$GenerateOnly)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# 受锁集合单一来源（F-LINT-03 异常项收敛，F-LOCK-01 落地）
. (Join-Path $PSScriptRoot 'get-protected-files.ps1')

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

```

## 出示三：scripts/check-locks.mjs protectedFiles() 函数全文（销新破坏3——mjs 侧 line 43 含 dup-constants.baseline.json）

```javascript
function protectedFiles() {
  const files = [
    ...walk(join(root, 'tests'), () => true),
    ...walk(join(root, 'src', 'shared'), () => true),
    ...walk(join(root, 'src', 'main', 'db', 'migrations'), () => true),
    ...walk(root, (p) => /\.test\.tsx?$/.test(p)),
    join(root, 'docs', 'invariants.md'),
    join(root, 'vitest.config.ts'),
    join(root, 'eslint.config.js'),
    join(root, '.github', 'workflows', 'ci.yml'),
    join(root, 'playwright.config.ts'),
    join(root, 'electron.vite.config.ts'),
    join(root, 'tsconfig.json'),
    join(root, 'tsconfig.node.json'),
    join(root, 'tsconfig.web.json'),
    // [F-LINT-02] baseline 棘轮防绕过（终裁 §3）：scripts/*.json 不在 walk 自动面，
    // 单文件显式登记——baseline 变更必经 [locked-change] 人类审查位
    join(root, 'scripts', 'dup-constants.baseline.json'),
    ...walk(join(root, 'scripts'), (p) => p.endsWith('.mjs') || p.endsWith('.ps1'))
  ].filter((p) => existsSync(p))
  return [...new Set(files)].sort()
}

```

## 出示四：verify 连续序证据（销 W2）——f-lock01-verify.raw.txt 全文 8221 行在档，回炉段=行 4109 分隔行之后。里程碑行号索引（行号单调递增=执行序证据）：

- 行 4114：`> npm run quality:check && npm run tickets:check && npm run locks:check && npm run lint && npm run typecheck && npm run test && npm run build`（全链命令原文——test 与 build 在 locks 之后串联）
- 行 4122-4127：quality:check 通过
- 行 4134-4138：tickets:check 通过
- 行 4143-4146：locks 检查通过：312 个受锁文件与 manifest 一致
- 行 8180：Test Files 160 passed (160)
- 行 8181：Tests 1562 passed (1562)
- 行 8195-8196：> synapse@0.1.0 build 启动
- 行 8221（末行）：exit=0

（中间 4146-8180 为 lint/typecheck/vitest 逐文件输出，原文连续在档可抽查。）

### 末 6 行原文（行 8216-8221）

```
[2m../../out/renderer/[22m[32mindex.html                          [39m[1m[2m    0.88 kB[22m[1m[22m
[2m../../out/renderer/[22m[32massets/pdf.worker.min-yatZIOMy.mjs  [39m[1m[2m1,375.84 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-CKQTWqTF.css           [39m[1m[2m   52.47 kB[22m[1m[22m
[2m../../out/renderer/[22m[36massets/index-Dl5SZpqr.js            [39m[1m[33m1,389.28 kB[39m[22m
[32m✓ built in 1.76s[39m
exit=0

```

输出：R2 各项（W2/新破坏1/新破坏2/新破坏3/N3 保留）逐条销项判定+是否仍有阻断。≤600 字。
