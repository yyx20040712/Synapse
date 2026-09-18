# F-GEOM-01-G2 实现票六段简报（保存链单源门+死面收敛——战役唯一行为变更票）

> 派发档位：ops-executor 绑定子代理（GLM5.3flash $max）。主控=GLM5.3 max（派发+门审+收口）。
> 依据：tickets/registry.ts F-GEOM-01-G2（id 强票）+设计书 §2.4/§3.5/§5.2/§5.4
> （docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md）+
> **受锁面先行对账表 scripts/audits/g2-assertion-reconciliation.md（必读——测试改写逐例定法）**。
> 工作区：E:\class\智慧水务\Synapse_remake（相对路径以此为基）。

## ① 任务面（三项 src 变更+INV 修订+四测试文件改写）

**T1 保存门（唯一行为变更）**：src/renderer/features/reader/selection-evaluate.ts
evaluateCore——itemChainFor 返 null（item===null）时现行走「paint DOM 回退+挂 DOM 形状
pending」（:310-313 else 臂 paint；:320-321 工具条+setPending 三元 else 臂传 DOM anchor）。
改为：

```ts
if (item !== null) {
  setPaint({ root: anchorRoot!, rects: item.rects, bands: calibrateBandsWithSpans(textLayer, item.bands, pixelBoxOf(textLayer)) })
} else {
  // [F-GEOM-01-G2 保存门] item 链失败＝仅显示不入库（设计书 §2.4）：paint 照渲
  // DOM 回退形状（视觉连续）；pending=null 不挂工具条＝无保存入口（「所见≠所存
  // 时不给保存入口」）；诊断单源＝itemChainFor 三因 warn（零新增 warn 位）
  const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
  setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })
  if (!visualOnly) setPending(null)
  return
}
```

尾段 pending 构造收窄（三元删除——else 已 return，item 非空收窄成立）：
`setPending({ anchor: { ...anchor, rects: item.rects }, pageNo: pageNo!, x, y })`。
G2 降级门分支（:298-306）与四守卫**零改**；visual 路径零改。

**T2 probeOffsetLen 收敛**：anchor-serialize.ts probeTextLength（:239-258，私有）加
`export`；selection-evaluate.ts 删本域复刻 probeOffsetLen（:159-176）改 import
（anchor-serialize 已在 import 列表 :72——在该行加 probeTextLength），两调用点
（:214-215）改名。两函数体逐字同源（已核），语义零变。

**T3 rectsFromRange 死面删除**：annotation-anchor.ts 删导出（:152-174）+头注两处
（:9 行为层 bullet、:30 导出面列表）移除 rectsFromRange；tests/unit/renderer/
annotation-anchor.test.ts 删用例（:73-85）+import 列表移除（:7）。全仓 src 零其他
消费（主控 grep 实测——你复测后落报告）。**删除序：先删 src 导出（跑该测试文件证
import 悬空红）→再删测试用例复绿**——证该测试是唯一消费面。

**T4 INV-58 修订**（docs/invariants.md，受锁）：行为列在「（INV-60）」后插入：
`；**[F-GEOM-01-G2 保存门，2026-09-18] selection 全量评估 item 链失败（页项缺失/偏移对账失败/计算异常三因）＝仅显示不入库**：paint 照渲 DOM 回退形状（视觉连续）＋pending=null（不挂工具条＝无保存入口）——「所见≠所存时不给保存入口」，保存链落库 rects 恒为项族形状（原 pending=DOM 形状 anchor 可入库的接缝闭合，设计书 §2.4/§2.2 序列⑤）；诊断单源＝itemChainFor 三因 warn`；
测试列（第 4 列）末尾补：`；G2 保存门锚＝selection-item-chain.test 回退①改写（工具条 null——变异红证在档）`。其余三列零改。

