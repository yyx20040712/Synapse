# T2 审计报告：全局覆盖率门槛收紧

- 日期：2026-08-22
- 任务：T2 全局覆盖率门槛收紧（Phase 5 收尾项）
- 承诺出处：docs/DEVELOPMENT.md §4「Phase 5 完成 → 全局 lines ≥70%」

## 1. 结论

全局覆盖率门槛由 40/40/40/30 收紧至 70/70/70/70（lines/statements/functions/branches），repos 覆盖组 85/85/85/85 保持不变；实测四项指标均 ≥70 且有余量，无需补测试。变更经两道独立审计（第一道 deepseek-v4-flash、第二道裁决 GLM5.3 code-reviewer）均 PASS，`npm run verify` 全绿（exit 0）。

## 2. 变更明细

git diff 范围：两个文件 + 一处文档勾选，无范围蔓延。

| 文件 | 变更 |
| --- | --- |
| vitest.config.ts（受锁文件） | 全局 thresholds lines/statements/functions/branches 40/40/40/30 → 70/70/70/70；repos 覆盖组 `src/main/db/repos/**/*.ts` 85/85/85/85 原样保留；文件头与行内过期注释同步更新（"骨架期基线"→"Phase 5 完成后按 DEVELOPMENT §4 收紧的水位（实测 ~76 lines）"）；include/exclude/environment/alias 等其余配置零改动 |
| locks/manifest.json | locks:apply 重算，仅 vitest.config.ts 一条 sha256 变更 + generatedAt 时间戳 |
| docs/DEVELOPMENT.md | §4 表格 Phase 5 行勾选 ✅（与本报告同 commit 提交） |

## 3. 收紧依据（2026-08-22 实测，v8 provider）

| 指标 | 实测值（%） | 新门槛 | 余量 |
| --- | --- | --- | --- |
| statements | 76.46 | 70 | +6.46 |
| branches | 81.21 | 70 | +11.21 |
| functions | 91.18 | 70 | +21.18 |
| lines | 76.46 | 70 | +6.46 |

四项均 ≥70 有余量，无需补测试。

## 4. 审计轨迹

### 4.1 第一道审计（deepseek-v4-flash，直连 API 独立审计）

- 裁决：PASS，findings 0
- 审计输入：git diff + 任务简报 + AGENTS.md 全文
- 原始产物：仓库外工作流目录 `audits/T2-coverage-threshold.audit.json` / `.audit.raw.txt`（含 reasoning 全文与 usage，model deepseek-v4-flash）

### 4.2 第二道审计与裁决（GLM5.3 code-reviewer 子代理）

最终裁决 PASS，确认第一道结论。独立核验证据链：

1. diff 数值逐项比对一致，thresholds 之外配置零改动
2. 文件全文结构核对完整
3. sha256 独立复算与 manifest 新值逐位一致
4. 只读实跑 `node scripts/check-locks.mjs`：83 受锁文件与 manifest 一致，exit 0（排除漏 relock）
5. 行尾/编码核验：vitest.config.ts 为 LF，中文 UTF-8 无乱码

NIT 级注记（均非缺陷）：

- manifest.json 工作副本 CRLF 为 PowerShell 生成器固有特征，.gitattributes 提交时归一化 LF，不受影响
- 提交须带 [locked-change] 尾注，且 manifest 与受锁文件改动同 commit 入库

## 5. 证据与可复现命令

覆盖率测量（v8 provider，§3 数据来源，thresholds 随 vitest.config.ts 生效）：

```sh
npm run test
```

受锁文件一致性检查（83 条）：

```sh
node scripts/check-locks.mjs
```

全量校验（quality / tickets / locks / lint / typecheck / test / build）：

```sh
npm run verify
```

verify 结果：quality 通过；tickets 72 单 open 0；locks 83 一致；lint / typecheck 通过；212 测试以 70 门槛全过；三段 build 成功；整体 exit 0。

## 6. 提交信息

- 单 commit，包含：vitest.config.ts + locks/manifest.json + docs/DEVELOPMENT.md 勾选 + 本报告
- 尾注：[locked-change]（vitest.config.ts 与 manifest 为受锁文件）
- 流程：三子代理流水线（代码填充 GLM5.3 general-purpose → 第一道审计 deepseek-v4-flash → 第二道裁决 GLM5.3 code-reviewer → 本报告）
- 无 BLOCKING / WARN 发现，无修复循环
