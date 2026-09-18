# F-GEOM-01-G2 门二报告（ops-adjudicator 逐字归档——岗无写通道，主控代录）

> 归档时间：2026-09-18（门二回执原文，零改写）。简报=g2-gate2-brief.md。
> agentId=agent_988ad54a-0bcb-4d57-b4df-a2721a577828。

**§0 逐条裁决表（原判断 / 裁决 / 依据-行号）**
1. 保存门=唯一行为变更且语义完备 / 成立 / selection-evaluate.ts:288-299（else 臂 paint
   照渲+`if(!visualOnly) setPending(null)`+return；尾段 :303-308 仅项链可达）；visualOnly
   语义零碰 :300-302。
2. M1 变异真钉「回退态无保存入口」/ 成立 / g2-mutation1-savegate.log:4（变异=改回挂 DOM
   pending）、红点 :141/:215=`expect(toolbar()).toBeNull()`、:153/:155-157/:219 全标记；
   首红同点 g2-red-fallback1.log:145/:149。
3. 回退①新断言三钉（rect/top≈25.25%/toolbar null/warn/toast）/ 成立 /
   selection-item-chain.test.tsx:213-217；豁免条对基线旧标题逐字 g2-assertion-
   reconciliation §B+exemptions.json:6。
4. probeTextLength 单源 / 成立 / anchor-serialize.ts:240 export；selection-evaluate.ts:72/
   195-196 消费；src+tests `probeOffsetLen` 零残留（grep 亲验）。
5. rectsFromRange 死面净删 / 成立 / src+tests `rectsFromRange` 零残留（grep 亲验）；
   豁免条 2 对基线 :7032 逐字一致。
6. INV-58 修订×头注互证+stale 自述消除 / 成立 / invariants.md:73（三因=仅显示不入库+
   pending=null+warn 单源）；selection-evaluate.ts:43-44/:53-54/:62；设计书 §2.6 交互点 5
   （design:180）。
7. 验收三件套 / 成立 / 指纹门：g2-verify-final.log:32/:72-73（exemptions 2 hits 2 stale 0
   +检查通过）；锚定回归网 9 文件/98 用例 :3994-3999；e2e 默认门 43 passed :91-92。
8. W1 后置随迁 / 合理（独立意见=同意） / 承接锚在档 registry.ts:298（G7「selection 系
   测试 import 随迁」）；须板面登记=P1-2。

**§1 四组数字独立复算**
- 组1 ±行数：per-file 相加=+112/-88 自洽；抽验面吻合（item-chain ±2↔:204 标题+:215 断言
  各 1 行替换实测；删 1 例 6 断言↔5417−6=5411）。numstat 实算+sha256=由门一/主控覆盖
  （本岗无 Bash）。
- 组2 C 面对账：①豁免两条 caseTitle 与基线 :16952/:7032 逐字一致=对上；②layer 14/17、
  paint 17/17 标题全集逐条=当前，断言抽样（P1/P4/F-A4/S2/c 面）与基线逐条一致=对上；
  ③**口径失实锚定**：基线 JSON 自述 stats=183 文件/1757 用例/5334 断言（:25756-25760，
  grep 计数同值），简报「187/1790/5417」实为本票开工时工作树 cur（verify log:32：base
  183/1757/5334↔cur 187/1789/5411），非 JSON 基线；本票后 vitest 170 文件/1744 用例（−1）
  与 green log:3844-3845、verify log:3928-3929 对上。
- 组3 锁面：manifest 338 项=对上；6 受锁件悉数在 manifest（:9/:453/:833/:1073/:1077/:1089）；
  locks 检查 338 一致（verify log:92）；6 件 sha256 实算=由门一/主控覆盖。
- 组4 EXIT 物理在档：全部对上——RED_EXIT=1(:149)、T3_STEP1_EXIT=1(:30)、ABI_USE_EXIT=0+
  GREEN_FULL_EXIT=0(:3849,170/1744)、ANCHOR_NET_EXIT=0(:3999,9/98)、MUT1_RED=1/
  DIFF_EMPTY=0/GREEN=0(:153-157,:219)、MUT2_RED=2/TS2459/DIFF_EMPTY=0/GREEN=0(:11-21)、
  VERIFY_EXIT=0(verify:3969)、E2E_EXIT=0(e2e:92)。

**§2 P0/P1/P2+N**
- P0（收口阻断=0）：无。
- P1-1 数字失实锚定更正留痕：收口批次日志更正组2③口径（JSON 基线 183/1757/5334 vs
  开工 cur 187/1790/5417），防下游误引（宪法「计数落笔前实测」条款类事故）。
- P1-2 收口文件面以 `git status` 实测为准：13 件 g2-* 证据（含 gate1-brief/patch、
  impl-brief、本终审报告）按 F-AUDIT-01 桶①随提交；6 .log 需 `git add -f`（.gitignore:13
  `*.log` 实证）；relay 批次日志补 G2 收口段+RoT 债行（W1 兑现，relay.md:105 现未勾）。
- P1-3 主控终跑 `npm run verify` 真退出码落档（与实现者 log 双档）+registry 翻 done（现
  open 19→18，:293）+locks 复核（registry/relay 不在 manifest，翻状态零锁面）+health-scan
  RED=0+账本三行。
- P2-1 N6 盲区（回退②/③无逐因工具条断言）留痕；结构覆盖充分（共享 else 臂+① M1 红证），
  认可不补测。
- P2-2 W1 承接锚在 registry G7 票面在档；板面登记归 P1-2。
- P2-3 自裁①（green-full.log 重建+ABI 口径说明）与自裁②（TS2459≠预判 TS2305 同语义）、
  自裁③（textLayer 盒桩 :56-60 为必要夹具前提）复核合规。
- N（3）：N1 豁免 2 条≤10 无需呈裁（exemptions.json 实测 2）；N2 e2e 口径=默认门 43 已兑，
  45 全跑义务归 G11（与 registry G11/relay:126 一致）；N3 账本/尾款临时件用毕即删
  （batch 13 先例）。
- 回炉建议：无代码面回炉项；优先级=P1-1/2/3 收口内一行级闭环，重跑门审不需要。
- VERDICT: GO_WITH_CONDITIONS（条件=P1 三项于收口提交内闭环；无 P0、无回炉）

MODEL-SELF: model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max
LEDGER-CLAIM: role=ops-adjudicator executor=model-field:8ad55776-2296-4f1a-bc46-05755c8f1300/deepseek-flash$max units=1 outcome=done
