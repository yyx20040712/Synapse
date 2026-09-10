# F-LOCK-01 门一对抗深审（Kimi 链）

你是门一对抗审查员（隔离一审，零仓库接触）。审计包自包含如下，禁跑命令、禁臆测包外事实。只报告有代码/证据支撑的问题，每条给 file:line 或代码摘录；不确定的明确说不确定。用中文输出。

## 铁律
只读审计；唯一可写=本回复文本；禁 npm/test/git。

## 票面（registry 条目原文）

```
{ id: 'F-LOCK-01', file: 'scripts/unlock-protected.ps1', area: 'infra', owner: 'strong', status: 'open', summary: 'unlock/lock 脚本受锁集合不对称修复（F-LINT-03 实现者异常项——v57 §2-2 立案候选）：unlock-protected.ps1 收集面漏 scripts/dup-constants.baseline.json（lock-protected.ps1 与 check-locks.mjs protectedFiles() 均含）——受锁集合三处独立定义漂移实录（F-LINT-03 收口链两次 chmod +w 绕行）;修法（主控预裁）=ps1 侧共用单一收集函数——新件 scripts/get-protected-files.ps1 驻 Get-ProtectedFiles（集合=lock 现行集合含 baseline.json,与 check-locks.mjs 语义对齐）,lock/unlock 两脚本 dot-source 调用;跨语言（mjs↔ps1）一致性维持头注互指（check-locks=verify 权威关卡,ps1 漂移最坏面=操作入口不全非完整性漏洞——哨兵不做,主控裁:跨语言解析脆成本>收益）;硬性形态=新件 UTF-8 with BOM+LF（powershell 5.1 无 BOM 中文 GBK 乱码——现有三 ps1 全 BOM 实测）+新件诞生即 locks:generate+apply（scripts/*.ps1 walk 自动面）;验收=功能实证 raw（无单测面——纯基建票先例 F-DOC-01）:①先红=修复前 lock:apply→unlock→baseline.json IsReadOnly 仍 true（缺陷实锤）②修复后 unlock→IsReadOnly=false→lock:apply→true 恢复③两脚本 dot-source 单行 grep 证④locks:check 311+verify 全链 exit=0;受锁面=3 ps1+[locked-change] 尾注' }
```

## 主控已预裁项（可攻击但推翻需更强依据）
1. 修法=ps1 侧单一收集函数（新件 get-protected-files.ps1），跨语言（mjs↔ps1）哨兵不做（check-locks.mjs 是 verify 权威关卡；ps1 侧漂移最坏面=操作入口不全，非完整性漏洞）。
2. 无单测面（纯基建脚本，功能实证替代，先例 F-DOC-01）。
3. 新件形态 UTF-8 BOM+LF（powershell 5.1 GBK 坑）。
4. locks 面 311→312（新件自身入锁面，delta 可解释）。
5. registry.ts 的 diff 行是主控立案改动（控制面单写者），非实现者越权。

## 核心实现 diff（4 文件：新件+两脚本改造+registry 立案行）

