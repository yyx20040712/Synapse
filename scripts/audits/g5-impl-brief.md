# G5 实现者六段简报（batch 17 · F-GEOM-01-G5 目录化 M2=time/）

> 派发档位：ops-executor 绑定子代理（GLM5.3flash $max）。
> 主控=GLM5.3 max（本会话）。工作区根：E:\class\智慧水务\Synapse_remake。

## 一、票面与目标

- 票：`tickets/registry.ts:296` F-GEOM-01-G5（status open，owner strong）。
  摘要原文：「目录化 M2=time/ 域迁移（设计书 §3.4；5/11）：4 文件迁 reader/time/——
  reading-time/reading-time-setup/reading-time-outbox/reading-time-outbox-store；
  受锁面=reading-time 系测试 import 同链 unlock→改→apply；域间单向=time→state
  核验（§3.1）；翻 done 时 file 随迁改写；验收=verify 全链；
  [locked-change][test-refactor]」。
- 设计书：docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md
  §3.4 迁移序 M2 行（受锁面=reading-time 系测试 import，verify 面=全绿）+
  §3.1 域序图（time──→state 单向）。
- **零行为纯迁移**：不改任何运行时语义、不改用例增删（G4/batch 16 同型票）。
  唯一改动类别=文件移动+import 路径改写+一处注释勘正。

## 二、主控侦察结论（迁移地图——已实勘，落笔前你可复核但禁扩面）

迁移 4 件（git rename 相似度将全识别，用文件系统 mv 即可）：
1. src/renderer/features/reader/reading-time.ts（303 行）
2. src/renderer/features/reader/reading-time-setup.ts（139 行）
3. src/renderer/features/reader/reading-time-outbox.ts（300 行）
4. src/renderer/features/reader/reading-time-outbox-store.ts（87 行）
→ 目标 src/renderer/features/reader/time/（目录现不存在，mkdir）。

**域内相对引用（同层迁移，零改写）**：setup→reading-time（:23 段）/
reading-time-outbox（:29）/reading-time-outbox-store（:30）；outbox-store→
reading-time-outbox（:9）。全部 `./` 同层，迁移后仍同层。

**深度/跨域修正（实现者逐行落）**：
- reading-time-setup.ts:13 `'../../api/client'`→`'../../../api/client'`
- reading-time-setup.ts:14 `'../../shared/ui/toast-store'`→
  `'../../../shared/ui/toast-store'`
- reading-time-setup.ts:15 `'./state/reader.store'`→`'../state/reader.store'`
- reading-time-setup.ts:16 `'./state/reader.store'`（type）→`'../state/reader.store'`
- reading-time.ts:61 `'../../shared/reading-time-format'`→
  `'../../../shared/reading-time-format'`

**跨特性/组件消费面（src，3 行）**：
- src/renderer/main.tsx:4 `'./features/reader/reading-time-setup'`→
  `'./features/reader/time/reading-time-setup'`
- src/renderer/features/reader/ReaderPage.tsx:55 `'./reading-time-setup'`→
  `'./time/reading-time-setup'`
- ReaderPage.tsx:56 `'./reading-time'`→`'./time/reading-time'`

**陈旧注释勘正（1 处，零行为）**：src/renderer/shared/reading-time-format.ts:4
注释「reader/reading-time 双 feature 消费；reader/reading-time.ts re-export」
→「reader/time/reading-time.ts re-export」（仅改路径字样，G3 陈旧头注勘正先例）。

**受锁面（tests，实勘=2 文件 3 行 import，其余 8 处命中系注释/describe 字符串
/e2e 字符串零改写）**：
- tests/unit/renderer/reading-time.test.ts:9
  `'../../../src/renderer/features/reader/reading-time'`→`.../reader/time/reading-time`
- tests/unit/renderer/reading-time-outbox.test.ts:10
  `'../../../src/renderer/features/reader/reading-time-outbox'`→`.../reader/time/...`
