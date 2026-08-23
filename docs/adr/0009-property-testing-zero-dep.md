# ADR-0009：性质测试走零依赖固定种子路线（不引入 fast-check）

- 日期：2026-08-23（UBS 战役批四 D2 裁决）
- 状态：已裁决——不引入 fast-check，零依赖替代已落地
- 关联：docs/DEVELOPMENT.md §8「性质测试现状」；AGENTS.md 依赖与提交（依赖预算 ≤15）

## 背景

UBS 战役评估性质测试（property-based testing）立项：目标域=store 竞态不变量
（INV-03 族 stale-guard、U2 notes 内容安全不变量）。

## 裁决：不引入 fast-check

1. **依赖预算**：运行时依赖 ≤15 是宪法红线级约束；fast-check 对单人本地应用、
   窄目标域（两个 store 族的不变量）属重武器——收缩（shrinking）与自动生成器的
   维护收益低于新增依赖的审计/锁定成本（受锁 tests 引入新依赖还牵动 CI 口径）。
2. **目标域狭窄**：竞态不变量的输入空间是「操作序列 × settle 顺序」，不是高维
   数据空间——固定种子伪随机序列足以穷举攻击面，无需框架级生成器。
3. **可复现性更强**：锁定测试要求失败可精确复现；fast-check 的随机种子失败
   需要回传种子再跑，固定种子（mulberry32）序列一一对应，失败信息自带 seed=
   前缀直接定位。

## 落地（已随 2026-08-23 提交）

- `tests/unit/renderer/notes.store.test.ts` 末用例：12 种子 × 24 步随机操作
  （edit/saveSoon+防抖落发/load，save 30% 失败注入），单写者服务器模型；
  每步断言两不变量：草稿正文恒等于最后一条用户输入（内容安全）＋ savedAt
  单调非空。变异红证：合并路径丢用户内容 → seed=1 第 4 步精确捕获。
- mulberry32 内联于测试文件（4 行），不抽 utils（单一消费点，Rule of Three）。

## 后果

- 后续新增 store 的竞态不变量锁定沿用此形状（DEVELOPMENT §8 已载路线）。
- 若未来目标域扩展到高维数据空间（如标注几何合并的任意矩形输入），重评
  fast-check 立项——那是它的主场，本 ADR 不构成永久否决。
