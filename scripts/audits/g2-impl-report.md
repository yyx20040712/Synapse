# F-GEOM-01-G2 实现票交付报告（保存链单源门+死面收敛）

> 实现者：ops-executor（GLM5.3flash $max）。简报=scripts/audits/g2-impl-brief.md；
> 受锁面对账表=scripts/audits/g2-assertion-reconciliation.md。基线 HEAD=5ccc9e40e8
> （工作树交付，不提交——主控收口职责）。

## 一、五层规约履行情况

- **行为层**：T1 保存门=本票唯一行为变更——evaluateCore 的 item 链失败（三因）else 臂
  改为「paint 照渲 DOM 回退形状（视觉连续）+`if (!visualOnly) setPending(null)`+return」；
  尾段 pending 构造三元删除（else 已 return，TS 控制流收窄成立，typecheck 绿佐证）；
  G2 降级门分支与四守卫零改、visual 路径零改（diff 逐行核对）。T2 probeTextLength
  单源化（export+import+删本域复刻 probeOffsetLen，全仓 grep 零残留）。T3 rectsFromRange
  死面删除（src 导出+头注两处+测试用例+import 面，src/tests grep 零残留）。
- **接口层**：anchor-serialize 导出面 +probeTextLength（唯一新增导出）；
  annotation-anchor 导出面 -rectsFromRange；selection-evaluate 对外接口零变。
- **架构层**：依赖单向保持（selection-evaluate→anchor-serialize 既有边，零新环）。
- **生命周期层**：jsdom 桩环境全绿+e2e 43 例全绿，无运行时回归。
- **文化层**：头注随票重写五处（T5）；INV-58 修订在档（T4）；对账表之外断言零变化
  （16 用例改写/补桩+1 用例删除=对账表 A/B/C/D 全集）。

## 二、逐项交付（git diff --numstat 实测）

| 项 | 文件 | ±行（numstat） | 内容 |
|---|---|---|---|
| T1+T2+T5 | src/renderer/features/reader/selection-evaluate.ts | +20/-33 | 保存门 else 臂+尾段收窄；probeTextLength import+2 调用点改名+删复刻 26 行；头注重写 4 处 |
| T2+T5 | src/renderer/features/reader/anchor-serialize.ts | +3/-2 | probeTextLength 加 export；头注 :34 重写 |
| T3 | src/renderer/features/reader/annotation-anchor.ts | +1/-26 | rectsFromRange 导出删除（函数体 23 行+头注 2 处） |
| T4 | docs/invariants.md | +1/-1 | INV-58 行为列（INV-60）后插入保存门段+测试列末尾补 G2 锚注（同行内两处） |
| T6 | tests/unit/renderer/selection-layer.test.tsx | +35/-0 | beforeEach clear+import 2+三助手+8 用例补桩+textLayer 盒桩 2 行（自裁③） |
| T6 | tests/unit/renderer/selection-item-chain.test.tsx | +2/-2 | 回退①改写（标题+断言翻转，TDD 红锚） |
| T6 | tests/unit/renderer/selection-paint.test.tsx | +28/-0 | beforeEach clear+import 2+三助手+S1b/S2/S5/c 面 3 例补桩 |
| T3 | tests/unit/renderer/annotation-anchor.test.ts | +1/-16 | rectsFromRange 用例删除+import 收窄 |
| 豁免 | scripts/test-surface.exemptions.json | +14/-1 | entries +2 条（caseTitle/reason/rulingLink 逐字照简报） |
| 锁链 | locks/manifest.json | +7/-7 | generatedAt+6 受锁件 sha256（unlock→改→generate→apply 一轮走完） |

合计 +112/-88（10 文件）。未跟踪面=本简报/对账表/报告/6 .log（.log 被 .gitignore 拦，
入库由主控收口 git add -f）。

## 三、TDD 三段实录（raw 全落 scripts/audits/g2-*.log）

1. **首红**（g2-red-fallback1.log）：先改写 selection-item-chain 回退①（工具条 null）
   →`npx vitest run tests/unit/renderer/selection-item-chain.test.tsx`→**RED_EXIT=1**，
   红点 :215 `expect(toolbar()).toBeNull()`（现行 src 挂 DOM pending→工具条在场），
   其余 5 用例绿——红锚精确钉住保存门接缝。
