# Synapse Remake

本地学术文献管理 + PDF 阅读标注桌面应用（「智慧水务」课程科研工具）。

- 技术栈：Electron + TypeScript（单语言）+ React 18 + better-sqlite3(FTS5) + pdfjs-dist v4
- 架构与流程：见 `docs/architecture.md`；AI 协作规则：见 `AGENTS.md`（先读它）
- 测试与质量：`npm run verify` 一键全检；CI 六道关卡为准

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run verify` | lint + typecheck + test + build（提交前必跑） |
| `npm run dev` | 启动开发（HMR） |
| `npm run test` / `npm run test:e2e` | 单测 / 端到端（e2e 需先 build） |
| `npm run quality:check` / `tickets:check` / `locks:check` | 三道防作弊关卡 |
| `npm run locks:apply` / `locks:unlock` | 锁定/解锁受保护文件（变更需 [locked-change]） |

## 目录导览

```
src/shared      两进程共享契约（类型+zod，冻结）
src/main        主进程：ipc → services → repos → db，含安全/协议/文件存储
src/preload     contextBridge 白名单桥
src/renderer    React SPA（features 按域组织）
tickets/        工单注册表（开发控制面）
tests/          锁定的测试系统（e2e + 契约 + 安全 + 单测）
docs/           architecture / security / DEVELOPMENT / ROADMAP / adr
```

测试数、覆盖率等一切数字以 CI 输出为准，本文档不写具体数字。
