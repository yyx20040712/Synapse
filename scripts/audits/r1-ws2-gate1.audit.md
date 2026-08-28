# R1-WS2 门一对抗深审（课题切换器渲染层）

> 审计人：门一独立子代理 · 2026-08-28 · 只读仓库（唯一可写=本档）
> 输入：r1-ws2-gate1.diff（942 行全量）/ r1-ws2-brief.md / ADR-0018 /
> r1-ws2-impl.report.md / r1-ws2-{verify,vitest-full,e2e-full}.log /
> 终态源码 main-window.ts·App.tsx·workspace.service.ts·notes.store·LibraryPage
> 测试证据基准：vitest-full（99 文件 775 用例绿，含本单 8+6=14）+ e2e-full
> （25 passed 0 skip，E2E_EXIT 见 log）；verify exit=2 唯一红=tickets/registry.ts
> TS2322（WS1 遗留），主控已修 TicketArea 联合（diff 内 registry hunk 归因主控，
> 非实现者越权——impl.report §9-1 自述零触一致）。

## 0. 开工记录·技能清点（宪法会话开工纪律）

- code-review-excellence=用（门一职责本体）；security-and-hardening=用（工单 C
  特有安全红线）；e2e-testing-patterns=用（工单 D）。
- systematic-debugging=不用（只读审计禁跑命令，证据以日志为准）；
  TDD/verification-before-completion=不用（非实现角色；验证基准主控已指定）。
- 配置自查：本代理只读不写代码，无模型等级派发面。

## 统计行

**门一 R1-WS2：0 B / 4 W / 10 N —— 放行门二：是**（4W 均为锚定/登记/契约对齐类
补强项，无一触及正确性或安全可达向量；建议 W2 回炉一行补锚，W1/W4 可并门二
处置，W3 主控收口一行登记）。

## 总评

实现忠实于票面五层规约：P1~P5 逐项可对号，两项主控预裁（will-navigate 同 URL
放行、App slot 注入）独立复核后维持，七项自裁申报全部成立且无越权面。核心机制
（dirty 聚合 props 注入→confirm→IPC→reload 出全新 stores）与 ADR-0018 渲染层
裁决字面一致；主侧 busy 串行（INV-35②）为渲染层竞态提供了兜底。主要缺口集中在
**测试锚定强度**（e2e「文献库空」断言存在假绿窗、护栏 deny 面零单测锚）与
**契约自洽**（store error 字段只写不读）。安全评估结论：will-navigate 放宽为
精确字符串等值判定，未发现任何绕过向量（详见 C 节攻击面推演）。

## A. 切换状态机终审

实现形态：**无显式 FSM**——四态（idle/confirming/switching/reloaded）映射为
组件 busy 位（WorkspaceSwitcher.tsx:40-52）+ store 异步函数顺序结构
（workspace.store.ts:99-106）。逐格核对：

| 格 | 实现 | 判定 |
| --- | --- | --- |
| idle | busy=false，无 pick 在飞 | ✓ |
| confirming | window.confirm 同步模态（store.ts:101） | ✓（见 N1：阻塞=零重入） |
| switching | await unwrap(api.workspaces.switch)（store.ts:103） | ✓（失败上抛→组件 catch toast→下拉保持展开可重试——WorkspaceSwitcher.tsx:43-52 catch 路径不执行 setOpen(false)，处置正确） |
| reload | location.reload() 后 return true（store.ts:104-105） | ✓（与 ADR-0018「全新 stores 零 stale 态」字面一致） |
| dirty 拦截 | confirm false→return false，零 IPC 零 reload | ✓（单测双锚：store it×2+组件 it×1） |
| IPC 失败 | unwrap 抛 ApiClientError→组件 toast+busy 复位 | ✓（行为面成立；测试锚缺口见 N7） |
| confirm 取消 | 同 dirty 拦截 + 下拉合上（pick setOpen(false)） | ✓ |
| 幂等 | id===currentId 直返 false 不弹不调（store.ts:100） | ✓（自裁③，单测锚定） |

- **[N1]** confirm 弹出期间 dirty 注入值**不可能过期**：window.confirm 同步阻塞
  renderer 主线程，弹窗期间无 render/无状态迁移；值取自 pick 调用时（即最后一次
  render 的 props）。点击前 staleness 两方向：stale-true（实际已干净仍弹确认）
  =保守向无害；stale-false（实际已脏未弹）需要「编辑事件已入队但 render 未冲洗
  即收到下一离散点击」——React 18 离散事件间同步冲洗，实际闭窗。且该值与退出
  守卫（main 侧缓存 push）同源同聚合（App.tsx:79-81），未引入新 stale 类。
