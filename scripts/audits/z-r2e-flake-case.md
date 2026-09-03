# z-r2e 探针 flake 立案档（2026-09-03 立案——2 现同族触发立案线）

> 规则依据：AGENTS 测试纪律「e2e 非确定失败立案线=同用例 2 次」（2026-09-02 终裁入册）。
> 立案时点：P7E-03 收口全量 e2e（35 过+1 红）——第二次出现，与 v30 首现同族。

## 一、两次出现（指纹对照）

| # | 场次 | 日期 | 失败点 | 指纹 |
|---|---|---|---|---|
| 1 | P7E-02 收口 e2e（v30 §1 在档） | 2026-09-03 早段 | z-r2e-probe.spec.ts:224 探针 | 「几何指纹矩阵首次 resolve 即红不重试族」——复跑绿（p7e-02-r2e-rerun.raw.txt），未达立案线仅记指纹 |
| 2 | P7E-03 收口全量 e2e（p7e-03-e2e-full.raw.txt） | 2026-09-03 13:42 | 同 spec 同用例 :329 `expect(abs(rel1.y-rel2.y)).toBeLessThanOrEqual(2)` 得 4.4375 | dy=+4.4375/dh=−4.975/dx≈−0.013/dw=0；verdicts={x:T,y:F,w:T,h:F}；复跑绿（p7e-03-r2e-rerun.raw.txt，1 passed 5.8s） |

两现**同族**（pass1 首测竞速 resolve、复跑皆绿）→ 立案。

## 二、根因归因（证据链）

1. **失败机理**：探针第一程 box1=**裸 boundingBox**（:259-260，原路径测量——无稳定门），
   而第二程有 `if (STABLE) await stableGate(win2)`（:291）。AnnotationLayer 双态在档
   （INV-51：挂载先渲染存量行盒 fallback 几何→resolve 完成跳 band 收边几何，
   实测 y 差 4.44px/正常负载窗 ~8ms）。本失败 dy=4.4375 与在档 4.44px **同值级**；
   dh=−4.975 与 band 收边（F-11 顶收 10%/底收 12%——大行盒 ~44px 时 ≈4.4+5.0）
   吻合；s2RelY 八采样恒稳 60.64（pass2 已稳态）；mutLog pass1=3 < pass2=5
   （pass1 测量时 resolve 变更序列未完）。结论：**pass1 捕获 resolve 前 fallback、
   pass2 捕获 resolved——探针自身测量的竞速窗口，非产品回归**。
2. **产品面零缺陷证据**：INV-51 稳态原子测量（stableRel 双采样稳定门）在
   reader-text.spec 受锁用例中长期绿——产品断言口径（双态收敛后测量）无此竞速。
   本跑 35/35 功能用例全绿（含 reader-text 标注链两程+P7E-03 新 reader-search 全链）。
3. **P7E-03 零交集证据**：搜索特性 idle 态零 DOM（SearchHighlightLayer state!=='done'
   返回 null——本场景无搜索动作）；PagesOverlay 仅增条件 null 子节点；z-r2e 用例
   全程无搜索交互。时序佐证：本跑冷启动方差（Defender 扫描新产物——P7E-03 实现
   报告 §8.2 在档）加宽竞速窗，属负载巧合非因果。

## 三、处置

- **根因归属=探针测量面**（pass1 缺稳定门——与原用例 stableRel 双程口径不对齐），
  产品行为=INV-51 已锚定双态。
- **修法（候选，另立受锁小票）**：pass1 量测前加 `if (STABLE) await stableGate(win)`
  （与 pass2 同口径）；z-r2e-probe.spec.ts 属 tests/ 受锁面——走 unlock→改→relock
  →[locked-change]。红证形态=本档两现 payload（flake 竞速窗不可确定性复刻——
  P7A 注入复刻先例不适用于纯时序竞速，以两次在档失败数据为红证据申报）。
- **立案时点排队**：P7E-03 提交后即修（探针 flake 污染后续每票 e2e 基线——
  每次全量跑都可能随机红一次，审查带宽消耗面）。