**T5 头注随票重写**（selection-evaluate.ts 四处）：
- :43-45 回退路径 bullet →「回退（三因）＝仅显示不入库（F-GEOM-01-G2 保存门）：paint 照渲 DOM 量测产物（视觉连续）+pending=null 无保存入口+warn 单源（itemChainFor 三因）」；
- :53-54 stale seam 自述（F-A8 前时态）→ 重写：AnnotationLayer 重锚主链自 F-A8 门 2 起已项几何族（存量 rects S3b 回退+显式回退层语义=INV-58/档 2 登记）；本行旧「票外边界」自述随 G2 消除（设计书 §2.6 交互点 5）；
- :62-64 probeOffsetLen 复刻注 →「probeTextLength 消费自 anchor-serialize 导出面单源（F-GEOM-01-G2 收敛，本域复刻已删）」；
- :65 selection-layer.test 注「预计零改」→「G2 起含页项桩（对账表 A——回退态不挂工具条）」。
anchor-serialize.ts :34 →「matchAt/locateQuote/CONTEXT_CHARS 保持模块私有；probeTextLength 经 F-GEOM-01-G2 导出（selection-evaluate 快路径单源消费——本域复刻已删）」。

**T6 测试改写**（按对账表 A/B/C/D 逐例执行，此处只列要点）：
- selection-layer.test.tsx：beforeEach 加 `usePageItemsStore.getState().clear()`+import
  （store+PdfTextItem/PdfTextContent type，自 '../../../src/renderer/features/reader/
  PdfPageCanvas'——G1 后类型再导出在位）；新增 seedRegistry/mkItem/mkText 助手（crib
  selection-item-chain.test.tsx:63-76）；8 个「工具条在场」用例（P1/P3/F-12b/F-12c/P4/
  P5/P6/F-A4）各加一行 `seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))`
  （fixture 页 2 文本对账）。断言零改。