- **[N2]** reload 前竞窗（IPC resolve→unload 生效间）：busy 复位在 finally
  （Switcher.tsx:52），早于导航生效——极窄窗内再点击→第二次 switchTo：同 id 走
  主侧重复装配（关旧→指针同值→重装配，无害）；异 id→指针再移+再次 reload，
  用户最后意图胜出。双击（await 期间）被 busy 位拦截（React 离散事件间冲洗
  setBusy）。终态一致，无丢稿面。
- **[N3]** busy 为组件级非 store 级：切换器与设置面（settings 视图下两者同屏）
  各持 busy，可并发发起 switch/create——主侧 INV-35② busy 单飞（并发=CONFLICT
  中文）兜底，处理序=到达序，终态一致。观察项，无需改。
- **[W1]** store error 字段**只写不读**：workspace.store.ts:73 头注与 :46 字段
  声明「写 error 供内联展示」，但 WorkspaceSwitcher.tsx 与 WorkspaceSection.tsx
  的 selector 面（items/currentId/switchTo/create/rename）均不读 error——列表
 加载失败时切换器静默退化为 fallback「课题」+空下拉，用户不可见不可重试。
  票面 P1~P3 未明文要求 error UI（对票面不违约），但**新文件头注即契约**
  （AGENTS 接缝纪律），自declared行为未兑现。修法二选一：组件补一行内联
  error 渲染（或下拉内重试项），或头注降格为「写 error 供（未来）展示」。
- **[N10]** 弃改后的悬置防抖写在竞窗内可触达新库——但被 FK 偶然兜底：
  notes.store.ts:183 setTimeout 自动保存在「主侧 assembleInto(新课题) 完成→
  renderer unload」窗口内触发时，notes.save 携带旧课题 paperId 写入新库——
  migrations/001_init.sql:76 `paper_id REFERENCES papers(id)` +
  connection.ts:15 `foreign_keys = ON` → 写入失败回滚（无污染，静默失败随页消亡）。
  lineage 挂起队列为动作驱动非定时器（lineage.store 无 setTimeout），暴露更小。
  该防线是 FK 副产品而非设计声明——建议在 invariants 或 store 头注声明一句
  「switch 竞窗跨库写由 FK 约束兜底为失败」，防未来无 FK 表（如纯主题节点）
  踩入同一窗口。

## B. 母本符合度

- **P1** ✓ store 四方法+dirty 参数注入+confirm 文案（「切换课题将丢弃未保存的
  标注/脉络修改。确认切换？」=票面引文风格）+reload。[N6] 驻留形态微偏：票面
  字面「list+currentName 驻留」，实现驻留 items+currentId、名字经
  selectCurrentName 推导（store.ts:78-80）——单一真相推导优于双写，认可。
- **P2** ✓ nav 顶部挂载（App.tsx:108）、当前名+▾+aria-label「切换课题」+
  aria-expanded、下拉=列表（当前项「（当前）」标记）+「新建课题…」+「管理课题」
  跳设置。常规 theme 变量（--border/--panel/--accent/--accent-soft），未预铺
  新 token。
- **P3** ✓ WorkspaceSection：列表+当前标记+inline 重命名+「创建并切换」；
  「管理」入口跳设置页（App.tsx:108 onManage）。
- **P4** ✓ 三测试文件齐（store 8 it+组件 6 it+e2e 1 场景），jsdom location.reload
  stub 配方与票面一致。
- **P5** ✓ 无切换动画/色标/快捷键。
- 自裁①（will-navigate）：**认可**——必要性成立（reload 被
  preventDefault 无条件吞，三跳取证链完整可信）；安全评估见 C 节（无绕过向量）。
  备选方案（按 load.devServerUrl/entryFile 白名单）不优于 getURL() 精确等值：
  dev server 重定向后终 URL 形态下白名单反而可能漏，getURL 恒等更紧。
- 自裁②（slot 注入）：**认可且为唯一合规路径**——check-quality.mjs:73-93 规则
  实证：SettingsPage（features/settings/）import '../workspaces/…' 必触发
  「跨 feature 引用」（firstSeg=workspaces≠settings，不在 COMPOSITION_ROOT_
  ALLOW 白名单）；App.tsx 在 app/ 层不受限。可选 prop 零破坏成立。
