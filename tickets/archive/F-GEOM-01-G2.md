# F-GEOM-01-G2 票面归档（F-GOV-01）

- id: F-GEOM-01-G2
- file: src/renderer/features/reader/interact/selection-evaluate.ts
- area: reader
- owner: strong
- status: done

## summary 原文

保存链单源门+几何死面收敛（设计书 §2.4/§3.5——**战役唯一行为变更票**；2/11）：①保存门=evaluateCore itemChainFor 返 null 时 setPaint 照渲 DOM 回退形状（视觉连续，现状）+setPending(null)（原为 pending=DOM 形状 anchor）+warn 单源（复用 itemChainFor 诊断单源）——「所见≠所存时不给保存入口」（生产影响≈零：item 链失败三因健康页近零发生，主存活面=jsdom 测试环境）；②probeOffsetLen 收敛（selection-evaluate 复刻 anchor-serialize 私有 probeTextLength≈15 行→显式导出面+复刻删除）；③rectsFromRange 死导出面删除（src 零消费+受锁测试 1 用例≈25 行——死代码即删宪法条，候选项经双门裁）；受锁面先行对账义务（§2.4）=tests/unit/renderer/selection-layer.test.tsx 14 用例无 page-items 桩（grep 实测零命中）——立案时先出断言对账表（§5.2 风险 1），保存流用例补页项桩（tests/utils 工厂面 page-items.store 直改先例）+断言面按项族产物更新；指纹门 C 面变更走豁免清单条目（reason=设计书 §2.4+裁决链）+条目数 >10 呈主控复裁（§5.2 风险 2）；INV-58 修订（保存链条款+selection-evaluate:54 stale 自述重写）随本票；[locked-change][test-refactor]；验收=指纹门 C_after ⊇ C_before+锚定回归网+e2e 默认门【done 2026-09-18 batch 14：10 文件 +112/-88；对账表扩三文件实勘=selection-paint 6 例补桩+item-chain 回退①改写（TDD 红锚）+rectsFromRange 删例，豁免恰 2 条；首红/T3 悬空红/双变异红证（M1 保存门+M2 TS2459）全档；门一 PW B0W1N7（W1=RoT 第 4 份助手→后置 G7 随迁抽取）/门二 GWC P0=0P1=3（口径更正+收口三件全兑现）；vitest 170/1744+e2e 默认门 43/43+verify EXIT=0】

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
