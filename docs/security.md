# 安全设计（security）

对照 Electron 官方 Security Checklist 落地；机检项在 CI，人检项在审查清单。

## 1. 进程隔离（机检：tests/security/web-preferences.test.ts）

- `sandbox: true`、`contextIsolation: true`、`nodeIntegration: false`、`webSecurity: true`、`webviewTag: false`、`navigateOnDragDrop: false`
- preload 仅经 contextBridge 暴露白名单方法（按 API_SURFACE 生成）；不泄漏 ipcRenderer；不支持任意通道 invoke
- devTools 仅开发模式

## 2. 内容边界（机检：CSP 断言）

- 只加载本地内容（打包产物 / dev server）；`will-navigate` 一律阻止；`setWindowOpenHandler` 一律 deny；权限请求默认全拒
- CSP：`default-src 'self'; script-src 'self'; worker-src 'self' blob:(pdf.js); style-src 'self' 'unsafe-inline'; img-src 'self' app-file: data: blob:; font-src 'self' data:; connect-src 'self' app-file:(受管文件协议，阅读器取数通道); object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'`
- 无 unsafe-eval；无 iframe 嵌套内容

## 3. IPC 与注入防护（机检：契约/单测）

- 通道全显式注册；请求 zod `.strict()` 校验（未知字段拒绝——历史教训：不许删类型保护）
- SQL 全预编译参数化；FTS 输入经 `escapeFtsQuery`（注入向量集在 tests/unit/db/fts.test.ts）
- renderer 永不接触文件路径；`app-file://` 只接受 paperId（字符白名单）→ 查库 → `path.resolve` + 受管根前缀校验（攻击向量集在 tests/unit/protocol）
- 例外（登记）：`export` 响应里的 `filePath` 是用户刚在系统保存对话框里选的路径，main→renderer 方向回显用于 UI 反馈，不构成注入向量（schemas.ts `exportResSchema`）
- 写盘仅经系统对话框路径（dialogs.ts 是唯一出口）
- 出网重定向一律不跟随（`redirect: 'error'`）：白名单外 3xx 目标零请求，防 SSRF/开放重定向

## 4. 外链与网络

- `shell.openExternal` 只经 `openExternalGuarded`（https + 拒绝 localhost/私网/IP 字面量/带凭据 URL）
- 出网仅 3 个白名单 host（CrossRef/OpenAlex/arXiv），http-client 强制校验；超时 + 退避 + mailto 礼貌 UA
- 零遥测零分析；核心功能离线可用；Settings 页披露网络行为与诊断

## 5. 供应链

- lockfile 入库；`npm ci` 冻结；运行时依赖（better-sqlite3/pdfjs-dist/react/react-dom/zod/zustand 共 6 个，预算 ≤15）精确钉版，无 `^` 范围；Electron 在 devDependencies 精确钉版（随构建进产物）
- 依赖变更需 `[dep-change]` 尾注（CI）；新依赖需 ADR；CI `npm audit --omit=dev --audit-level=high`
- Actions 钉主版本
- Electron 42.9.3（当期支持线，2026-08-22 升级门执行，prebuild 矩阵核查见
  ADR-0006 执行记录）；Phase 6 打包前复核仍在支持线（42 于 2026-10-20 出线）

## 6. 数据

- PDF 视为不可信输入：仅在沙箱 renderer 的 pdf.js 中解析，main 只做字节搬运（魔数校验）
- 本地数据（SQLite + 受管文件）在 userData；无云上传；sha256 去重兼作完整性指纹

## 审查清单（人检，PR 时过一遍）

- [ ] 无新增出网 host / 无绕过 http-client 的 fetch
- [ ] 无 renderer 持有路径/Node API
- [ ] 新 IPC 通道走了 api-surface（而非裸 ipcMain.on）
- [ ] 错误消息不含堆栈/内部路径（跨 IPC 只传 Result）