```diff
diff --git a/scripts/get-protected-files.ps1 b/scripts/get-protected-files.ps1
new file mode 100644
index 0000000000..a6d45c50ff
--- /dev/null
+++ b/scripts/get-protected-files.ps1
@@ -0,0 +1,25 @@
+﻿# get-protected-files.ps1 —— 受锁文件单一收集函数（受锁文件）
+# lock-protected.ps1 / unlock-protected.ps1 两脚本 dot-source 共用本件。
+# 受锁集合与 scripts/check-locks.mjs protectedFiles() 跨语言对齐：
+# 修改任一侧需同步另一侧，并走 [locked-change] 流程（见 AGENTS.md）。
+# 由来（F-LOCK-01）：unlock/lock 两脚本受锁集合不对称——unlock 收集面漏
+# scripts/dup-constants.baseline.json；三处独立定义漂移后收敛为单一来源。
+$root = Split-Path -Parent $PSScriptRoot
+
+function Get-ProtectedFiles {
+  $files = @()
+  $files += Get-ChildItem -Path (Join-Path $root 'tests') -Recurse -File
+  $files += Get-ChildItem -Path (Join-Path $root 'src/shared') -Recurse -File
+  $files += Get-ChildItem -Path (Join-Path $root 'src/main/db/migrations') -Recurse -File
+  $files += Get-ChildItem -Path $root -Recurse -File -Include *.test.ts, *.test.tsx |
+    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\out\\|\\dist\\|\\coverage\\' }
+  foreach ($cfg in @('docs/invariants.md', 'vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml',
+      'playwright.config.ts', 'electron.vite.config.ts',
+      'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json',
+      'scripts/dup-constants.baseline.json')) {
+    $p = Join-Path $root $cfg
+    if (Test-Path $p) { $files += Get-Item $p }
+  }
+  $files += Get-ChildItem -Path (Join-Path $root 'scripts') -Recurse -File -Include *.mjs, *.ps1
+  $files | Sort-Object -Property FullName -Unique
+}
diff --git a/scripts/lock-protected.ps1 b/scripts/lock-protected.ps1
index 6fa11b5210..47d6a10676 100644
--- a/scripts/lock-protected.ps1
+++ b/scripts/lock-protected.ps1
@@ -2,29 +2,15 @@
 # 用法：
 #   npm run locks:apply     解锁→重算 sha256→写 manifest→设只读
 #   npm run locks:generate  仅重算 manifest（不设只读）
-# 受锁集合与 scripts/check-locks.mjs 一致；合法修改流程见 AGENTS.md（需 [locked-change] 尾注）
+# 受锁集合由 scripts/get-protected-files.ps1 单一来源提供（lock/unlock 两脚本
+# dot-source 共用，与 check-locks.mjs 跨语言对齐）；合法修改流程见 AGENTS.md（需 [locked-change] 尾注）
 param([switch]$GenerateOnly)
 
 $ErrorActionPreference = 'Stop'
 $root = Split-Path -Parent $PSScriptRoot
 
-function Get-ProtectedFiles {
-  $files = @()
-  $files += Get-ChildItem -Path (Join-Path $root 'tests') -Recurse -File
-  $files += Get-ChildItem -Path (Join-Path $root 'src/shared') -Recurse -File
-  $files += Get-ChildItem -Path (Join-Path $root 'src/main/db/migrations') -Recurse -File
-  $files += Get-ChildItem -Path $root -Recurse -File -Include *.test.ts, *.test.tsx |
-    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\out\\|\\dist\\|\\coverage\\' }
-  foreach ($cfg in @('docs/invariants.md', 'vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml',
-      'playwright.config.ts', 'electron.vite.config.ts',
-      'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json',
-      'scripts/dup-constants.baseline.json')) {
-    $p = Join-Path $root $cfg
-    if (Test-Path $p) { $files += Get-Item $p }
-  }
-  $files += Get-ChildItem -Path (Join-Path $root 'scripts') -Recurse -File -Include *.mjs, *.ps1
-  $files | Sort-Object -Property FullName -Unique
-}
+# 受锁集合单一来源（F-LINT-03 异常项收敛，F-LOCK-01 落地）
+. (Join-Path $PSScriptRoot 'get-protected-files.ps1')
 
 # 1) 先全部解锁（幂等 + 允许重新锁定更新后的内容）
 Get-ProtectedFiles | ForEach-Object { try { $_.IsReadOnly = $false } catch {} }
diff --git a/scripts/unlock-protected.ps1 b/scripts/unlock-protected.ps1
index 3cfa3a2c1b..7c43f12b3f 100644
--- a/scripts/unlock-protected.ps1
+++ b/scripts/unlock-protected.ps1
@@ -4,22 +4,12 @@
 $ErrorActionPreference = 'Stop'
 $root = Split-Path -Parent $PSScriptRoot
 
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
diff --git a/tickets/registry.ts b/tickets/registry.ts
index cd4ca17ba0..2cb20d19df 100644
--- a/tickets/registry.ts
+++ b/tickets/registry.ts
@@ -261,6 +261,7 @@ export const TICKETS: readonly Ticket[] = [
   { id: 'F-REG-01', file: 'scripts/check-tickets.mjs', area: 'infra', owner: 'strong', status: 'done', summary: 'check-tickets 工单号校验全域化（F-TOOL-01/F-CSS-02 两票门二独立提出的防作弊链盲区——objRe 只捕 SR2?- 前缀工单号,F 系等 38+ 工单翻 done=平凡绿[工单文件存在性不校验]）;扩展=①全工单号格式全域校验（id 前缀白名单枚举[S 系/F 系/P 系——以 registry 现存 158 票实测前缀全集为准]）②done 票 file 字段有效性抽验或全验（三形态兼容:具体文件存在/目录存在[如 scripts/audits/]/前缀说明性字段——形态语义先盘点再定校验强度）;**先红证**:临时把某 done 票 file 指向不存在路径→红→还原;受锁 scripts/*.mjs 即时 locks:generate+apply;存量零误报（158 票全过）+verify 全链' },
   { id: 'F-DOC-01', file: 'docs/methodology.md', area: 'infra', owner: 'strong', status: 'done', summary: 'methodology §4.1 增⑤i「设计期存量 dry-run 实证」条款（F-LINT-01 终裁改向教训成文——2026-09-09 用户裁决入批）:涉「存量态」假设的规则/关卡/负锚类设计书必须附存量形态 dry-run 统计输出（一行 grep/walk 计数即可前置暴露「存量零误报」类验收与事实互斥——F-LINT-01 案:C-4/B-5 设计链三跳三方齐漏存量验证,实现期才暴露 61+6 真命中=一轮实现+改向成本;「验收项存在≠已验证」）;条款位=§4.1 简报模板⑤系（⑤h 之后⑤i）;纯文档票——verify 全链+UTF-8,无测试面' },
   { id: 'P7X-03', file: 'docs/reports/', area: 'infra', owner: 'strong', status: 'done', summary: 'B6 模态期最小化语义对证（AUDIT-B 留场场——用户裁决 2026-09-03 全立项；**对证成立=结案推演升文档实证，免实现**（票面预判兑现）：机制链=tab-dirty.ts:110 window.confirm→Chromium 原生 owned-modal（探针 enabled:false 直接观测）→MSDN About Dialog Boxes 系统级明文「owner 禁用至对话框销毁+不可激活」+Electron 文档「modal disables parent」+native_window_views.cc SetEnabled→EnableWindow 源注（issue #50068 purposely disabled）+SO 3777551 任务栏同语义实证——门审质疑三点（归因推演/任务栏外推/应用层抑制未排除）逐点销项；边界申报=SC_MINIMIZE 精确内部路径无逐行源注但 B6 结论依赖的行为面三层闭合）；报告 docs/reports/2026-09-03_p7x03-b6-modal-minimize-crosscheck.md；B6 结案（AUDIT-B 留场场项销项）+Electron 模态边缘行为族附注监控备忘不入案' },
+  { id: 'F-LOCK-01', file: 'scripts/unlock-protected.ps1', area: 'infra', owner: 'strong', status: 'open', summary: 'unlock/lock 脚本受锁集合不对称修复（F-LINT-03 实现者异常项——v57 §2-2 立案候选）：unlock-protected.ps1 收集面漏 scripts/dup-constants.baseline.json（lock-protected.ps1 与 check-locks.mjs protectedFiles() 均含）——受锁集合三处独立定义漂移实录（F-LINT-03 收口链两次 chmod +w 绕行）;修法（主控预裁）=ps1 侧共用单一收集函数——新件 scripts/get-protected-files.ps1 驻 Get-ProtectedFiles（集合=lock 现行集合含 baseline.json,与 check-locks.mjs 语义对齐）,lock/unlock 两脚本 dot-source 调用;跨语言（mjs↔ps1）一致性维持头注互指（check-locks=verify 权威关卡,ps1 漂移最坏面=操作入口不全非完整性漏洞——哨兵不做,主控裁:跨语言解析脆成本>收益）;硬性形态=新件 UTF-8 with BOM+LF（powershell 5.1 无 BOM 中文 GBK 乱码——现有三 ps1 全 BOM 实测）+新件诞生即 locks:generate+apply（scripts/*.ps1 walk 自动面）;验收=功能实证 raw（无单测面——纯基建票先例 F-DOC-01）:①先红=修复前 lock:apply→unlock→baseline.json IsReadOnly 仍 true（缺陷实锤）②修复后 unlock→IsReadOnly=false→lock:apply→true 恢复③两脚本 dot-source 单行 grep 证④locks:check 311+verify 全链 exit=0;受锁面=3 ps1+[locked-change] 尾注' },
 ] as const
 
 export const TICKET_MAP: ReadonlyMap<string, Ticket> = new Map(TICKETS.map((t) => [t.id, t]))

```

