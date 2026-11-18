# ADR-0002：pdf.js 库 API 路线（非 embed/自绘替换）

日期：2026-08-21 · 状态：已接受

## 背景

标注是核心功能，需要拿到文本层的偏移与矩形才能落标注锚。官方 pdf.js viewer 是完整应用而非可组合组件（pdf.js 维护者立场，issue #20817）；Zotero reader 走同路线（独立 reader 组件+自建标注层）。pdfjs-dist v4 系列社区示例最多；v5+ 改用 `--scale-factor` CSS 变量体系、示例少。

## 候选

- 库 API 自建渲染：canvas 渲染 + 官方 TextLayer + React 标注覆盖层。
- 打包官方 viewer.html + 受控 iframe src 加载（VSCode 插件模式）：组件化程度低，标注锚定制受限——作为备选保留。

## 裁决

pdfjs-dist v4.10.38（版本精确固定）库 API 自建渲染：`PdfCanvas`（canvas 渲染/DPR/缩放）+ `TextLayer`（官方 renderTextLayer 与 layer CSS）+ React 标注覆盖层。PDF 渲染胶水属 strong 归属（不交弱模型实现）。

切换条件：若 canvas+TextLayer 路线在真实文献上出现不可解的文本选择精度问题，切换到 viewer.html+iframe 路线，整体替换渲染胶水文件并修订本 ADR；切换=删除旧方案。

硬约束：

- worker 本地打包（vite `?url` import），禁 CDN；CSP `worker-src 'self' blob:`。
- e2e 必须断言渲染文本可见（tests/e2e/reader-text.spec.ts）。

2026-08-22 在升级后的真实 Electron 42.9.3（Chromium 148.0.7778.280）内，以 Playwright `_electron` 构造生产同构环境（安全 webPreferences、与 `src/main/security/csp.ts` 逐字一致的 CSP、`loadFile` file:// 加载）验证 pdfjs-dist 4.10.38，13 项断言全过，路线维持：

- worker 双策略均可用：`workerSrc` 指向 file:// URL（vite `?url` 生产配方）；`?raw` 内联文本→`Blob`→`blob:` URL 亦可（CSP 已放行 `blob:`）。无 fake-worker 回退。
- canvas+DPR 配方：`--force-device-scale-factor=2` 下背衬尺寸 1836×2376=CSS 918×1188×dpr，字形真实绘制（8905 墨迹像素）。
- 官方 TextLayer 可用：v4 `TextLayer` 类（`textContentSource`/`container`/`viewport`）+`--scale-factor` CSS 约定+官方 `pdf_viewer.css`，span 几何与 viewport 一致；`getTextContent` 提取已知文本精确匹配。
- 文本可选择（本路线核心疑虑）：Range 全选 TextLayer，`selection.toString()` 精确返回已知文本 `SMART WATER TEST DOC`。
- 全程 CSP 禁 `unsafe-eval`，无回退、无控制台错误。

实现注意（实证输入）：

- v4 `page.render({canvasContext, viewport, transform})` 参数形态（v5 起改名 `canvas`——版本固定 4.10.38 期间不会遇到）。
- 渲染器代码必须是外部模块：内联 script 被 `script-src 'self'` 拦截；vite 产物天然满足。

## 后果

- 实证复核用例为单页 Helvetica 合成 PDF；复杂学术排版（多栏/嵌入字体）的选择精度由后续人工视检覆盖。
