# F-GEOM-01-G4 实现简报（六段）——目录化 M1：state/ 10 文件迁移

> 派发：主控（GLM5.3 max）→ 实现者 ops-executor（GLM5.3flash $max 绑定）
> 战役：F-GEOM-01 几何产链统一+reader 子域重组；设计书单源=
> docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md（§3.2/§3.4 M1 行）
> 本票性质：**零行为变更纯迁移票**（[locked-change][test-refactor] 双尾注）

## ① 任务定位（票面五层规约）

registry 票（:295 原文）：`F-GEOM-01-G4｜file=src/renderer/features/reader/reader.store.ts｜
目录化 M1=state/ 域迁移（设计书 §3.2/§3.4；4/11）：10 文件迁 reader/state/——
reader.store/tab-dirty/useActiveTab/annotation-undo/page-layer-z/ai-notes.store/ai-notes-phase/
PdfDocProvider/CorpusExtractor/scroll-converge；受锁面随步同链 unlock→改→apply；
域内单向核验=state 不依赖任何域（§3.1 置底）；翻 done 时 file 字段随迁改写
state/reader.store.ts；验收=verify 全链；[locked-change][test-refactor]`

**板注义务（batch 12 门二 P1-3 + batch 15 板注，随步兑现）**：
scripts/check-quality.mjs 两行随步改写——:96 COMPOSITION_ROOT_ALLOW 键
`src/renderer/features/reader/tab-dirty.ts`→`src/renderer/features/reader/state/tab-dirty.ts`；
:98 值 `reader/CorpusExtractor`→`reader/state/CorpusExtractor`（漏改=M1 verify quality 红）。

## ② 侦察事实（主控三探针实勘，raw=scripts/audits/g4-recon-{imports,tests,internal}.log）

**迁移对象（10 文件，wc 实测行数）**：reader.store(483)/tab-dirty(117)/useActiveTab(26)/
annotation-undo(196)/page-layer-z(29)/ai-notes.store(72)/ai-notes-phase(37)/
PdfDocProvider(98)/CorpusExtractor(311)/scroll-converge(76)，合计 1445 行。
目标目录=src/renderer/features/reader/state/（新建）。

**置底核验已过（internal 探针）**：十文件对外相对 import 仅
api/client、renderer/shared/ui/toast-store、src/shared 三族+tab-dirty→notes.store
（组合根白名单例外）——零 reader 域内其他文件依赖，§3.1 置底成立。
迁移后深度修正（../ 加深一级，共 8 行）：
- reader.store.ts：`../../api/client`→`../../../api/client`；`../../shared/ui/toast-store`→`../../../shared/ui/toast-store`
- annotation-undo.ts / ai-notes.store.ts：`../../api/client`→`../../../api/client`（各 1 行）
- CorpusExtractor.ts：`../../../shared/{app-error,ipc/schemas,models/annotation}`→`../../../../shared/...`（3 行）
- tab-dirty.ts：`../notes/notes.store`→`../../notes/notes.store`（1 行）
- useActiveTab.ts 的 `./reader.store` 与 tab-dirty 的 `./reader.store` **不变**（域内共迁）；
  PdfDocProvider 的 pdfjs-dist 包名 import 不变（INV-16 白名单随路径走，见④）

**src 消费面改写 `./x`→`./state/x`（imports 探针）**：49 行、32 文件——
reader 留驻 30 件（reader.store×17+useActiveTab×6+page-layer-z×6+PdfDocProvider×7+
ai-notes.store×3+scroll-converge×3+ai-notes-phase×2+annotation-undo×2+tab-dirty×1 的
模块对，文件去重后 30）+跨域 2 行：src/renderer/app/App.tsx:12
（`'../features/reader/tab-dirty'`→`'../features/reader/state/tab-dirty'`）、
src/renderer/features/settings/useExportCorpusEvents.ts:32
（`'../reader/CorpusExtractor'`→`'../reader/state/CorpusExtractor'`）。

