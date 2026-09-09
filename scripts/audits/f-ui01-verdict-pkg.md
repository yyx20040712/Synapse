# F-UI-01 判定复核审包（deepseek 单源——零 diff 判定票）

## 0. 背景

票面：顶栏左簇垂直居中。用户裁决原文（2026-09-09 真机测试）：「左上角
这两个东西往下移动一段距离使其在上边框的垂直距离上居中」。f-ui01-img4
实据+多模态判读（裁剪图）：上留白~10px/下留白~30px→观感偏上。
票面改法预设：align-items:center 或等价 padding 校正（预设=现状未居中）。
票面验收：①DOM 计算样式断言：簇中心与顶栏中心垂直差 ≤1px；②全窗截图
目检。

## 1. 主控实证（证据件 scripts/audits/）

**探针 A（f-ui01-probe.mjs / f-ui01-probe.raw.txt）**——Electron 实启
（dpr=1.25），getBoundingClientRect+getComputedStyle：

- header：top=0/bottom=56/中心=28
- svg（菱形）：16.6~38.6，中心 27.6（**差 -0.4px**）
- 文字 ink 盒（Range）：17.9~36.3，中心 27.1（差 -0.9px）
- 簇（svg∪ink）中心差：**-0.4px ≤1px 验收线内**
- computed：.app-header align-items=center / height=56px / padding=0 12px；
  .app-header-name font-size=14px/line-height=21px

**截图 B（f-ui01-shot.mjs / f-ui01-fullwindow.png）**——全窗截图多模态
判读：顶栏高 68~72 物理 px（=56 逻辑×1.25 ✓）；左簇上留白 ~20px/下留白
~20px 居中；与右侧三键对齐，偏上仅 1~2 物理像素（亚逻辑像素级）。

**img4 失真定性**：img4 为顶栏局部裁剪图，无 header 底边参照，判读模型
将 header 外内容计入「下留白」→「上 10/下 30」为裁剪伪影。

## 2. 判定与依据

**判定=实证达标免实现结案**（先例=P7X-03「对证成立=结案推演升文档实证，
免实现——票面预判兑现」）：
- 验收①：簇中心差 -0.4px，机器断言线 ≤1px 已满足
- 验收②：全窗截图目检居中（双源交叉：DOM 数字+视觉判读一致）
- 票面改法前提（现状未居中）被 CSS 实况（theme-shell.css:17
  align-items:center 在位）+探针共同证伪
- 零 CSS 改动=目标态与现状重合，非跳过验收

## 3. 复核工单

A. 判定逻辑：证据链（探针 rect/截图判读/CSS 实况）是否支撑「免实现
   结案」？有无缺口（如 dpr 变体/UI 缩放档/真机库差异未覆盖）？
B. 票面符合度：验收两半是否都已完成？「用户裁决往下移」与「几何已
   居中」的冲突处置是否恰当（视觉决策零承担场+机器锚优先）？
C. 风险：若用户复测仍观感偏上，本判定留了什么后手（简报中是否写明
   升级路径）？

输出：[B|W|N] 逐条+一行总评。