- 自裁③~⑦ 认可：placeholder 删除断言实证（check-quality.mjs:28 正则
  `…|placeholder/i` 连 HTML 属性都拦，且 renderer 无既有 placeholder 先例——
  quality 绿为证）；e2e 种子无 PDF 本体成立（LibraryPage 只读 db 行渲染
  title，无 fs 面）；switchTo 命名微调无害。
- **[N5]** 未申报面扫描：diff 11 文件中 registry.ts TicketArea hunk=主控修复
  （归因澄清非违规）；locks/manifest.json 扩容=预期流程。无其他未申报改动。

## C. 安全/护栏红线

**will-navigate 放宽攻击面推演（裁决：无绕过向量，维持主控预裁）**：

判定式（main-window.ts:111-114）：`url === win.webContents.getURL()` 精确
字符串等值，否则 preventDefault。逐一攻击面：

| 向量 | 形态 | 结果 |
| --- | --- | --- |
| data: URL | `data:text/html,…` ≠ getURL() | deny ✓ |
| about:blank | ≠ getURL() | deny ✓ |
| URL 编码变体（%EF%BC%8F/user@host/大小写端口等） | 字串不等 | deny ✓（放宽方向只可能**过拦**不可能漏放） |
| hash/锚点变化 | 同文档导航不触发 will-navigate；跨文档同 URL 带 hash 则字串不等 | deny ✓ |
| 外站/异文件 | ≠ getURL() | deny ✓（护栏原意图完整保留） |
| 重定向走私 | will-navigate 在初始导航 URL 上判定；初始 URL 已须===getURL()；dev server（localhost）与 file:// 均无外跳理由 | 无向量 |
| dev 形态 | loadURL(devServerUrl) 经 vite 重定向落终 URL F，getURL()=F，reload 导航至 F | 等值成立 ✓ |
| prod 形态 | loadFile→file:///…/index.html，reload 同串 | 等值成立（e2e 实证）✓ |
| 子框架 | will-navigate 仅主框架；子框架由 CSP frame-src 管；window.open 由 setWindowOpenHandler deny-all | 未松动 ✓ |
| 自刷循环 DoS | 需先有 renderer 脚本注入；CSP 锁死 script-src，无远程文档 | 不可达（[N4] 记录在案） |

- windowOpenHandler（:115）与 permissionPolicy（:118）、WINDOW_SECURITY_
  FLAGS（:47-57）零触碰——diff 实证仅 will-navigate 块改动。
- renderer 零 Node/零路径：三个新文件 import 面仅 zustand/api-client/Toast/
  @shared 类型；IPC 载荷仅 {id}/{name}——无路径跨界。✓
- 无新增出网 host、无 eval/newFunction/innerHTML。✓
- main-window.ts 非受锁面：manifest grep 无此路径 ✓（impl.report §6 属实）。
- **[W4]** 本单修改了安全护栏，但 **deny 面零测试锚**：全仓 grep「will-navigate」
  仅实现自身（tests/ 无锚——旧版亦无，属既有缺口）；本单改动后仅 e2e 锚了
  allow 面（reload 通过），deny 面（外站/data:/异文件仍禁）无任何红证能力。
  建议抽纯判定函数 `shouldBlockNavigation(current, target): boolean` 导出
  +3 行单测（同 URL→false；异 URL/data:/about:blank→true），一次性闭掉
  「安全件被改而无锚」类缺陷。
- **[N4]** 放宽使 renderer 自刷循环从不可能变可达——前提为先 XSS，CSP 已封，
  无新增可达向量；记录在案供后续安全评审引用。

## D. 测试质量

- **store 双变异恰中性认可**：变异①（删 dirty 拦截行）恰 1 红（dirty 取消 it，
  confirm 0 次）；变异②（删 reload）恰 2 红（无 dirty+dirty 确认两 it）。每个
  锁定行为均有专属红锚，无恒真断言；还原用 cp 备份法合规（宪法禁 git checkout
  于未提交实现）。报告内联引用可信。
