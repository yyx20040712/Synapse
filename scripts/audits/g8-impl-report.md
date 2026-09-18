# F-GEOM-01-G8 实现者报告（目录化 M5=panels/ 域迁移，零行为纯迁移）

> 票面=tickets/registry.ts:299 F-GEOM-01-G8（status 仍 open——翻 done 归主控收口）。
> 简报=scripts/audits/g8-impl-brief.md；设计书=docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md §3.4 M5。
> 本票无 commit（简报铁律：禁 git commit/push，主控收口统一提交）——git mv 的 8 个 rename 已入 index（R 标记），实现进度以工作树+本报告为准。

## 0. 开工技能清点（宪法会话开工纪律）

- 用：executing-plans（六段简报逐步执行）；verification-before-completion（七关卡+变量法物理落档）；test-driven-development（零行为迁移票的红绿闭环=变异红证 M1/M2 形态）。
- 不用：subagent-driven-development（单一调用者铁律，禁派子代理）；git-workflow-and-versioning（禁 commit/push）；browser/webapp/e2e 系技能（零行为口径，e2e 不跑——义务归 G11）；frontend-design（零行为纯迁移，无视觉面）；systematic-debugging（全程零卡点未启用）；其余语言/框架技能（非本票面）。
- 配置自查：ops-executor 绑定档 GLM5.3flash $max（派发简报头注同口径）。

## 1. 交付清单（按单元）

| 单元 | 内容 | 产物 |
| --- | --- | --- |
| U1 | git mv 八件 reader/ → reader/panels/（R rename 入 index）+A 段 21 行深度修正+B 段 1 行 | 8 rename + ReaderPageView.tsx:35 |
| U2 | 受锁面：unlock → C 段 tests 5 行/4 件 + E 段 check-quality:97 + F 段 registry 6 行 → generate+apply（358→359） | tests×4 / check-quality.mjs / registry.ts / locks/manifest.json |
| U3 | §3.1 单向核验探针（自产受锁件，同批 lint+generate+apply） | scripts/audits/g8-s31-check.mjs + .log |
| U4 | 全量 verify 七关卡 | scripts/audits/g8-impl-verify.log |
| U5 | 变异红证 M1/M2（cp 备份法，零 git checkout） | g8-impl-mutation1.log+restore / g8-impl-mutation2.log+restore |
| U6 | build 哈希档+panels 回归定向 | g8-build-hash.log / g8-panels-regression.log |
| U7 | 本报告 | g8-impl-report.md |

### git diff --numstat 逐行实测（-M rename 检测，2026-09-19 实跑）

```
1	1	scripts/check-quality.mjs                                    ← E 段
1	1	src/renderer/features/reader/ReaderPageView.tsx              ← B 段
1	1	src/renderer/features/reader/{ => panels}/AiNoteGroupList.tsx
4	4	src/renderer/features/reader/{ => panels}/AiNotesSection.tsx
5	5	src/renderer/features/reader/{ => panels}/AiNotesStatus.tsx
1	1	src/renderer/features/reader/{ => panels}/FragmentNotesList.tsx
3	3	src/renderer/features/reader/{ => panels}/OutlineAside.tsx
1	1	src/renderer/features/reader/{ => panels}/OutlinePanel.tsx
1	1	src/renderer/features/reader/{ => panels}/OutlineThumb.tsx
5	5	src/renderer/features/reader/{ => panels}/ReaderNotesPanel.tsx
1	1	tests/unit/renderer/ai-note-collapse.test.tsx
1	1	tests/unit/renderer/ai-notes-section.test.tsx
1	1	tests/unit/renderer/outline-aside.test.tsx
2	2	tests/unit/renderer/reader-notes-panel.test.tsx
6	6	tickets/registry.ts                                           ← F 段
```