## 红证证据 diff（prered 先红+mutation 变异，全文）

```diff
diff --git a/scripts/audits/f-lock01-mutation.raw.txt b/scripts/audits/f-lock01-mutation.raw.txt
new file mode 100644
index 0000000000..c6478a8fff
--- /dev/null
+++ b/scripts/audits/f-lock01-mutation.raw.txt
@@ -0,0 +1,44 @@
+=== F-LOCK-01 mutation red proof: shared collector is really consumed by unlock ===
+--- mutation in place (baseline entry renamed to nonexistent path): ---
+19:      '__f-lock01-mutation__.nonexistent')) {
+--- precondition: set baseline IsReadOnly=True (simulate locked state, no manifest touch) ---
+pre-unlock baseline IsReadOnly: True
+--- npm run locks:unlock with MUTATED collector ---
+npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+
+> synapse@0.1.0 locks:unlock
+> powershell -NoProfile -ExecutionPolicy Bypass -File scripts/unlock-protected.ps1
+
+�ѽ��� 311 ���ļ������������ npm run locks:apply ����������
+baseline IsReadOnly after mutated unlock (expect True = RED): True
+=== mutation red phase done ===
+=== mutation restore phase ===
+--- restore self-check: mutation marker must be 0, baseline entry must be 1 ---
+mutation marker count: 0
+baseline entry count: 0
+restore check: BOM=true CR=0
+--- re-run unlock with RESTORED collector ---
+npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+
+> synapse@0.1.0 locks:unlock
+> powershell -NoProfile -ExecutionPolicy Bypass -File scripts/unlock-protected.ps1
+
+�ѽ��� 312 ���ļ������������ npm run locks:apply ����������
+baseline IsReadOnly after restored unlock (expect False): False
+--- final: npm run locks:apply back to locked state ---
+npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+
+> synapse@0.1.0 locks:apply
+> powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lock-protected.ps1
+
+������ 312 ���ļ���ֻ������manifest ��¼ 312 ����
+�ύ manifest ���ʱ���ύ��Ϣ����� [locked-change] βע��
+final baseline IsReadOnly (expect True): True
+=== mutation restore done ===
+--- correction: previous "baseline entry count: 0" was a shell quoting artifact; fixed-string grep recheck ---
+6:# scripts/dup-constants.baseline.json；三处独立定义漂移后收敛为单一来源。
+19:      'scripts/dup-constants.baseline.json')) {
+marker grep exit=0 ; fixed-string entry grep found above (lines 6 comment + 19 collection entry)
diff --git a/scripts/audits/f-lock01-prered.raw.txt b/scripts/audits/f-lock01-prered.raw.txt
new file mode 100644
index 0000000000..9e508e1bd0
--- /dev/null
+++ b/scripts/audits/f-lock01-prered.raw.txt
@@ -0,0 +1,29 @@
+=== F-LOCK-01 prered: defect evidence BEFORE any file change ===
+--- step1: npm run locks:apply (lock all; expect "311") ---
+npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+
+> synapse@0.1.0 locks:apply
+> powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lock-protected.ps1
+
+������ 311 ���ļ���ֻ������manifest ��¼ 311 ����
+�ύ manifest ���ʱ���ύ��Ϣ����� [locked-change] βע��
+--- step2: npm run locks:unlock (defective collector; expect count-1=310) ---
+npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+
+> synapse@0.1.0 locks:unlock
+> powershell -NoProfile -ExecutionPolicy Bypass -File scripts/unlock-protected.ps1
+
+�ѽ��� 310 ���ļ������������ npm run locks:apply ����������
+--- step3: baseline.json IsReadOnly after unlock (expect True = DEFECT) ---
+True
+--- step4: locks:check total for cross-check (expect 311) ---
+npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
+
+> synapse@0.1.0 locks:check
+> node scripts/check-locks.mjs
+
+locks 检查通过：311 个受锁文件与 manifest 一致
+=== prered done ===

```

