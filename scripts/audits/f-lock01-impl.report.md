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
