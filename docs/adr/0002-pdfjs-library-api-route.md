# AD-2：PDF 渲染走 pdf.js 库 API（canvas + 官方 TextLayer），不用官方 viewer 应用

日期：2026-08-21 · 状态：已接受（2026-08-22 spike 决策门通过，见文末）

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

## Spike 决策门结论（2026-08-22，通过——路线维持，不切 viewer.html）

在升级后的真实 Electron 42.9.3（Chromium 148.0.7778.280）内，用 Playwright
`_electron` + 一次性 spike（安全 webPreferences / CSP 与 `src/main/security/csp.ts`
逐字一致 / `loadFile` file:// 加载，即生产同构环境）验证 pdfjs-dist 4.10.38，
13 项断言全过，要点：

- **worker 双策略均可用**：`workerSrc` 指向 file:// URL 可行（vite `?url` 生产配方）；
  `?raw` 内联文本 → `Blob` → `blob:` URL 亦可（CSP `blob:` 已放行）。无 fake-worker 回退。
- **canvas + DPR 配方验证**：`--force-device-scale-factor=2` 下背衬尺寸
  1836×2376 = CSS 918×1188 × dpr，字形真实绘制（8905 墨迹像素）。
- **官方 TextLayer 可用**：v4 `TextLayer` 类（`textContentSource`/`container`/
  `viewport`）+ `--scale-factor` CSS 约定 + 官方 `pdf_viewer.css`，span 几何与
  viewport 完全一致；`getTextContent` 提取已知文本精确匹配。
- **文本可选择（本门核心疑虑）**：Range 全选 TextLayer，`selection.toString()`
  精确返回已知文本 `SMART WATER TEST DOC`。
- 全程 CSP 禁 `unsafe-eval` 下无回退、无控制台错误（Helvetica 标准 14 字体路径）。

给 Phase 3 工单的实证输入：v4 `page.render({canvasContext, viewport, transform})`
参数形态（v5 改名 `canvas`——钉版 4.10.38 期间不会遇到）；渲染器代码必须是外部
模块（内联 script 被 `script-src 'self'` 拦截，spike 首跑实证；vite 产物天然满足）。
局限：fixture 为单页 Helvetica 合成 PDF；复杂学术排版（多栏/嵌入字体）的选择精度
由 SR-RDR-05 + Phase 4 人工视检覆盖。spike 产物已按"死代码即删"清理，本文即其
存档。