2. **绿**（g2-green-full.log）：
   - T3 删除序第一步证红：先删 src 导出→跑 annotation-anchor.test→**T3_STEP1_EXIT=1**
     （`TypeError: rectsFromRange is not a function` @:77=import 悬空，证该测试唯一消费面）
     →删用例复绿；
   - 全量 `sqlite-abi use node`+`npx vitest run`→**GREEN_FULL_EXIT=0**，
     **170 文件/1744 用例全绿**（基线 1745-1=rectsFromRange 删除，与简报预期一致）；
   - 锚定回归网定向 9 文件→**ANCHOR_NET_EXIT=0**（9 文件/98 用例绿）。
3. **变异红证**（cp 备份法，全程禁 git checkout）：
   - **M1 保存门**（g2-mutation1-savegate.log）：cp 备份→保存门 else 臂改回挂 DOM
     pending→跑 selection-item-chain→**MUT1_RED_EXIT=1**（回退①工具条 null 断言红
     =新断言钉住行为）→cp 还原 RESTORE_CP_EXIT=0→**diff 空证
     MUT1_DIFF_EMPTY_EXIT=0（无输出=零残留）**→备份即删→复跑
     **MUT1_RESTORE_GREEN_EXIT=0**（6/6）。
   - **M2 probeTextLength 单源**（g2-mutation2-probe.log）：cp 备份→删 export→
     `npm run typecheck`→**MUT2_RED_EXIT=2**（selection-evaluate.ts(72,10) import
     悬空——简报预判 TS2305，实测 TS2459，同语义 dangling，见自裁②）→cp 还原
     →**diff 空证 MUT2_DIFF_EMPTY_EXIT=0**→备份即删→复跑 typecheck
     **MUT2_RESTORE_GREEN_EXIT=0**。

## 四、验证义务证据

- `npm run verify`（locks:generate+apply 后跑，g2-verify-final.log）：
  **VERIFY_EXIT=0**——quality+test-surface:check+tickets+locks+lint+typecheck+test+build
  全链绿；test 段 170 文件/1744 用例。
- test-surface:check 输出核对（verify log 内实测行）：**exemptions entries: 2 hits: 2
  stale: 0**——与简报④要求逐项吻合。
- e2e 默认门（g2-e2e-appgate.log）：`npm run test:e2e`→**43 passed（2.1m），
  E2E_EXIT=0**——无 corpus-export 超时红，flake 复跑口径未触发。

## 五、超票面自裁申报

1. **全量首跑路径失误（已修正+留痕）**：首跑全量时直跑 `npx vitest run`（未先
   `sqlite-abi use node`）——node_modules 残留 electron ABI 版 better_sqlite3 →
   db/services 面 22 文件 184 用例模块加载假红。按 `npm run test` 同口径（先切
   node ABI）重跑全绿。g2-green-full.log 已重建：保留 T3 红证段+追加口径偏差说明行
   +正确全量段。属执行路径失误，非代码缺陷。
2. **M2 错误码差异**：简报预判 TS2305，实测 TS2459（"declares 'probeTextLength'
   locally, but it is not exported"）——同为 import 悬空类型错误，红证语义不受影响。
3. **selection-layer 夹具 textLayer 盒桩增（+2 行）**：对账表 A 桩法 crib 只列
   seedRegistry 行；实测该夹具 textLayer 无 rect 桩→pixelBoxOf 兜底 1×1→项盒全越界
   →G2 健康门误拦项链（8 用例工具条 null 红）。补 textLayer 盒桩（同页盒值）后绿。
   判定为对账表「补桩页 2，断言零改」处置的必要夹具件（桩增范畴、零断言变化），
   未扩大断言面；如实申报请主控复核此判定。
4. 其余零偏离：对账表 A/B/C/D 之外的测试断言零触碰；G2 降级门/四守卫/visual 路径
   零改；INV-58 其余三列零改；禁清单（git 提交/branch/registry/relay.md/baseline
   JSON/src/shared/新依赖）全数未触。

## 六、卡点

无。

FINDINGS: B=0/W=0/N=0/VERDICT=DELIVERED