- **[W2]** e2e「文献库空」断言存在**假绿窗**：workspaces.spec.ts:49
  `await expect(win.getByText('智慧水务 e2e 课题文献')).toHaveCount(0)` 紧跟
  切换器锚（:46-48，锚的是 workspace store load 完成）——B 库列表是**并行的**
  library.store IPC，若其晚于断言首查到达，count=0 立即成立通过；假想的
  「完全失隔离（共享库）」回归仅在库加载先赢时才红（时运红）。且后续流程
  （脉络空态→切回 default）不再回看 B 库，验收判据「文献库空」实为弱锚。
  修法（一行级）：先锚加载完成再断言缺席——LibraryPage.tsx:99-103 的
  「正在加载文献列表…」与 papers 同一 commit 置位，
  `await expect(win.getByText('正在加载文献列表…')).toHaveCount(0)` 后再断言
  种子缺席即为确定性锚。
- **L0 态 e2e 实际路径核验** ✓：三跳配方=workspace.service.ts:20-22 跨格序列②
  字面——首跳 L0 建库表于 userData 根（L0 不建 workspaces/ 是种子直插硬前提）
  →seedPaperRow 旧路径 INSERT→二跳启动 ensure 迁移 M→W-pvalid(default 含
  种子)。e2e 断言「默认课题+种子文献在场」实证迁移兼容面。
- **[N8]** 首跳 `waitForTimeout(500)` 经验等待（:23）：启动慢于 500ms 时库表
  未建→种子 INSERT 崩→测试红（fail-loud 方向，非假绿），可接受。
- **[N7]** 组件/store 测试缺口：动作型失败面（create/rename/switch IPC 失败→
  ApiClientError 上抛→组件 toast）与空输入 info 提示（「请输入课题名称」/
  「课题名称不能为空」）未锚——契约已在头注声明，测试面留白。
- WS1 服务测试无回归：vitest-full workspace.test.ts 14 it 绿。

## E. 接缝

- **TH1 占位约定** ✓：WorkspaceSwitcher 头注明示「现有 theme 变量常规样式
  （R3-TH1 未开工，勿预铺新 token）」；所用五变量均在既有面（App.tsx nav 同款
  --accent-soft/--accent 先例）。接口面=自持组件+props{dirty,onManage}，TH1
  可整体重样式不动行为层。
- **nav 文案/aria 零触碰** ✓：diff 实证 App.tsx 的 NAV 数组与四按钮块无 hunks
  （仅上方插入切换器+设置 slot 改造）；e2e smoke「三入口」绿=经验锚。
- **WS1-W3（组合回归锁）闭锁** ✓：e2e 必经真实 invoke——list（App 挂载 wsLoad→
  切换器示「默认课题」）、create（「创建」钮）、switch（切 B+切回 default 两跳），
  全链无 mock——按 WS1 门二预裁形态闭锁「bootstrap 实际组合 workspaces 域」。
- **[W3]** 渲染层 reload 语义未登记 invariants.md：INV-35 锚定列尾注预告
  「renderer 切换面 reload 语义随 R1-WS2」，而 WS2 diff 未触碰该文件——按宪法
  「新增跨模块行为不登记本册视同未完成」。一行级修法：INV-35 锚定列补
  「renderer：switchTo 成功⇒reload（store 内单点触发），单测 reloadSpy+
  e2e 切换场景锚定（R1-WS2，2026-08-28）」。主控收口时补即可。

## 证据核验表

| 项 | 结果 |
| --- | --- |
| vitest-full | 99 文件 775 passed（本单 +2 文件 +14 用例=基线 97/761 恰合）✓ |
| e2e-full | 25 passed 0 skip（含 workspaces.spec 1.8s）✓ |
| verify | exit=2 唯一红=registry TS2322（WS1 遗留，主控已修联合，当前 registry.ts:34 'workspaces' 在册）✓ |
| quality/lint/locks | verify log 前段全绿（149 受锁一致）✓ |
| main-window 非受锁 | manifest grep 无 ✓ |
| 文件行数 | store 108/Section 151/Switcher 159/SettingsPage 185——全部限内 ✓ |
| **[N9]** 证据卫生 | 首红与变异还原无独立 log 落盘（WS1 有 first-red.log 先例，本单仅报告内联引用）——门二复核性略降，非缺陷 |

## 放行裁决

**放行门二：是。** 0B：无正确性缺陷、无安全可达向量、无票面违约、无未申报
越权面。4W 处置建议：W2（e2e 加载完成锚）建议回炉一行级补丁；W1（error 内联
展示或头注对齐）与 W4（will-navigate deny 面纯函数锚）可并入门二回炉单或主控
裁量；W3（INV 登记）归主控收口一行。10N 均(observation)记录在册无需动件。
