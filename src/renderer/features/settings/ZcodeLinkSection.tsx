// b3: P7-G
/**
 * [SR2-AI-10] ZcodeLinkSection —— 设置页 zcode 联动（发现+一键装技能+心跳
 * 三档，不代启会话，工单：open / strong）
 *
 * ── 行为层 ──
 * - N4 设置页联动节（ADR-0015 §4）：状态呈现+一键装技能+心跳显示；
 *   **不代启会话=按钮永不 spawn 任何进程**（INV-21 本单锚定——e2e 断言+
 *   架构评审双面，登记册字面）；AI 工作只由用户在 zcode 侧启动（D2b）
 * - 检测态空间（宪法状态机前置；N4 三档的四态分解+error 态——「已装技能」与
 *   「未装」之间必须存在装技能动作面，故三档呈现+一过渡态）：
 *
 *   | 态 | 检测事实（fs 纯检测，main 侧） | 呈现 |
 *   | --- | --- | --- |
 *   | zcode-not-found | ~/.zcode 目录不存在（技能目录父=CLI 痕迹，纯 fs——ADR「技能目录/CLI 痕迹检测」；**最弱信号语义（门一 N10-4）：装而未跑不命中=可接受误报**——指引文案兜底，首次运行后自愈） | 「未发现 zcode」+安装指引文案（无按钮动作） |
 *   | found-skill-missing | ~/.zcode 在且 skills/ai-sensor 不存在 | 「已发现 zcode，技能未装」+「一键装技能」按钮 |
 *   | installed-idle | skills/ai-sensor 在（SKILL.md 存在）且心跳不新鲜 | 「已装技能，未运行」 |
 *   | running | 心跳新鲜（06 readStatus.running 单源——阈值不双写） | 「运行中」+state 自述+currentPaper |
 *   | error | readStatus 损坏上抛（status.json 坏）或检测 fs 异常 | 「状态读取失败」+重试按钮（门一 W10-2） |
 *
 *   迁移（事件→态）：设置页打开→检测一次；「一键装技能」点击→确认对话框
 *   （覆盖已有时二次确认）→fs 复制完成→re-detect→installed-idle；轮询=
 *   节可见期间 STATUS_POLL_MS=5s（06 门控同族，卸载清理 INV-14 成对）。
 *   跨格序列：①not-found→（用户装 zcode 后重开设置页）→skill-missing→
 *   装→idle→（用户拉起工具）→running；②running→（工具退）→idle（心跳
 *   过期）；③idle→running→idle（会话起止，无残留态）
 * - 一键装技能（main 侧服务）：fs 递归复制应用资源内技能模板至
 *   ~/.zcode/skills/ai-sensor/——模板源=tools/ai-sensor 打包产物
 *   （process.resourcesPath 下 extraResources；dev=仓库 tools/ai-sensor
 *   直读——双源解析单函数收敛）；**复制=纯 fs，零进程**
 * - 依赖 AI-06：心跳协议消费（readStatus 通道——损坏上抛归 error 态，
 *   readStatus null=工具从未运行→installed-idle 判定不受扰）
 *
 * ── 接口层 ──
 * - export function ZcodeLinkSection(): JSX.Element（data-ticket 骨架标记，
 *   翻 done 前移除）
 * - main 侧交付面：src/main/services/ai_sensor/zcode-link.service.ts
 *   （detect(): 五态输出（四呈现态+error）/install(): 复制执行）；IPC 面
 *   zcode-link/detect+install 两通道（实现时 [locked-change]——
 *   schemas+api-surface 受锁）
 * - **协议目录路径展示已撤（门一 B10-1 处置）**：renderer 绝对路径展示零
 *   先例+AGENTS 安全禁令字面「路径只能来自 main 侧系统对话框」不放宽——
 *   zcode 侧发现机制改由 AI-06 的 SKILL.md 文档化协议目录平台惯例路径
 *   （%APPDATA%/<应用名>/ai-sensor 等）承担，本节 UI 零路径面
 * - 打包面：electron-builder.yml extraResources 增 tools/ai-sensor 条目
 *   （打包配置文件延展——实现时随单；该文件不受锁）
 *
 * ── 架构层 ──
 * - renderer/features/settings 域（SettingsPage 挂载新节——AI-04 导出节
 *   同宿主先例）；main 侧 ai_sensor 服务族（06/07 同目录归置）；
 *   fs 检测/复制全在 main（renderer 只经 window.api）
 *
 * ── 生命周期层 ──
 * - 预留：技能版本对账（应用内模板 vs 已装——v1 覆盖装即等价）；zcode
 *   技能目录自定义路径（v1 固定 ~/.zcode/skills）
 * - 不做：spawn zcode/CLI/会话（INV-21）；心跳阈值在渲染层复算（单源
 *   06）；自动检测后台常驻（负面清单——仅节可见期轮询）
 *
 * ── 文化层 ──
 * - 错误：检测失败=error 态+重试按钮（动作型 toast INV-02）；装技能
 *   失败=动作型 toast，reason 文案可含目标目录路径（INV-02 动作型反馈
 *   惯例族——错误文案非展示面，与本节「零路径展示面」不冲突）；目标目录
 *   只读失败（权限）中文 reason。轮询常量 STATUS_POLL_MS=5s 本组件域私有
 *   （08 同名各持——Rule of Three 第 2 次保持重复；第 3 处出现时抽 shared）
 * - 测试：tests/unit/renderer/zcode-link-section.test.tsx [受锁新增]——
 *   四态渲染+迁移序列①②/确认对话框两型（首装/覆盖）/装技能 invoke 调用
 *   与 busy 态/卸载清 interval；zcode-link.service 单测——检测三事实源
 *   （fs 夹具目录）/复制执行与覆盖语义/resourcesPath 双源解析；
 *   **e2e [受锁新增 spec]：INV-21 不代启断言**（装技能全流程后断言无
 *   应用外进程副作用面=纯 fs 落地——skills 目录文件存在+行为不依赖进程）
 * - 新增受锁测试随实现 locks:generate+apply+[locked-change] 尾注
 * - 完成后：删除 data-ticket 与占位 → npm run verify 绿 → 人工审查
 *   git diff → 翻 registry
 */
export function ZcodeLinkSection(): JSX.Element {
  return <div data-ticket="SR2-AI-10" />
}
