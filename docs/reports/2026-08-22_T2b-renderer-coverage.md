# T2b 审计报告：renderer 逻辑层纳入 vitest 覆盖率

- 日期：2026-08-22
- 任务：T2b renderer 逻辑层纳入 vitest 覆盖率（兑现 docs/DEVELOPMENT.md §4 Phase 2「renderer 逻辑层 60%」承诺——该承诺自 Phase 2 起一直未兑现，本次补上）
- 前置提交：a9bfe2e（T2 全局 70 收紧）

## 1. 结论

renderer 逻辑层（`src/renderer/**/*.ts`，11 个逻辑文件）纳入 vitest 覆盖组，门槛 60×4；实测 81.21 lines，余量充足。最终 diff 经一审（PASS_WITH_WARNINGS）→ 二审裁决（PASS_WITH_WARNINGS）→ 方案 A 修复回炉 → 复审（PASS，0 发现）。`npm run verify` 全绿（exit 0，212 测试）。

## 2. 变更明细

git diff 范围：三个文件，无范围蔓延。

| 文件 | 变更 |
| --- | --- |
| vitest.config.ts（受锁文件） | coverage.include 追加 `src/renderer/**/*.ts`（仅 .ts，.tsx 组件不纳入——组件由 e2e 真实渲染覆盖）；thresholds 新增 `src/renderer/**/*.ts` 组 60×4；coverage.exclude 追加 `**/*.d.ts`；注释同步 |
| locks/manifest.json | sha256 重算同步（check-locks 83 项一致） |
| docs/DEVELOPMENT.md | §4 Phase 2 行勾选 ✅ 2026-08-22（实测 81.2 lines 口径） |

### 为何 exclude `**/*.d.ts`

`src/renderer/env.d.ts` 是 10 行纯类型垫片，永久 0% 覆盖，被 glob 命中后混入 renderer 组稀释分母——一审 WARN 即此：文档写 81.2 而生效口径 79.79，不一致。追加 exclude 后门槛语义准确、文档口径一致，且顺带把 `src/main/env.d.ts` 移出全局组（实测只会升，不会降）。

## 3. 三组门槛实测（CI 同口径 `npm run test -- --coverage`，exit 0）

| 组 | lines（门槛） | branches | functions |
| --- | --- | --- | --- |
| 全局 | 77.35（70） | 80.16 | 89.96 |
| repos 组（`src/main/db/repos/**`） | 88.97（85） | — | — |
| renderer 组（`src/renderer/**/*.ts`） | 81.21（60，11 个逻辑文件） | — | — |

## 4. 审计轨迹（时间序）

1. 一审（deepseek-v4-flash）：PASS_WITH_WARNINGS，1 WARN——env.d.ts（10 行纯类型垫片，0%）被 glob 命中混入 renderer 组，文档写 81.2 而生效口径 79.79，不一致。
2. 二审裁决（GLM5.3 code-reviewer，裁决人）：独立复核全部通过（glob 语义精确 / 既有门槛零改动 / sha256 逐位一致 / check-locks 83 一致），确认一审 WARN，给出三方案并裁决方案 A（coverage.exclude 追加 `**/*.d.ts`）：同时满足门槛语义准确与文档口径一致，且顺带把 src/main/env.d.ts 移出全局组（实测只会升）。最终裁决 PASS_WITH_WARNINGS（不阻塞，建议本提交内修正）。
3. 修复回炉：主控按方案 A 向实现子代理下发修复指令；改动为 exclude 一行 + 旁注，verify 全绿，三组实测对齐（renderer 组生效口径 79.79 → 81.21）。
4. 复审（deepseek，对修复后最终 diff）：首次判 FAIL/BLOCKING「exclude 属未授权改动、与披露矛盾」——经裁决为审计输入过时导致的假阳性：复审所用简报仍是修复前版本，其中写着『未做』。主控把修复循环完整记录补入简报后重审：PASS，0 发现。

过程教训（已沉淀）：修复循环后复审，审计输入必须携带裁决与修复历史，否则审计者会把已授权的修复误判为越权改动。

## 5. 可复现命令

```bash
npm run test -- --coverage   # CI 同口径，三组门槛实测，exit 0
npm run verify               # quality + tickets + locks + lint + typecheck + test + build
```

## 6. 提交信息

- 单 commit：vitest.config.ts + locks/manifest.json + docs/DEVELOPMENT.md + 本报告
- 尾注：[locked-change]（触碰 vitest.config.ts 与 locks/manifest.json）
- 触碰锁定文件即时 `locks:apply`，manifest 与该提交同步

## 7. 流程

三子代理流水线：GLM5.3 general-purpose（实现 + 回炉）/ deepseek-v4-flash（一审 + 复审）/ GLM5.3 code-reviewer（二审裁决）/ 本报告 GLM5.3。