合计：8 rename（A 段改写 21 行=3+1+1+5+4+1+5+1，与简报 ②A「恰 21 行」逐文件对上）+B 1+C 5+E 1+F 6=34 改写行；八件 rename 检测全保（相似度 99%，仅 import 行差异）。域内互引 7 边零改写（OutlinePanel→OutlineThumb 等——同迁同层）。D 段跨特性=零（实勘复核：lineage 命中系注释提名非 import）。

### wc -l 八件对照表（迁移前后同值=纯移动零增删）

| 文件 | 设计书 §3.2 | wc -l 实测 | 差 |
| --- | --- | --- | --- |
| OutlineAside.tsx | 157 | 156 | -1 |
| OutlinePanel.tsx | 184 | 183 | -1 |
| OutlineThumb.tsx | 78 | 77 | -1 |
| ReaderNotesPanel.tsx | 208 | 207 | -1 |
| AiNotesSection.tsx | 108 | 107 | -1 |
| AiNoteGroupList.tsx | 198 | 197 | -1 |
| AiNotesStatus.tsx | 156 | 155 | -1 |
| FragmentNotesList.tsx | 92 | 91 | -1 |
| 合计 | 1181 | 1173 | -8 |

## 2. 验证证据（七关卡+附加关，全部真退出码）

| # | 关卡 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | typecheck | EXIT=0 | verify 链内绿 + M1 复绿独立跑 M1_REGREEN_TYPECHECK_EXIT=0 |
| 2 | lint | EXIT=0 | verify 链内 `eslint .` 绿（G8_IMPL_VERIFY_EXIT=0） |
| 3 | unit 全量 | Test Files 170 passed (170) / Tests 1744 passed (1744)=基线零漂移 | g8-impl-verify.log:3835-3836 |
| 4 | build+产物哈希恒等 | EXIT=0；index-D3egZtl2.js 1,392.72 kB（sha256 9c3b8b84…3f2a，1,402,437 B）+index-BfpEygSE.css 52.49 kB（sha256 dcace2e7…8a97d5，59,923 B）与基线同名同尺寸（产物名即内容哈希，恒等成立） | g8-impl-verify.log 尾 + g8-build-hash.log |
| 5 | 指纹门 | cur=187 files·1789 cases·5411 assertions·skipSites 15（base 183/1757/5334/15，C_after ⊇ C_before 绿）=187/1789/5411/15 零漂移 | g8-impl-verify.log:27,68 |
| 6 | locks:check | EXIT=0，359 受锁件与 manifest 一致（358→359=自产 s31 探针 +1，已 generate+apply 同步） | verify 链内 + M2_FINAL_LOCKSCHECK_EXIT=0 |
| 7 | verify 全链 | **G8_IMPL_VERIFY_EXIT=0**（变量法物理落档） | g8-impl-verify.log 末行 |
| + | panels 回归定向 4 件 | 4 files/41 tests 全绿，G8_PANELS_REGRESSION_EXIT=0 | g8-panels-regression.log |
| + | §3.1 单向核验 | S31_FINAL_PASS=true（详见 §2.1） | g8-s31-check.log |
| + | 中探针（C 面待改时点） | MIDPROBE_TYPECHECK_EXIT=2 恰 5 错全 tests 旧径、src 面 0 错（A+B 段闭合独立实证） | g8-impl-midprobe.log |
| + | e2e | 不跑（零行为口径，义务归 G11——G1-G7 同裁） | — |

### 2.1 §3.1 单向核验出边表（探针全表，与主控预判 14 边逐边对上）

anchors 4 边：OutlineAside→../anchors/anchor-locate；AiNotesSection→../anchors/anchor-locate；AiNoteGroupList→../anchors/ai-note-style；FragmentNotesList→../anchors/annotation-style。

state 10 边：OutlineAside→../state/reader.store、OutlineAside→../state/useActiveTab；OutlinePanel→../state/PdfDocProvider；OutlineThumb→../state/PdfDocProvider；ReaderNotesPanel→../state/useActiveTab；AiNotesSection→../state/ai-notes-phase、../state/ai-notes.store、../state/useActiveTab；AiNotesStatus→../state/ai-notes.store、../state/ai-notes-phase。

