# SR2-F-08 划选视觉反馈回退官方原生半透明（F1 修正役——R1 路线落地）——票面 v1

> 来源：2026-08-29 LOOP 复测站 3「划选全面失败+0.5~5s 延迟」。
> **母本=ADR-0019**（`docs/adr/0019-selection-feedback-native-route.md`——先读它）；
> 取证全档=`scripts/audits/f1-forensics.report.md`（根因链+三轮路线复盘）。
> 一句话：视觉通道从「透明 ::selection+自绘层」回退「官方半透明 ::selection」，
> 自绘层整体删除；工具条/保存链不动。
> 纪律：三屋模式；实现者禁 git add/commit/push、禁翻 registry；取证禁触
> tickets/；node24 前缀 `export PATH="/d/nodejs24:$PATH"`；npm run test 禁裸
> npx vitest。

## 1. 主控预裁项（实现者不再自裁）

- **P1 改动面（三源文件+两受锁测试）**：
  1. `src/renderer/features/reader/text-layer.css`：`.textLayer
     ::-moz-selection` 与 `.textLayer ::selection` 的 background 改
     `rgba(0 0 255 / 0.25)`——**逐字对照
     `node_modules/pdfjs-dist/web/pdf_viewer.css` 678-685 行**（官方空格
     格式照抄；Chromium 不解析 ::selection 的 color-mix——禁用）；`.textLayer
     br::-moz-selection`/`br::selection` 保持 transparent（官方原样，不动）。
     头注 [SR2-F-06]/[SR2-F-07] 两段历史保留，新增 [SR2-F-08] 段：反转
     决策+ADR-0019 指针+一句根因（自绘层 30% accent 合成 rgb(191,207,220)
     近乎不可见+拖选期零反馈）。
  2. `src/renderer/features/reader/SelectionRects.tsx`：**整文件删除**（P10
     死代码即删；无其他消费方——主控已 grep 全仓，仅 LineageNodeCard 注释
     提及「拆件先例」属历史记载不动）。
  3. `src/renderer/features/reader/SelectionLayer.tsx`：摘 `SelectionRects`
     import（:51）、`PendingSelection.overlay` 字段（:94）、`overlay:` 计算块
     （:153-165 内 tlBox 与 overlay 字面量）、渲染块（:235-236）。**其余
     零动**：evaluate/工具条定位数学/save/undo/Escape/事件注册全保留。
     头注 F-07 层叠推演段改写：划选视觉=原生 ::selection（ADR-0019）；层叠
     链删自绘层一行；[SR2-F-08] 增补段登记。
- **P2 受锁面（必然红→[locked-change] 改写；`npm run locks:unlock`→改→
  verify 绿后 `npm run locks:apply`，主控收口复核 manifest）**：
  - `tests/e2e/reader-text.spec.ts` F-06 视觉小票（:617-708）：C 节三段改写——
    ① ::selection 断言：`selectionBg === 'rgba(0, 0, 255, 0.25)'`（精确值；
    注释注明=官方 pdf_viewer.css 原值、Chromium 序列化形态）；② 自绘层三
    机制断言（:685-706 rectsStyle/rectBg/alpha 全段）删除，换
    `expect(count('selection-rects')).toBe(0)` 防回归守卫（注释引 ADR-0019）；
    ③ **L7 延迟预算守卫**：`selection-toolbar` 可见断言 timeout 从 5_000 收紧
    **1_500**（注释引 L7：交互反馈预算入验收——程序化选选含 200ms 防抖+
    evaluate，预算 1.5s）。B 节页盒断言零动。测试名同步：「F-06 视觉小票：
    页盒 panel 底+阴影页缘可辨；::selection 官方半透明（划选即时可见）」。
  - `tests/unit/renderer/selection-layer.test.tsx`：F-07a（:273-291）改写为
    「F-08 守卫：pending 态（mouseup 后工具条在场）**不渲染自绘层**——
    `selRects()` 恒 null（防回归自绘路线）」；F-07b（:293-306）**删除**
    （测点随组件消亡——头注登记理由）。头注 [SR2-F-07] 追加段改 [SR2-F-08]
    说明。selRects() 辅助函数保留（新守卫消费）。
- **P3 接缝核对**：SelectionLayer 头注↔text-layer.css 头注↔ADR-0019 三处
  「视觉通道=原生 ::selection」声明一致；grep `SelectionRects|selection-rects`
  终态仅剩（删除后的）两测试文件内防回归守卫+LineageNodeCard 历史注释。
- **P4 不做**：AnnotationLayer/AiAnnotationLayer 的 multiply 面零触碰
  （F-07 层间修复保留）；mergeLineRects/零宽 rect 伪影（遗留 B9，取证报告
  §5）；SelectionToolbar 任何改动；防抖值调整（视觉通道已脱离 JS 链路）。

## 2. 五层规约

**─ 行为层 ─**：拖选全程由浏览器原生 ::selection 提供**即时**视觉反馈
（rgba(0,0,255,.25) 半透明——canvas 字形透出可读）；mouseup/防抖 evaluate
链仅驱动工具条（≤1.5s 预算）；pending 态不再存在任何自绘选区 DOM。跨页
拒绝/Escape/保存/撤销行为零变。

**─ 接口层 ─**：`text-layer.css`（::selection 两行）/`SelectionLayer.tsx`
（摘 overlay）/删 `SelectionRects.tsx`；`SelectionOverlayBox` 类型随组件
删除（无导出消费方）。selectionToAnchor/anchor.rects/保存 IPC 契约零触碰。

**─ 架构层 ─**：renderer reader 域；零新依赖；受锁两文件 [locked-change]；
分层不动。层叠序终态（SelectionLayer 头注登记）：canvas 字形 < .textLayer
(z0) < AnnotationLayer(z5 multiply) < AiAnnotationLayer(z5) < 工具条(z10)。

**─ 生命周期层 ─**：不做：::selection 色值自定义/主题化（官方值即正确值，
换值=新 ADR）；选区动画；触屏长按特化。卸载/翻页/换文献的清理语义零变
（原本就只清 pending，与自绘层无关）。

**─ 文化层 ─**：TDD——unit F-08 守卫先红（现状自绘层在场→断言 null 必红，
红证落盘）→实现（删层）→绿→**变异红证 ≥1**（变异=SelectionLayer 渲染块
恢复一个 selection-rects div→unit 守卫红；cp 备份法禁 git checkout）。
e2e 改写红证可申报由主控收口跑（playwright 不查类型纪律——受锁 e2e 改动后
必须全量 verify 兜底）。报告落 `scripts/audits/sr2-f-08-impl.report.md`
（实现摘要/文件清单/红证/测试证据/locks 实录/自裁申报/疑虑），回复五行内。
**真机复评归主控**（复评配方=取证脚本 v4：selection-rects 不在场+蓝色 tint
差分>0+工具条时延——视觉票真机复评 DoD）。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀见票头。基线=**104 文件 859
用例 / locks 154 / open 0**；预期增量=用例 -1（F-07b 删除）≈858（如实自报）。
verify 真退出码落盘（`echo exit=$? >> 日志`）；首红与变异原始输出各自落盘
（`scripts/audits/sr2-f-08-*.log`）。
