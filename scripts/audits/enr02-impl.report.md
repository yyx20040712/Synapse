# SR2-ENR-02 实现者报告（venueTier 映射与 manifest 装配）

- 实现者：三屋模式实现者子代理（GLM-5.3）
- 日期：2026-08-28；环境：node v24.9.0 便携版（tools/node24，全程 PATH 前缀）
- 基线：HEAD=6e5a3b2（ENR-01 收口）；verify 基线 88 文件 639 用例 / locks 136

## 一、实现摘要

1. **src/shared/venue-tier.ts**：STUB 替换为真实实现——`VenueTier` 三档类型
   （T1=领域顶刊/T2=领域主力刊/T3=一般刊，档位语义头注单源）、`VENUE_TIER_MAP`
   种子表 5 条（Readonly，示例级）、`venueToTier(venue)`（仅 trim 归一+精确等值，
   ''/纯空白/未命中→null）。头注五层规约（票面任务书）原样保留。
2. **corpus.assemble.ts**：`frontMatter()` 兑现预留位——noteCount 后逐行装配
   `citedByCount`（!== undefined && !== null 才装配，0 是合法值禁 falsy）+
   `venueTier`（venueToTier 命中装配，未命中整键省略）；import venueToTier
   （shared 单向依赖）。**头指针 `// b3: P7-C` 未动**；头注第 17-20 行「数据面
   未落地——v1 整键省略」的过时描述同步为兑现口径（接缝归责：行为变声明同步）。
3. **corpus.export.service.ts**：`ManifestPaper` 增两可选字段
   `citedByCount?/citedByFetchedAt?`；`finishPaper` 装配处以 citedByCount 为
   钥匙成对展开（无 count 则两键皆无——N-r2e 配对省略）。schemaVersion 恒 1。
4. **interface-template.ts**：INTERFACE.md 模板新增「含金量指标（可选字段）」
   节——两字段可选性+manifest 成对口径+消费口径（领域基线归一/自引处理归
   AI 侧）+W6 sha 消费者提示原文（「contentSha 幂等以同缓存状态为前提——
   增量对比消费方须知」）。
5. **docs/adr/0011-*.md**：修订记录节尾追加 v1.2 补注第 7 条（W5 原文：
   venueTier v1 实现档=受锁常量修订制，D3-A 2026-08-27 用户拍板；「允许用户
   改」UI 面留 D3-B 档；含兑现口径与 schemaVersion 恒 1 说明）。

## 二、文件清单（对照票面逐项——删减面自查）

| 票面文件 | 处置 | git diff |
| --- | --- | --- |
| src/shared/venue-tier.ts（新·注册文件） | 改：STUB→实现（头注规约保留） | +24/-2 |
| corpus.assemble.ts（改·非锁） | 改：装配接线+头注预留位描述同步 | +27/-4 |
| corpus.export.service.ts（改·非锁） | 改：ManifestPaper+finishPaper 装配 | +13/-1 |
| interface-template.ts（改·非锁） | 改：指标口径节+W6 | +14 |
| docs/adr/0011-*.md（v1.2 行·非锁） | 改：修订记录第 7 条 | +10 |
| tests/unit/services/corpus.export.test.ts（受锁扩） | 改：+2 用例+seedMetrics helper+INTERFACE_MD import | +69 |
| tests/unit/services/corpus.assemble.test.ts（受锁扩） | 改：+3 用例（既有块内，W4） | +42 |
| golden 夹具（受锁改） | 含缓存值篇=两宿主夹具内构造（assemble 层 PaperDetail 字面扩展；export 层 seedMetrics 真库 UPDATE） | 含于上两行 |
| tests/unit/shared/venue-tier.test.ts（新入锁） | 新：8 用例裸 describe | +47（新文件） |
| tickets/registry.ts | **未动**（禁令：控制面单写者=主控） | 0 |

- `git diff --stat`：7 文件 +189/-10 +1 新测试文件，全部在票面清单内，**零范围蔓延**。
- e2e corpus-export.spec.ts：**零触碰**（票面预判零涟漪成立——既有夹具全为
  缺省形，缺省形 golden 逐字节一致证明 md 零漂移；仍补跑 e2e 20/20 复核）。

## 三、TDD 红证（首红）

- 命令：`npm run test -- tests/unit/shared/venue-tier.test.ts
  tests/unit/services/corpus.assemble.test.ts tests/unit/services/corpus.export.test.ts`
- 结果：**12 failed | 26 passed**——红因全部=功能缺失（VENUE_TIER_MAP/
  venueToTier 未实现+STUB 未删+装配未接线+INTERFACE 未声明），非笔误。
- 明细：venue-tier.test 8 红全量 + assemble「有值形/0 值边界」2 红 +
  export「装配两形/INTERFACE 声明存在性」2 红。缺省形守卫用例属恒真守卫面，
  其红证由变异 2/3 补（见下）。
- 输出留存：`scripts/audits/enr02-first-red.log`。

## 四、测试证据

- 目标绿：3 文件 38 用例全过（venue-tier 8/assemble 18/export 12）。
- 收口 verify（quality+tickets+locks+lint+typecheck+test+build 全链）：
  **exit=0**，`Test Files 89 passed (89)`、`Tests 652 passed (652)`
  （=基线 88/639+13 新：venue-tier 8+assemble 3+export 2）。