- selection-item-chain.test.tsx 回退① 改写：标题→`回退①页项缺失：注册表空 → DOM 回退仅显示不入库（保存门 F-GEOM-01-G2）——paint=span 量测盒 top≈25.25% 视觉连续+工具条 null（无保存入口）+console.warn 不静默`；断言：rect 在场 top≈(200/792)*100 不变＋`expect(toolbar()).toBeNull()`（翻转）＋warn 断言不变＋`expect(toastSpy).not.toHaveBeenCalled()` 保持。
- selection-paint.test.tsx：beforeEach 加 store clear+import；S1b/S2/S5/c 面 3 例各补
  `seedRegistry(1, mkText([mkItem(<对应页文本>, 72, 700)]))`（makePage('1',…,'alpha beta
  gamma delta')/'alpha beta'——文本对账）。断言零改。S1/S1c/a1/a2/c1/b 面/AnnotationLayer
  例零改零桩（paint-only 走 DOM 回退照渲）。
- annotation-anchor.test.ts：见 T3。
- **豁免清单** scripts/test-surface.exemptions.json entries +2 条（JSON 逐字）：
```json
{"file":"tests/unit/renderer/selection-item-chain.test.tsx","caseTitle":"回退①页项缺失：注册表空 → DOM 量测链兜底（span 量测盒 top≈25.25%=200/792≠项链 10.61%——判别性）+console.warn 不静默+零功能损失（工具条在）","reason":"F-GEOM-01-G2 保存门行为变更（设计书 §2.4/§2.1 行 3）：回退态=仅显示不入库，工具条（保存入口）断言翻转，标题随新语义改写","rulingLink":"docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md#2.4"},
{"file":"tests/unit/renderer/annotation-anchor.test.ts","caseTitle":"rectsFromRange：返回归一化矩形（0..1）","reason":"F-GEOM-01-G2 死面收敛③（设计书 §3.5 清单①）：rectsFromRange src 零消费，唯一直测面随导出删除（死代码即删，候选项经双门裁）","rulingLink":"docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md#3.5"}
```

## ② 约束与边界

- 改动面白名单（超面=超票面申报）：src/renderer/features/reader/{selection-evaluate.ts,
  anchor-serialize.ts, annotation-anchor.ts}＋docs/invariants.md＋scripts/test-surface.
  exemptions.json＋tests/unit/renderer/{selection-layer,selection-item-chain,
  selection-paint,annotation-anchor}.test.*＋scripts/audits/g2-*（证据件）。其余零触。
- **禁 git 提交/branch/registry/relay.md**（主控收口职责）；禁动 baseline JSON（重冻结
  =G11）；禁改本简报外测试断言（对账表已逐例定法——发现对账表与实际冲突即停下报告，
  不得自行扩面）；禁引入新依赖；禁改 src/shared。
- 受锁面 6 件在 locks manifest——改前 `npm run locks:unlock`，全部实现+验证毕后
  `npm run locks:generate && npm run locks:apply`（一轮走完；主控门审处置若再触受锁
  面由主控再走链）。
- Node 24（volta pin——直接 node/npm 即可，shell 已在项目内）。

## ③ TDD 义务（红→绿→断言级变异红证，全程 raw 落档 scripts/audits/g2-*.log）

1. **首红**：先改写 selection-item-chain.test.tsx 回退①（新语义：工具条 null）→
   `npx vitest run tests/unit/renderer/selection-item-chain.test.tsx` → **RED**（现行
   src 挂 DOM pending→工具条在场）→ raw 落档 g2-red-fallback1.log（`echo "RED_EXIT=$?" >> ` 形态）。
2. **绿**：实现 T1~T6 → 全量 `npx vitest run` 绿（170 文件/1745 用例基线±本票变更——
   用例数=1745+1-1=1745？回退①改写不增减用例数、rectsFromRange 删 1 → 预期 1744；
   落报告以实测为准）→ raw g2-green-full.log。
3. **变异红证**（cp 备份法——禁 git checkout，未提交面保护；还原后 diff 空证）：
   - **M1 保存门**：cp selection-evaluate.ts 备份→保存门 else 臂改回挂 DOM pending
     （setPending({anchor,pageNo,x,y})）→跑 selection-item-chain →回退①工具条 null
     断言 **RED**（证明新断言钉住行为）→cp 还原→`git diff --stat`（或 fc）证零残留→复跑绿。
     raw=g2-mutation1-savegate.log。
   - **M2 probeTextLength 单源**：cp anchor-serialize.ts→删 export 关键字→
     `npm run typecheck` **RED**（selection-evaluate import 悬空 TS2305）→还原→diff 空
     →复绿。raw=g2-mutation2-probe.log。
4. 每步 EXIT 行物理写进 log（`echo "X_EXIT=$?" >> g2-xxx.log`）——转述无效。

## ④ 验证义务（全绿后报告；EXIT 全落 raw）

- `npm run verify`（quality+test-surface:check+tickets+locks+lint+typecheck+test+build）
  ——**在 locks:apply 之后跑**，全链 EXIT=0；raw=g2-verify-final.log。
- 锚定回归网定向：`npx vitest run tests/unit/renderer/selection-evaluate.test.tsx tests/unit/renderer/selection-layer.test.tsx tests/unit/renderer/selection-layer-fa12.test.tsx tests/unit/renderer/selection-item-chain.test.tsx tests/unit/renderer/selection-geometry.test.ts tests/unit/renderer/selection-paint.test.tsx tests/unit/renderer/selection-mode.test.tsx tests/unit/renderer/annotation-anchor.test.ts tests/unit/renderer/annotation-merge.test.ts` 绿（raw 并入 green log 可）。
- e2e 默认门：`npm run test:e2e`（43 例基线——build 已由 verify 走过可直接跑）EXIT=0；
  raw=g2-e2e-appgate.log。corpus-export 单例超时红→定向复跑 2 次绿=负载敏感 flake 口径
  （batch 11 先例），如实落档+报告注明，不算阻塞。
- test-surface:check 输出核对：exemptions entries=2 hits=2 stale=0（raw 在 verify log 内）。

## ⑤ 交付与报告

- 报告落 **scripts/audits/g2-impl-report.md**：五层规约履行情况/逐项交付（±行数用
  `git diff --numstat` 逐文件实测——禁凭印象）/TDD 三段实录（含还原 diff 空证据）/
  超票面自裁申报段（无则写「无」）/尾栏 `FINDINGS: B=0/W=0/N=0/VERDICT=DELIVERED`
  （有遗留改数）。计数类数字全机测（wc/grep/vitest 摘要）。
- 证据件：本简报列的 g2-*.log 全部落 scripts/audits/（.log 被 .gitignore 拦不影响本地，
  入库由主控收口 git add -f）。

## ⑥ 铁律提醒

- 测试是锁定的合约：本票改测试=票面授权面（对账表逐例），**对账表之外的任何断言
  变化都属违规**——发现测试本身有错→停下报告，不得自行改过。
- 变异还原一律 cp 备份法；每单元完成即存档 EXIT；中文注释 UTF-8；不删检查不放宽断言。
- 卡住即停报告卡点（报告文件+终态 log），禁带病交付。
