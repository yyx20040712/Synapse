# [F-ELE-01] Electron 升级预研——立案骨架（票面载体）

> 调研票：纯调研零 src 变更。**产出呈用户裁实施时机——呈裁后本票即勾，
> 实施属后续波次不在本板**（relay.md 第三波头注）。实施窗口=F-GEOM-01
> 收口后（裁决 1）；实施启动前强制复核 prebuild 矩阵时效（裁决书 §6.6）。

## 待研清单

- better-sqlite3 × Electron 43+（ABI 148+）prebuild 矩阵：npm 可得性 / GitHub
  release-only 形态 / 各版本覆盖面（对照 2026-08-22 升 42 实录——AGENTS 环境事实段）
- Node 24 兼容矩阵（node-abi 映射数据源；CI node-version=24 同口径约束）
- 工作量与风险清单（better-sqlite3 V8 直接绑定随 ABI 变化；sqlite-abi.mjs
  双 ABI 管理机制的扩面成本）
- 出支持线暴露窗评估（2026-10-20 security.md:38；梯队序下实施时点推演）
- 结论与建议实施时机 → 呈用户裁决

## 裁决与排程序

docs/design/2026-09-18_complexity-governance-ruling.md 裁决 1 / §3 梯队二
F-ELE-01 行 / §6.6。调研产出落本件（标题日期=立案日，内容日期以文内为准）。