## verify 收口摘要（f-lock01-verify-tail.txt 原文）

```
[32m✓ built in 290ms[39m
[32m✓ built in 130ms[39m
[32m✓ built in 1.74s[39m
exit=0
[2m Test Files [22m [1m[32m160 passed[39m[22m[90m (160)[39m
[2m      Tests [22m [1m[32m1562 passed[39m[22m[90m (1562)[39m
locks 检查通过：312 个受锁文件与 manifest 一致

```

## 实现者报告全文（f-lock01-impl.report.md）

# F-LOCK-01 实现报告（unlock/lock 受锁集合不对称修复）

日期：2026-09-10 ｜ 实现者：子代理（领单票面五层规约）｜ 仓库态：改动后锁定态

## 1. 实现摘要

缺陷本体：`scripts/unlock-protected.ps1` 内联收集面的 foreach cfg 列表漏
`scripts/dup-constants.baseline.json`（lock-protected.ps1 与 check-locks.mjs
protectedFiles() 均含）——受锁集合三处独立定义漂移，实际后果=locks:unlock 跑完
baseline.json 仍只读（F-LINT-03 收口链两次 chmod +w 绕行的根源）。

修法（主控预裁落地）：ps1 侧受锁集合收敛为单一来源——新件
`scripts/get-protected-files.ps1` 驻 `Get-ProtectedFiles`（集合=lock 现行全集
逐字迁移，含 baseline.json；内部 `$root = Split-Path -Parent $PSScriptRoot`
定位仓库根）；lock/unlock 两脚本删各自收集面，dot-source
`. (Join-Path $PSScriptRoot 'get-protected-files.ps1')` 调用。check-locks.mjs
零改动，跨语言一致性维持头注互指（票面已裁：哨兵不做）。

