# F-LOCK-01 门二终审（二审实证岗）

日期：2026-09-10 ｜ 岗：门二独立子代理 ｜ 结论：**PASS（无条件）**

## 处置核对（门一全 findings vs 终态实物）

- **W1 死变量**：unlock-protected.ps1 现文 14 行（wc -l），全文无 `$root`——已删。
- **W2 verify 连续序**：f-lock01-verify.raw.txt 8221 行全文在档且已入 git 暂存（status A）。亲取：行 4109 `--- relock after gate1 rework ---` 分隔；行 4114 全链命令原文（quality:check && tickets:check && locks:check && lint && typecheck && test && build 串联）；行 4146 locks 312；行 8180 Test Files 160 / 8181 Tests 1562；行 8221 末行 `exit=0`。sed 同文件连续读取=R2 索要的"含 vitest 摘要与 locks 输出的连续尾段"实体，行号 4114→4146→8180→8181→8221 与 R3 索引全吻合。R3 附带条件（原始日志存档）满足。
- **N3 注释**：check-locks.mjs:25 已改指 get-protected-files.ps1；git diff 亲验=恰 1 行注释、代码零改动。
- **R2 新破坏1（返回类型）**：共享件行 11-23 输出全为 FileInfo（Get-ChildItem -File/Get-Item），行 24 Sort-Object 不改类型，`$_.IsReadOnly` 消费成立。
- **R2 新破坏2（去重）**：共享件行 24 `Sort-Object -Property FullName -Unique` 在场。
- **R2 新破坏3（mjs baseline）**：check-locks.mjs:43 显式登记 dup-constants.baseline.json。
- 说了没改/改了没说：均无。lock 头注改向已在实现报告 §2 申报；verify raw 双段形态 R1/R2 已裁可解释。

## 母本符合度（票面验收四项）

① 先红：prered raw=apply 311→unlock 310（差1）→baseline True（DEFECT）→locks 311 对照。② 修复后：postred=generate 312→unlock 312+baseline False→apply 312+True。③ dot-source：unlock:8 与 lock:13 均 `. (Join-Path $PSScriptRoot 'get-protected-files.ps1')` 亲读在场。④ locks 311（prered step4 末行，数字清晰；乱码=GBK 双重转码显示伪影）+verify 末行 exit=0。四项全符。

## 宪法红线

- 受锁流程：改前 apply→unlock 流在 prered step1-2；新件诞生即 generate+apply 在 postred step0/2；manifest 312 条，generatedAt=00:10:21.735Z 与回炉 verify 段 Start at 08:10:37（UTC+8）时间线衔接自洽。
- 旧方案删净：unlock 内联收集面（$files 数组/Get-ChildItem/foreach cfg）零残留；lock 本地函数删净（diff −22 行）。
- 分层/安全禁令：不适用面申明成立（纯 scripts 基建，无 ipc/renderer/SQL/eval 面）。
- 行数：新件 25 行 ≤500；lock 42/unlock 15。
- UTF-8：node 字节级独立复算三 ps1 全部 BOM=true/CR=0/无 U+FFFD，与 bom.raw 一致。

## 机器面亲跑

- `node scripts/check-locks.mjs` →「locks 检查通过：312 个受锁文件与 manifest 一致」exit=0。
- manifest：entries=312；新件条目 sha256 前缀 96af95a0（与报告吻合）+baseline cc29271c 双在册。
- 翻 done 推演：F-LOCK-01 file=scripts/unlock-protected.ps1 存在（existsSync 过）；ID_WHITELIST 匹配 F 系；check-tickets ticketRefRe 仅扫 SR 系号——ps1/mjs 头注中 F-LOCK-01 引用不触发行 141；done 内容检查仅拦 NotImplementedError/unimplementedObject（unlock 无）→ 翻 done 不红。
- git diff --stat：票面三件+check-locks 1 行+manifest+registry +1 行+6 证据件，无范围蔓延。

## 非阻断观察

1. verify raw 8221 行（约 0.5MB）入库属证据件桶①口径，成本可接受。
2. wc -l unlock=14 vs 报告 15=末行换行计数口径差，非实质。

## 成本账本

GLM-5.3 终审岗，约 55k in / 9k out tokens，约 18 分钟。

**裁决：F-LOCK-01 五项 findings 全销项、验收四项全符、红线全过、机器面亲跑全绿。PASS，无回炉项，可收口（verify 绿+locks:apply 在档+registry 翻 done+[locked-change] 提交）。**
