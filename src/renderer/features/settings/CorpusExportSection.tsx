// b3: P7-G
/**
 * [SR2-AI-04] CorpusExportSection —— 设置页 AI 语料导出节（工单：open / strong）
 *
 * ── 行为层 ──
 * - 设置页新增「AI 语料导出」节（ai-module-plan §2.4 最小面）：目录选择（经
 *   main 系统对话框，INV-07）+「导出语料」按钮+进度行（phase+done/total
 *   文件计数）+errorCount 呈现（部分成功可见）
 * - 进度可见性走应用 UI 事件（exportCorpus progress 载荷）→
 *   corpus-export.store（zustand 既有先例）→ 组件消费——不走 manifest
 * - App 层订阅 useExportCorpusEvents（INV-14 成对清理）：完成/失败 toast
 *   常驻可见（INV-02——设置节卸载后反馈不丢，R14）；与 Settings/Reader
 *   挂载态零耦合（导出中导航离开设置页流不中断）
 * - 单飞联动：会话进行中按钮 disabled（EXPORT_BUSY 折叠消费分支，INV-13）
 * - 不建 AI 配置 UI（D2b：模型三件配置全在 zcode 工具侧 config）
 *
 * ── 接口层 ──
 * - export function CorpusExportSection(): JSX.Element（data-ticket 骨架
 *   标记，翻 done 前移除）
 * - 交付面：corpus-export.store.ts（进度态）+useExportCorpusEvents.ts
 *   （App 层订阅）+SettingsPage 挂载（SettingsPage 现状 ~172 行+导出节
 *   将触组件 250 行限——拆本组件即防线，R14）
 *
 * ── 架构层 ──
 * - renderer/features/settings 域；依赖 window.api（export/corpus invoke）
 *   +apiEvents.onExportCorpus+toast-store 消费惯例（完成/失败两型）
 *
 * ── 生命周期层 ──
 * - 不做：导出历史/目标目录记忆/取消按钮（v1 极简——中断重跑即修复）
 *
 * ── 文化层 ──
 * - 测试：组件测试（进度行渲染/按钮 disabled 态/errorCount——**沿用既有
 *   vitest+jsdom+RTL 链零新基建**）+hook 成对清理用例（INV-14 消费方级）；
 *   e2e 全链 [受锁新增 spec]：导入夹具→导出→磁盘五件套存在性+manifest
 *   一致（app.evaluate 侧通道读文件——P7-C 重启读 DB 同型先例）；**中断
 *   重跑序列降级为确定性方案**：不杀进程（CI 不稳定）——用「篇失败序列」
 *   （对夹具库制造一篇源缺失→errors[] 部分成功可见）+「会话开始目录残留
 *   旧产物→清空重建」断言（中断语义的单元级闭合在 AI-03 状态机跨格用例）
 * - 完成后：删除 data-ticket 与占位 → npm run verify 绿 → 人工审查
 *   git diff → 翻 registry
 */
export function CorpusExportSection(): JSX.Element {
  return <div data-ticket="SR2-AI-04" />
}
