# F-TESTREF-00 门一 Kimi 席位补审——派发实录（2026-09-15/16）

> 背景：门一 R1 席位当时（2026-09-11）因双 Kimi 源 504×6 由 deepseek 兜底完成；
> R2 为 kimi-main 定点复核（锚定 R1 findings 非全量）。用户裁决（2026-09-15）：
> 补派 Kimi 全量独立审。本件=补派执行实录。

## 审包（已入库随本件）

- `f-testref00-kimi-sup-brief.md`（1564 行）——补审简报：刻意**不附 R1/R2 报告原文**
  防锚定（预裁 8 项由主控摘要转呈）；审靶=提交 ff96cb1f02 终态 diff
  （`f-testref00-kimi-sup-diff.txt` 1045 行）；基线数据件以 sha 前 16 位
  f10502bd4598f002/23910 行替呈。
- 审前核证：HEAD 其后两条「模型代号清洗」提交（04f871ec88/498681f892）对
  F-TESTREF-00 实现面零触碰（git diff 2cb1f08fc8..HEAD --stat 对五实现件=0）。

## 派发尝试（全部 HTTP 504 退避耗尽——双源同端点 api.kimi.com/coding/v1 同宕同态）

| # | 时间（本地） | 源 | 结果 |
| --- | --- | --- | --- |
| 1 | 09-15 23:58 | kimi-main | 504×3 耗尽 exit=2 |
| 2 | 09-16 00:18 | kimi-backup | 504×3 耗尽 exit=2 |
| — | （会话休眠窗 ~8h20m——等效长冷却） | — | — |
| 3 | 09-16 08:50 | kimi-main | 504×3 耗尽 exit=2 |
| 4 | 09-16 09:12 | kimi-backup | 504×4 耗尽 exit=2 |

- 路由流水账：技能侧 `model-routing-log.jsonl` attempt/exhaust 事件逐条在档
  （attempt 13 条/exhaust 4 条）。
- 中断事件：#4 首发时审包两件（简报+diff）被外部清理批删除（2026-09-16 两提交的
  「未跟踪面清零」处置）——重建后派发；受控面零影响（git status 全净实证）。
- **处置=按「源尽回退勿空转重试」纪律停止重试**，审包入库暂存，待 Kimi 网关窗
  恢复后一条命令即发（见下）。未以 deepseek/GLM 替补——用户明示补 Kimi 席位，
  deepseek 已任 R1 全量，替补即失去补位意义（诚实欠账不伪装）。

## 恢复后重发命令（主控或用户任一方执行）

```
NODE24="$LOCALAPPDATA/Volta/tools/image/node/24.20.0/node.exe"
SK="C:/Users/Administrator/.zcode/skills/ai-dev-org"
AU="E:/class/智慧水务/Synapse_remake/scripts/audits"
cd "$SK" && "$NODE24" scripts/ds-call-v2.mjs --role gate1-reviewer \
  --source kimi-main --project synapse \
  "$AU/f-testref00-kimi-sup-brief.md" "$AU/f-testref00-kimi-sup.md"
# kimi-main 耗尽则改 --source kimi-backup 再试；产出 f-testref00-kimi-sup.md 后
# 交主控处置 findings（维持收口/立票修复），结论回写本件 §处置结果。
```

## 处置结果（待填——补审完成后回写）

- [ ] 状态：待网关窗
- [ ] 结论：—
- [ ] findings 处置：—
