# F-LOCK-01 门一 R2 定点复核（回炉处置核验）

你一审出 B=0/W=2/N=5 放行附条件。回炉处置如下，逐条核验 ADDRESSED/NOT ADDRESSED+新破坏扫描。

主控申明：实现者子代理本环境不可续命，W1/N3 一行级改动=主控亲改（先例 F-CSS-03 主控 [locked-change] 亲改；受锁流程 unlock→改→generate+apply 全程在档）。

## W1 处置：unlock-protected.ps1 删死变量 $root（当前 diff 全文）

```diff
diff --git a/scripts/check-locks.mjs b/scripts/check-locks.mjs
index 1156d359e8..e29313aa82 100644
--- a/scripts/check-locks.mjs
+++ b/scripts/check-locks.mjs
@@ -22,7 +22,7 @@ function walk(dir, filter, acc = []) {
   return acc
 }
 
-/** 受锁集合（与 lock-protected.ps1 保持一致——修改需 [locked-change]） */
+/** 受锁集合（与 scripts/get-protected-files.ps1——lock/unlock 两脚本 dot-source 共用的收集函数——保持跨语言一致；修改需 [locked-change]） */
 function protectedFiles() {
   const files = [
     ...walk(join(root, 'tests'), () => true),
diff --git a/scripts/unlock-protected.ps1 b/scripts/unlock-protected.ps1
index 3cfa3a2c1b..c4b6d38e4a 100644
--- a/scripts/unlock-protected.ps1
+++ b/scripts/unlock-protected.ps1
@@ -2,24 +2,13 @@
 # 用法：npm run locks:unlock
 # 修改完成后必须：npm run locks:apply 重新锁定并更新 manifest，提交带 [locked-change]。
 $ErrorActionPreference = 'Stop'
-$root = Split-Path -Parent $PSScriptRoot
 
-$files = @()
-$files += Get-ChildItem -Path (Join-Path $root 'tests') -Recurse -File
-$files += Get-ChildItem -Path (Join-Path $root 'src/shared') -Recurse -File
-$files += Get-ChildItem -Path (Join-Path $root 'src/main/db/migrations') -Recurse -File
-$files += Get-ChildItem -Path $root -Recurse -File -Include *.test.ts, *.test.tsx |
-  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\out\\|\\dist\\|\\coverage\\' }
-foreach ($cfg in @('docs/invariants.md', 'vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml',
-    'playwright.config.ts', 'electron.vite.config.ts',
-    'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json')) {
-  $p = Join-Path $root $cfg
-  if (Test-Path $p) { $files += Get-Item $p }
-}
-$files += Get-ChildItem -Path (Join-Path $root 'scripts') -Recurse -File -Include *.mjs, *.ps1
+# 受锁集合单一来源（F-LINT-03 异常项收敛，F-LOCK-01 落地）：
+# scripts/get-protected-files.ps1 提供 Get-ProtectedFiles（含 dup-constants.baseline.json）
+. (Join-Path $PSScriptRoot 'get-protected-files.ps1')
 
 $unlocked = 0
-$files | Sort-Object -Property FullName -Unique | ForEach-Object {
+Get-ProtectedFiles | ForEach-Object {
   try { $_.IsReadOnly = $false; $unlocked++ } catch {}
 }
 Write-Host "已解锁 $unlocked 个文件。改完后运行 npm run locks:apply 重新锁定。"

```

## W2 处置（主控包外出示）：R1 审包中 verify-tail 乱序系主控拼装 grep 分批追加所致（先 tail 抓 built/exit 行后 append Test/locks 行）。真实 f-lock01-verify.raw.txt 尾段原文（回炉后重跑，末行=echo exit=$? 追加的全链真退出码）：

```
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.mjs is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfPageCanvas.tsx, E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/TextLayer.tsx, dynamic import will not move module into another chunk.
[39m
[1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter] 
(!) E:/class/智慧水务/Synapse_remake/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url is dynamically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/CorpusExtractor.ts but also statically imported by E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/PdfDocProvider.tsx, dynamic import will not move module into another chunk.
[39m
rendering chunks...
[2m../../out/renderer/[22m[32mindex.html                          [39m[1m[2m    0.88 kB[22m[1m[22m
[2m../../out/renderer/[22m[32massets/pdf.worker.min-yatZIOMy.mjs  [39m[1m[2m1,375.84 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-CKQTWqTF.css           [39m[1m[2m   52.47 kB[22m[1m[22m
[2m../../out/renderer/[22m[36massets/index-Dl5SZpqr.js            [39m[1m[33m1,389.28 kB[39m[22m
[32m✓ built in 1.76s[39m
exit=0

```

回炉前首跑的 raw 末行同为 exit=0（f-lock01-verify.raw.txt 中段在档）。

## N3 处置：check-locks.mjs:25 注释已改指 get-protected-files.ps1（见上方 diff 第二段）。

## 锁定态：回炉毕 locks:apply 312+verify 全链 exit=0（上段）。

输出：W1/W2/N3 逐条 ADDRESSED/NOT ADDRESSED+新破坏扫描结论。≤800 字。