## 2. 文件清单（行数变化）

| 文件 | 变化 | 行数 |
| --- | --- | --- |
| scripts/get-protected-files.ps1 | 新建（BOM+LF，25 行） | 0→25 |
| scripts/lock-protected.ps1 | 删本地函数 17 行改 dot-source；头注改指回共享件 | 57→42 |
| scripts/unlock-protected.ps1 | 删内联收集面（$files 数组+3×Get-ChildItem+foreach cfg 块），dot-source+调 Get-ProtectedFiles；解锁循环+输出文案语义保持 | 26→15 |
| locks/manifest.json | apply 产物：+新件条目 / generatedAt 更新 / sha 变化恰为本票两修改件 | — |

其余逻辑零改动：lock-protected.ps1 的「先全解锁→重算 manifest→设只读 +
GenerateOnly 开关+输出文案」逐行未动；unlock 输出文案一字未改（原
`$files | Sort | ForEach` 形态改 `Get-ProtectedFiles | ForEach`——共享件输出
已内置 Sort-Object -Unique，解锁语义与计数等价）。

## 3. 红证索引（原始输出见同目录 .raw.txt）

- **prered（先红，改动前）** f-lock01-prered.raw.txt：
  - 「已锁定 311 个文件（只读）。manifest 记录 311 条。」
  - 「已解锁 310 个文件。」（311−310=差 1 实锤）
  - 「baseline.json IsReadOnly after unlock (expect True = DEFECT): **True**」
  - 「locks 检查通过：311 个受锁文件与 manifest 一致」（总数对照）
- **postred（修复后）** f-lock01-postred.raw.txt：
  - generate「仅生成 manifest（312 条）」（新件即时登记）
  - 「已解锁 312 个文件。」+「after unlock (expect False): **False**」（缺陷闭合）
  - apply「已锁定 312 个文件」（改后 lock 脚本自身回归）+「after apply (expect True): **True**」
  - 「locks 检查通过：312 个受锁文件与 manifest 一致」
- **mutation（变异红）** f-lock01-mutation.raw.txt：
  - 前置 baseline=True → 变异收集面（baseline 条目→不存在路径）→
    「已解锁 **311** 个文件」→「after mutated unlock (expect True = RED): **True**」
    （unlock 真消费共享函数、单点生效证明）
  - 还原自查：mutation 标记 grep=0、baseline 条目在位（第 19 行，grep -F 实证；
    raw 内首查"count: 0"系 shell 命令替换引号伪影，已附修正段）、BOM=true/CR=0
  - 复绿：「已解锁 312 个文件」+「(expect False): **False**」→ apply 终态 True
- **bom（形态）** f-lock01-bom.raw.txt：三 ps1 全部 BOM=true / CR=0 / 无 U+FFFD

## 4. 测试证据

