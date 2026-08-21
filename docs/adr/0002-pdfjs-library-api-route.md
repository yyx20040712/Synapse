# AD-2：PDF 渲染走 pdf.js 库 API（canvas + 官方 TextLayer），不用官方 viewer 应用

日期：2026-08-21 · 状态：已接受（含 Phase 3 决策门）

## 决策

pdfjs-dist **v4.10**（精确钉版）库 API 自建渲染：`PdfCanvas`（canvas 渲染/DPR/缩放）+ `TextLayer`（官方 renderTextLayer 与 layer CSS）+ React 标注覆盖层。owner: strong（PDF 胶水不交弱模型）。

## 理由

1. 标注是核心功能：需要拿到文本层偏移/矩形，官方 viewer 是"应用"不是组件（pdf.js 维护者立场 #20817）。
2. Zotero reader 同路线（独立 reader 组件 + 自建标注层）。
3. v4 系列社区示例最多（弱模型/搜索友好）；v5+ 的 `--scale-factor` CSS 变量坑已记录，TextLayer 实现引入官方 layer CSS 规避。

## 决策门（Phase 3 spike 验收）

若 canvas+TextLayer 路线在真实文献上出现不可解的文本选择精度问题 → 切换"打包官方 viewer.html + 受控 iframe src 加载"（VSCode 插件模式），整体替换 reader 胶水文件并修订本 ADR。**切换 = 删除旧方案**（教训 E5）。

## 硬约束

- worker 本地打包（`?url` import），禁 CDN；CSP `worker-src 'self' blob:`。
- e2e 必须断言渲染文本可见（tests/e2e/reader-text.spec.ts，随 SR-RDR-02 激活）。