**tests 受锁面（tests 探针，精确到行）**：30 文件/41 引用行（含 vi.mock 与动态 import；
tests/utils/factories.ts:20 在内）。**票面申报勘正（票内自裁 1）**：设计书 §3.4 M1 行
与票面写「CorpusExtractor 相关测试 3 件」——实勘 30 件（reader.store 独占 23 行系
设计书起草期漏计；pdf-factory 实为注释提名零 import 面零改）。本票
[locked-change][test-refactor] 双尾注已覆盖 tests/** 改写权限；**纯路径改写零用例
增删**=指纹门/豁免面零变化预期。改写形态统一：
`'../../../src/renderer/features/reader/<mod>'`→`'../../../src/renderer/features/reader/state/<mod>'`
（分层不变仅插 `state/` 段；factories.ts 为 `../../src/...` 前缀同理）。

**配置受锁面 2+2 行**：eslint.config.js :89/:92（INV-16 override files 四路径中的
PdfDocProvider/CorpusExtractor 两行→`reader/state/` 前缀；PdfPageCanvas/TextLayer
两行属 M6a **禁动**）+check-quality.mjs :96/:98（见①板注义务）。
**registry 9 行随迁=主控收口义务，实现者禁触**（tickets/registry.ts :111/:146/:148/
:150/:170/:208/:230/:232/:295 的 file 字段）。

## ③ 实现序（TDD——零行为迁移票的等价红绿闭环）

1. **基线锚**：`npm run verify` 预跑一次 EXIT=0（raw 落 g4-baseline-verify.log——
   若非 0 停工报告，禁在红基线上动土）。
2. **受锁链开锁**：`npm run locks:unlock`（一次；后续所有受锁改写共用本窗口）。
3. **物理迁移**：`mv` 十文件入 state/（新目录）——**禁用 git mv/git add**
   （你无 git 权限；主控收口时按 rename 相似度识别历史）。
4. **深度修正**：十文件内 8 行 ../ 加深（见②精确清单）。
5. **src 消费面**：32 文件 49 行 `./x`→`./state/x`（跨域 2 行见②）。
6. **tests 受锁面**：30 文件 41 行插 `state/` 段（见②统一形态）。
7. **配置两件**：eslint.config.js 两行+check-quality.mjs 两行。
8. **复锁**：`npm run locks:generate && npm run locks:apply`（manifest 同步本轮全部
   受锁件新 sha；探针三件主控已预登 341 条，本轮不重复）。
9. **全量绿**：`npm run verify` EXIT=0（raw=g4-verify-final.log，真退出码物理落档
   `echo "G4_VERIFY_FINAL_EXIT=$?" >> log`）；test-surface 指纹门数字零漂移
   （基线 187 文件/1789 用例/5411 断言——G3 收口态；漂移即停工报告）。
10. **变异红证两条**（cp 备份法全程，禁 git checkout）：
    - M1（src 面）：任选一 src 消费件（如 TabBar.tsx）把 `./state/reader.store`
      改回 `./reader.store` → typecheck 红（TS2307）→ cp 还原 diff 空 → 复跑绿；
    - M2（tests 面）：任选一测试件（如 reader.store.test.ts）把 state/ 段删回旧径
      → vitest 红（模块解析失败）→ cp 还原 diff 空 → 复跑绿。
    raw=g4-mutation{1,2}.log（含还原 diff 空+复绿 EXIT）。

## ④ 硬边界（违反即返工）

- **零行为变更**：除路径与 ../ 深度外**一个字符都不改**（注释/空行/语句顺序全保真；
  头注不动——头注随迁口径属 G11 收官票）。
- 禁触 M6a 面：PdfPageCanvas/TextLayer 的 eslint 两行；禁触 registry/invariants.md/
  relay.md/设计书；禁动 tests 用例结构（describe/it/断言零增删改——只改 import 路径行）。
- 禁新依赖；禁 git（add/commit/checkout/mv 一律禁；只读 `git diff --stat`/
  `--numstat` 允许用于自报）；禁建新自动化。
- shell 隔层四坑：探针/批量改写一律 Write 文件后 node 跑（禁 node -e 多行）。
- 计数自报一律机器实测（numstat/grep -c），禁凭印象。

## ⑤ 验收门（DoD）

- [ ] verify 全链 EXIT=0（真退出码物理在 raw 末行）
- [ ] 指纹门 187/1789/5411 零漂移+豁免面零新增
- [ ] 变异红证两条 raw 在档（红+还原 diff 空+复绿三段俱全）
- [ ] `git status` 受锁面全落在 unlock→apply 链内（apply 后无残留可写态）
- [ ] state/ 恰 10 文件 1445 行（wc 复核）；旧路径零残留
  （`grep -r "features/reader/\(十模块名\)" src tests eslint.config.js scripts/check-quality.mjs`
  ——除 M6a 两行外零命中）
- [ ] 报告 g4-impl-report.md（±行数 numstat 实测+超票面自裁清单+证据件索引）

## ⑥ 申报义务（超票面决定全数自裁申报，门审拷问面）

已预登记自裁：①受锁面勘正 3 件→30 件（②详述）；②mv 用文件系统而非 git mv
（git 权限边界+rename 相似度由主控收口认领）。其余超票面决定随报告逐条申报。