`npm run verify` 全链真退出码 **exit=0**（f-lock01-verify.raw.txt，echo exit=$?
追加在文件末行）。关键行：quality 检查通过 / tickets 检查通过 / locks 检查通过：
**312** 个受锁文件与 manifest 一致 / Test Files **160** passed (160) / Tests
**1562** passed (1562)。基线核对：160 文件与 1562 用例与 §5 一致；locks 311→312
= 新共享件入 scripts/*.ps1 walk 自动面（+1），delta 可解释。

## 5. locks 实录

新件诞生即时 `npm run locks:generate && npm run locks:apply`（输出在
f-lock01-postred.raw.txt 步骤 0/2）：generate「仅生成 manifest（312 条），未设
只读」；apply「已锁定 312 个文件（只读）。manifest 记录 312 条。」——apply 跑
的就是改后的 lock-protected.ps1 自身=天然回归证。manifest 现状：312 条，
含 scripts/get-protected-files.ps1（sha256 96af95a0…）与
scripts/dup-constants.baseline.json 双双在册（node 读 manifest 实证）。最终
仓库锁定态：baseline.json True / 共享件 True。

## 6. 自裁申报（超出票面的决定）

1. **变异方式替代**：票面原文"临时注释掉 baseline.json 那行"——逐字注释会吞掉
   行尾 `')) {` 造成 PowerShell 数组语法破损；改为将该字符串临时改名
   `'__f-lock01-mutation__.nonexistent'`（Test-Path False→等价从收集移除，语法
   完好，红证语义与票面预期一致：unlock 311 + baseline 仍 True）。
2. **变异前置状态构造**：红证需 baseline 先处只读 True；未用 locks:apply 构造
   （apply 会以变异收集面重算 manifest=污染 manifest），改用 powershell 单行
   直接设 IsReadOnly=True（只动只读位、不触 manifest 与文件内容）。
3. **行尾验证方法**：票面示例 `grep -c $'\r'` 在本 Git Bash 环境对 LF 文件
   误报 25（MSYS 文本模式伪影，两文件实测对照确认），行尾权威验证改用 node
   字节级计数（三 ps1 CR=0 实证落 bom.raw）。
4. **新件行尾修正**：Write 工具在 Windows 落地 CRLF，新件首写后经 node 单行
   （纯 ASCII）转 LF 再补 BOM——形态修正，内容零变化。
5. **raw 编码形态**：powershell 5.1 管道输出 GBK 字节与 node 输出 UTF-8 字节
   混合落盘=原始实录本性（与已入库先例 z-r2e-fix-*.raw.txt 同形态；audits
   不在 quality mojibake 扫描面；三 raw 均验无 U+FFFD 字节）。阅读 PS 段需
   GBK 解码。
6. **删减面 diff 自查**：无删减。git status 面=tickets/registry.ts（主控控制面，
   开工前已 M，实现者未触碰）+ 票面三件 + manifest + 6 证据件（本报告内），
   无范围蔓延。

## 7. 疑虑

- 无阻塞疑虑。一点观察：lock-protected.ps1 与共享件各自定义 `$root`（同值同
  语义），dot-source 时共享件值覆盖调用者（无害）；若未来两脚本 root 语义分叉
  需先动共享件头注契约。跨语言（mjs↔ps1）一致性仍靠头注互指+人工同步，为票面
  既有裁决（哨兵不做），本票已把 ps1 侧收敛为单点。


## 工单（A~E 逐项作答）

- A 母本符合度：实现与票面/主控预裁逐条对拍（集合迁移逐字性、dot-source 形态、BOM+LF、即时 generate+apply、四项验收）。
- B 宪法红线：受锁流程合规性（改受锁 ps1 前是否先 unlock——diff 时序可从 prered 推演）、方案切换旧方案删除（旧内联收集面是否删净）、死代码。
- C 代码质量：PowerShell dot-source 作用域语义（$root/PSScriptRoot 解析、函数可见性）、两脚本行为等价性（lock 三段流程/unlock 计数语义）、共享件头注跨语言互指充分性。
- D 报告诚实性：自裁 6 项逐条对证据（变异改名为等效移除是否削弱变异证、CRLF 环境伪影改 node 字节验证的合理性）。
- E 接缝与后续：check-locks.mjs 头注注释互指是否需随迁（"与 lock-protected.ps1 保持一致"字样现指向关系变化）、其他消费方（npm scripts/CI）零影响推演、后续票建议。

## 输出格式

[B|W|N] 分级逐条+file:line/代码摘录证据；末尾统计行（B/W/N 计数）+总评（放行/回炉/终止）。精简，总输出 ≤3K 字。