- e2e 补跑：**20 passed，exit=0**（corpus md 装配面消费方级复核）。
- 真退出码行落盘：`scripts/audits/enr02-impl-verify.log`（verify 段+e2e 段各一行 `exit=0`）。

### 变异红证（断言级，cp 备份法还原，禁 git checkout）

| # | 变异（单 token） | 恰中红 | 还原 |
| --- | --- | --- | --- |
| 1 | venue-tier.ts `VENUE_TIER_MAP[venue.trim()]`→`[venue]`（删 trim） | 1 红（「仅 trim 归一」） | diff 空 ✓ |
| 2 | assemble.ts citedByCount 条件首 `!== undefined`→`!== null`（缺省篇误装配 undefined 行） | 3 红（golden 全量+缺省形+export 两形） | diff 空 ✓ |
| 3 | assemble.ts 装配行 `venueTier:`→`venueTierX:`（属性名） | 2 红（有值形+export 两形） | diff 空 ✓ |
| 4 | export.service.ts `citedByFetchedAt: ...citedByFetchedAt`→`...citedByCountSource` | 1 红（export 两形 fetchedAt 断言） | diff 空 ✓ |
| 5 | interface-template.ts `同缓存状态`→`同缓存`（W6 字面） | 1 红（INTERFACE 声明存在性） | diff 空 ✓ |

- 作废记录：变异 3 首次设计 `tier !== null`→`=== null`（否定翻转）致
  yamlStr(null) TypeError 红面 6+ 用例（error 型非断言红），不满足「恰中」，
  作废重做为属性名变异。
- 每轮均 `cp` 备份→变异→红→`cp` 还原→`diff` 空输出（已入会话记录）。

## 五、locks 实录

- 改前 `npm run locks:unlock`：解锁 136 个文件。
- 新增受锁路径 tests/unit/shared/venue-tier.test.ts：`npm run locks:generate`
  →「仅生成 manifest（137 条），未设只读」；`npm run locks:apply` →
  「已锁定 137 个文件（只读）。manifest 记录 137 条」。
- 136→137（+venue-tier.test.ts），与简报预期 137 完全一致；manifest 含
  venue-tier.ts（原有）。当前=apply 态。

## 六、自裁申报（票面下放项+超票面决定）

1. **种子表内容自裁**（票面下放「3~5 条示例级」）：取 5 条——'Nature Water'/
   'Environmental Science & Technology'=T1，'Desalination'/'Journal of
   Hydrology'=T2，'Water'=T3。**刻意避开 'Water Research'**：它是既有 golden
   夹具（corpus.assemble.test.ts detail.venue）的 venue，若入表则既有缺省形
   golden 漂移，违反主控裁决 4「既有无指标篇保持缺省形」。学术口径上
   Water Research 实为水领域顶刊而不在 T1，属夹具兼容权宜——内容增量走受锁
   常量修订制（D3-A 档口已在 ADR v1.2 声明），修订时同步 golden 即可。
2. **头注描述同步**（corpus.assemble.ts 第 17-20 行）：「数据面未落地——v1
   整键省略」已过时（ENR-01 已落地），按接缝归责同步为兑现口径。头指针
   `// b3: P7-C` 与 [SR2-C-02] 裁决链头注主体未动（票面 N2）。
3. **manifest 配对边缘语义**：装配条件以 citedByCount 为钥匙（票面单向蕴涵
   「无 citedByCount 则无 citedByFetchedAt」）。若 DB 被外部篡改致 count 非
   null 而 fetched_at null（INV-28 违例态），detailById 透出 citedByFetchedAt=
   undefined，JSON.stringify 丢 undefined 键产生「有 count 无 fetchedAt」条目
   ——选择不静默丢 count（count 是主数据），不为不变量违例态增设防御分支。
4. **测试面扩展**（票面文化层 ④ 项基础上的同语义边界扩展）：venue-tier.test
   除票面四类（命中/未命中/空串/trim）外加「纯空白串/内部空白参与等值/不做
   toLowerCase（N-r2b）/三档齐备/全表往返/STUB 删除守卫」；assemble 加 0 值
   边界用例（ENR-01「0 是合法缓存值」判空铁律在装配面的延伸锚）。
5. **验收项「真库导出抽查」处置**：需真机 UI 手动操作（增强+导出会话），
   实现者档以单测真库夹具覆盖（corpus.export.test 两形用例走 createTestDb
   真 sqlite+真导出会话+真 manifest 落盘断言）；真机抽查留主控/人工验收。

## 七、疑虑（供门一/门二审查）

1. 种子表学术准确性为示例级（机制为主——票面原文），Water Research 缺席系
   夹具兼容权宜（见自裁 1），是否在收口前补入（连带改既有 golden 缺省形断言）
   请主控裁决——本单按「既有无指标篇保持缺省形」口径未补。
2. 「manifest citedBy 成对省略」是否需独立 INV 条目：现为 N-r2e（票面）+
   ManifestPaper 注释+ADR v1.2 第 7 条+测试断言三层锚定；INV-28 已登记
   detailById 透出配对规则（manifest 装配是其下游消费）。倾向不新增，
   请门审确认。
3. verify log 中 pdfjs-dist 动态/静态双导入 warning 为既有基线噪声（非本单
   引入），未处置。