- tests/unit/renderer/reading-time-outbox.test.ts:15
  `'../../../src/renderer/features/reader/reading-time-outbox-store'`→`.../reader/time/...`

**配置面零涉及**（主控已核）：check-quality.mjs 白名单（:96/:98 系 M1 的
state/ 路径，与 time 无关）；eslint INV-16 四路径（PdfDocProvider/TextLayer/
PdfPageCanvas/CorpusExtractor）零涉及。

**§3.1 单向核验**（简报内陈述，报告复核）：state/ 域零 import reading-time
（反向边不存在，grep 实证）；time→state 唯一边=setup:15/:16，合法；本票
零新增域边（纯移动）。

## 三、执行序（TDD——零行为迁移票的等价红绿闭环）

1. **基线锚**：跑 `npm run verify` 全链 EXIT=0（Node 24——若宿主 node 非 24，
   用绝对路径 /c/Program Files/Volta/npm.exe 或 PATH 前缀该目录；check-quality
   版本守卫非 24 即红）。基线数字记录：206 票 open 17、locks 345、test 170
   文件/1744 用例、指纹门 187/1789/5411。
2. **受锁链前置**：`npm run locks:unlock` → mv 4 件+mkdir time/ → 逐行落
   深度修正+消费面+注释勘正+tests 3 行 → `npm run locks:generate` +
   `npm run locks:apply`（受锁文件即时重锁）。
3. **全绿验证**：`npm run verify` EXIT=0（口径同基线；locks 数若因 time/
   新路径变动按实测记录——src 文件不在锁集合，预期 locks 345 不变，tests
   两件已锁 sha 随内容更新）。
4. **变异红证两段（cp 备份法——禁 git checkout，未提交面保护）**：
   - M1（主证）：把 main.tsx:4 回退旧路径（`'./features/reader/reading-time-setup'`）
     → typecheck/verify TS2307 红（真退出码落档）→ cp 还原 → diff 空 → 复绿。
   - M2（副证）：把 tests/unit/renderer/reading-time.test.ts:9 改回旧路径 →
     模块解析红（vitest FAIL_TO_RESOLVE/TS2307）→ 还原 → 复绿。
   - 还原证据（diff 空+复绿 EXIT）全部 `>>` 追加进 raw log 物理落档。
5. **报告**：写 scripts/audits/g5-impl-report.md——含：迁移行数与 rename
   相似度（git diff --stat 由主控终验，你可用 `git status` 只读核对）、
   改写行逐条清单、变异红证 raw 引用、§3.1 复核句、超票面自裁申报栏。

## 四、DoD（完成定义）

- [ ] verify 全链 EXIT=0（真退出码物理在 raw log 末行，如 `echo "G5_VERIFY_EXIT=$?" >> <log>`）。
- [ ] 变异红证 M1/M2 两段 raw 在档（红 EXIT+还原 diff 空+复绿）。
- [ ] 受锁链 unlock→改→generate+apply 闭环，manifest 与改动同步。
- [ ] 计数落笔前脚本实测（行数/处数禁凭印象）。
- [ ] 无 TODO/FIXME/placeholder 新增；中文 UTF-8 可读。

## 五、禁令

- 禁 git commit/branch/registry 改写（主控收口职责）；禁扩面（不动清单外
  文件——含 e2e 两 spec 的注释/字符串）；禁改用例断言/数量；禁新依赖；
  禁 `node -e` 多行脚本（shell 隔层四坑——探针一律 Write 文件后 node 跑）；
  自产 .mjs 探针写完即时 locks:generate+apply 且须过自身 lint（batch 16 教训①）。

## 六、申报义务（超票面决定全量申报，报告§自裁栏）

任何超出本简报清单的文件触碰/行改写/工具探针新增，逐条列「决定+理由+
影响面」，供门一对抗拷问。卡住即停工申报（两次停工先例=主控裁决链处置），
禁自行放宽。