反向边（state|anchors|time|interact→panels）=0；全仓旧径残留（src/tests/scripts/tickets 活代码域，绝对形态 features/reader/X+reader 域内 './X'|'../X' 相对形态+vi.mock 全形态，8 名逐一）=0。

### 2.2 变异红证还原链

- **M1（src 面）**：cp 备份→ReaderPageView:35 回退 './panels/OutlineAside'→'./OutlineAside'→typecheck **EXIT=2**（TS2307: Cannot find module './OutlineAside' 恰中 :35）→cp 还原（M1_RESTORE_EXIT=0）→diff 空（M1_RESTORE_DIFF_EXIT=0）→备份删除（M1_BACKUP_CLEANUP_EXIT=0）→复绿 EXIT=0。四退出码物理落 g8-impl-mutation1.log+g8-impl-mutation1-restore.log。
- **M2（tests 面）**：cp 备份→unlock（只读拦前置解，M2_UNLOCK_EXIT=0）→outline-aside.test:18 回退旧径→定向 vitest **EXIT=1**（Failed to resolve import "../../../src/renderer/features/reader/OutlineAside"——恰为旧径模块解析红）→cp 还原（M2_RESTORE_EXIT=0）→diff 空（M2_RESTORE_DIFF_EXIT=0）→备份删除→**复锁 locks:apply（M2_RELOCK_EXIT=0）后**定向复绿 4 passed/4（M2_REGREEN_VITEST_EXIT=0）→终态 locks:check（M2_FINAL_LOCKSCHECK_EXIT=0，359 一致）。全退出码物理落 g8-impl-mutation2.log+g8-impl-mutation2-restore.log。
- 全程 cp 备份法，零 git checkout；备份副本已删（禁驻留）。

## 3. 自裁申报（超票面决定逐条）

1. **自产探针 g8-s31-check.mjs**（简报 ⑤ 允许"可并入 impl-verify"，我选择独立探针件）：三面核验（出边表/反向边/残留）+lint 自查（S31_LINT_EXIT=0）+locks 同批 generate+apply（manifest 358→359）。理由：可复跑、输出结构化落档。
2. **额外证据件 g8-impl-midprobe.log**：C 面待改时点的 typecheck 中探针（EXIT=2/5 错全 tests/src 面 0 错），不在简报点名日志清单内，属红绿闭环补强证据。
3. **wc -l 八件各 -1（合计 -8）登记 G11 对账债**（简报 ① 明示非本票修正义务，G5/G6/G7 同口径）：设计书 §3.2 行数=无尾换行计数口径，与 wc -l 恒差 1/件。
4. **E 段票面勘误登记**（简报 ②E 已自带勘正，此处报告备案）：票面原文"check-quality.mjs:96-97 两路径"实勘=**单行 :97 键**（:96 tab-dirty=已迁态零触碰）。
5. registry.ts 六行 +/- 逐行目验：唯一差异=file 路径，status 字段值全原样（G8=still open）；grep 计数 38 系 diff 上下文行含 "status" 字样所致（改动行本身含 status 字段文本但值零变化）。
6. 工作树遗留申报：docs/handoff/relay.md（M）与 locks/manifest.json 中主控 recon 探针两件（g8-recon-edges.mjs/g8-fullscan2.mjs 登记）为开工前既有态，非本实现者改动；manifest 现含三件新增（上述两件+我的 s31 探针）=359。

## 4. 边界声明

- 禁区全守：零 commit/push、零 registry status 变更、零断言/用例结构变更（指纹门零漂移实证）、零 test-surface.baseline.json/docs/e2e 注释/dist_new 触碰、零 git checkout。
- 票面与实勘完全相符（A/B/C/E/F 段行号逐一预核后才动刀），无行号漂移、无停工事件。
