# F-GEOM-01-G4 门一审包简报（对抗式代码审查）

> 审岗=ops-gate1-k1（kimi-main k3 $max 绑定，异构于实现者 GLM5.3flash）
> 工作区根=E:\class\智慧水务\Synapse_remake；你只有 Read 工具——审包文件化自包含，
> 禁任何写操作。产出报告写不进文件，全文以最终回执返回（主控逐字归档）。

## 0. 被审对象

工单 F-GEOM-01-G4（目录化 M1：state/ 10 文件迁移，**零行为变更纯迁移票**，
[locked-change][test-refactor] 双尾注）。设计书=
docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md §3.2/§3.4 M1 行。
实现者报告=scripts/audits/g4-impl-report.md（含技能清点/交付/验证证据/自裁申报 10 项）。
主控简报=scripts/audits/g4-impl-brief.md（原始任务书）。

## 1. 审包主体（必读，按序）

1. **diff 主件**：scripts/audits/g4-gate1-diff.patch（1103 行，git diff -M 产物）——
   恰 10 个 `rename from/to` 对（reader/{=>state}/）+ 内容变更 +112/−112 行：
   - rename 内深度修正 8 行：CorpusExtractor.ts 3 行（src/shared 加深一级）+
     reader.store.ts 2 行（api/client+toast-store）+ tab-dirty/annotation-undo/
     ai-notes.store 各 1 行；
   - src 消费面 50 行（域内 29 件 48 行+跨域 App.tsx:12/useExportCorpusEvents.ts:32）；
   - tests 受锁面 41 行/30 件（纯路径段插入，零用例结构变化）；
   - 配置 4 行：eslint.config.js :89/:92+check-quality.mjs :96/:98；
   - tickets/registry.ts 9 行（file 字段路径随迁，G4 自身 :295 保持 open 未翻）。
2. **未跟踪新面清单**（将随本票提交入库，不在 diff 内）：src/renderer/features/
   reader/state/ 十文件（即 rename 对的新侧，diff 已含）；scripts/audits/g4-*
   工具件 8 个 .mjs+简报/报告 2 个 .md+证据 .log 族（scripts/audits/ 证据区惯例归宿）。

## 2. 零行为变更断言（核心对抗点）

实现者主张：除路径与 ../ 深度外一个字符未改。请逐 hunk 抽核：
- rename 对的 content 变更恰 8 行且全部=import 路径深度（无语句/注释/空行变动）；
- 5 个零变更 rename（PdfDocProvider/ai-notes-phase/page-layer-z/scroll-converge/
  useActiveTab）确为 R100；
- src/tests 91 行全部=`./x`→`./state/x` 或插 `state/` 段的纯路径行；
- tests 面零 describe/it/断言增删（指纹门 187/1789/5411 零漂移为机器旁证——
  你可抽 2-3 件测试对照 HEAD 版：`git show` 不可用（你无 Bash），改读
  scripts/audits/g4-fix-tests.log 的行级审计+任选 3 件在 patch 中逐行核）。

## 3. 边界纪律核验点

1. **M6a 禁动面**：eslint.config.js :90/:91（PdfPageCanvas/TextLayer）必须零触——
   patch 中该两行不得出现；
2. **check-quality 两行方向**：:96 是键（tab-dirty 自身路径）/:98 是值（消费目标
   reader/state/CorpusExtractor）——方向颠倒=quality 红或例外失效（verify 绿为旁证，
   但请从 patch 语义面独立确认）；
3. **registry 9 行**：仅 file 字段路径变化，id/status/summary 零漂移（巨行请逐行
   确认 diff 只在路径段）；
4. **受锁链**：实现者申报 locks 345（341 主控预登+4 工具件），M2 变异涉锁微窗
   还原后 locks:check 绿（g4-verify-partial.log 内证）——账面自洽性核对。

## 4. 实现者自裁申报 10 项（g4-impl-report.md §③——逐项拷问）

要点：①受锁面勘正 3→30 件；②mv 文件系统通道；③探针修复+绊线+双版 raw
（scripts/audits/g4-recon-imports.log 刷新版/.bak-diff 原版——主控裁决 A 链在档）；
④src 50/31 vs 简报 49/32 口径差；⑤locks:generate 三次；⑥M2 涉锁微窗；⑦变异先于
终验；⑧mutation2.log GBK 归一（内容未变声明——可读该 log 尾注行核实）；⑨补链取证
g4-verify-partial.log；⑩四工具件入锁。请对每项裁：成立/存疑+理由。

## 5. 证据件索引（可 Read 抽核）

- 基线/终验/补链：g4-baseline-verify.log（末行 EXIT=0）/g4-verify-final.log
  （实现者终态，tickets 红时段）/g4-verify-master.log（registry 九行后主控全链
  EXIT=0）/g4-verify-partial.log（lint/typecheck/test/build 四绿补链）
- 变异红证：g4-mutation1.log（src 面 TS2307）/g4-mutation2.log（tests 面模块解析红）
  ——各含 红→还原 diff 空→复绿 三段
- 改写审计：g4-fix-{deep,src,tests}.log（行级命中清单）
- 侦察三探针 raw：g4-recon-{imports,internal,tests}.log

## 6. 产出格式（最终回执全文返回）

- 总裁决：PASS / PASS_WITH_WARNINGS / FAIL（B/W/N 计数）
- B（Blocker）=零行为断言破口/边界破口/证据链断裂
- W（Warning）=报告层瑕疵（计数失实/措辞过当/证据缺口）
- N（Note）=记录级
- 逐项：第 2/3/4 节各核验点结论+自裁 10 项裁词+你认为主控应处置的具体动作。
