# F-GEOM-01-G2 门一审包（隔离对抗审——diff 审计）

> 审阅对象：g2-gate1-diff.patch（同目录，10 个 diff 段=全部已跟踪改动面+附录=未跟踪
> 新件对账表全文；另有未跟踪 g2-impl-brief.md 六段简报/g2-impl-report.md 实现者报告
> ——本轮不随包，审 diff 本身，需要时按下列指纹核对）。岗位：门一（对抗式隔离审，
> 与实现者异构）。产出=B/W/N+VERDICT。

## 一、票面权威（判据来源）

- registry 票 F-GEOM-01-G2（file=src/renderer/features/reader/selection-evaluate.ts，
  [locked-change][test-refactor]）三项+受锁义务：
  ①**保存门**（设计书 §2.4，战役唯一行为变更）：evaluateCore itemChainFor 返 null 时
  setPaint 照渲 DOM 回退形状（视觉连续）+**setPending(null)**（原为 pending=DOM 形状
  anchor）+warn 单源（复用 itemChainFor 诊断）——「所见≠所存时不给保存入口」；
  ②**probeOffsetLen 收敛**：selection-evaluate 复刻 anchor-serialize 私有
  probeTextLength≈15 行→显式导出+复刻删除；
  ③**rectsFromRange 死导出面删除**（src 零消费+受锁测试 1 用例——死代码即删，候选项
  经双门裁）。
  受锁义务：selection-layer.test 14 用例先出断言对账表→保存流用例补页项桩+断言面按
  项族产物更新；指纹门 C 面变更走豁免条目（reason=设计书 §2.4+裁决链），条目>10 呈
  主控复裁；INV-58 修订（保存链条款+selection-evaluate:54 stale 自述重写）随票。
  验收=指纹门 C_after ⊇ C_before+锚定回归网+e2e 默认门。

## 二、交付面（主控 numstat 复核）

10 文件 +112/-88：selection-evaluate.ts +20/-33｜anchor-serialize.ts +3/-2｜
annotation-anchor.ts +1/-26｜invariants.md +1/-1（单行行内两处）｜exemptions.json
+14/-1｜selection-layer.test.tsx +35/-0｜selection-item-chain.test.tsx +2/-2｜
selection-paint.test.tsx +28/-0｜annotation-anchor.test.ts +1/-16｜locks/manifest.json
+7/-7（generatedAt+6 受锁件 sha）。

## 三、对账表口径（受锁改写合法性单源=g2-assertion-reconciliation.md，附录全文在包尾）

selection-layer 14 例=零改 6+补桩断言零改 8；selection-item-chain 6 例=零改 5+改写 1
（回退①：标题+1 断言翻转 not.toBeNull→toBeNull）；selection-paint 17 例=零改 11+补桩
断言零改 6；annotation-anchor=删 1 例（rectsFromRange）+import 收窄。豁免恰 2 条
（≤10 阈值内）。

## 四、实现者申报的证据指纹（raw 在 scripts/audits/g2-*.log，EXIT 行物理在档）

- 首红 RED_EXIT=1（item-chain :215 工具条 null）；T3 删除序证红 T3_STEP1_EXIT=1
  （rectsFromRange is not a function@:77）；
- 全量绿 GREEN_FULL_EXIT=0=170 文件/1744 用例（基线 1745−1）；锚定回归网定向 9 文件
  /98 用例 ANCHOR_NET_EXIT=0；
- 变异 M1（保存门回退）MUT1_RED_EXIT=1+还原 diff 空+复绿 6/6；M2（删 probeTextLength
  export）MUT2_RED_EXIT=2（TS2459）+diff 空+typecheck 复绿；
- verify 全链 VERIFY_EXIT=0（locks:generate+apply 后）；test-surface 输出
  「exemptions entries: 2 hits: 2 stale: 0」；e2e 默认门 43 passed E2E_EXIT=0。

## 五、实现者超票面自裁 3 条（**须对抗拷问**）

1. 全量首跑直跑 npx 未切 node ABI→db 面 22 文件 184 用例假红，按 npm run test 同口径
   重跑全绿（log 重建+偏差说明行）——执行路径失误申报。
2. M2 错误码简报预判 TS2305、实测 TS2459（同语义 import 悬空）。
3. **selection-layer 夹具补 textLayer 盒桩 +2 行**（对账表 crib 未列；无桩则
   pixelBoxOf 兜底 1×1→项盒越界→G2 健康门误拦→8 用例红）——申报为「纯夹具桩增」
   范畴、断言零改。**主控预置关注点 A：请独立判定此 +2 行是否属对账表 A「补桩页 2，
   断言零改」处置的合理延伸（vs 越权扩面）。**

## 六、主控预置关注点（除上列外请独立全面对抗）

- B1：保存门语义保真——else 臂 `if (!visualOnly) setPending(null)`+return 的守卫位：
  visualOnly=true（快路径回退）时是否正确不动 pending？item 非空尾段
  `setPending({anchor:{...anchor,rects:item.rects},...})` 三元删除后 TS 控制流收窄
  是否严密（vs 运行时任何 item 重新赋值路径）？
- B2：回退①新标题/断言与 INV-58 新条款的表述一致性（标题宣称「视觉连续+无保存入口+
  warn 不静默」——断言面是否三条全钉）。
- W 候选：头注五处重写的陈述准确性（F-A8 后时态、probeTextLength 单源、selection-layer
  含桩注）；exemptions 两条 caseTitle 与基线原文逐字一致性；manifest 7 行=时间戳+6 sha
  的对账；jsdom 桩助手三份重复（item-chain/evaluate/layer/paint 四文件同型 mkItem/
  mkText/seedRegistry——Rule of Three 第 3 次已在册？注：selection-evaluate.test 原有
  同型助手=现仓内第 4 份，是否触发 RoT 抽取义务）。
- N 候选：报告数字口径、.log 入库提醒（git add -f）、头注 :65 行「G2 起含页项桩」指代。

## 七、输出契约

报告写 scripts/audits/ 无需（岗无写通道——主控逐字归档）；直接在终回复给出：
**B（Blocker）逐条 / W（Warning）逐条 / N（Note）逐条 / VERDICT: PASS |
PASS_WITH_WARNINGS | FAIL**。对 §五 3 条自裁与 §六 B1/B2 给出独立判定。审读纪律：
结论须引 patch 行证据（hunk+行号），禁空泛。
