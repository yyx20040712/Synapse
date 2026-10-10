# F-DBCAMP-01 DB-2 UI 面 前端任务设计书（定稿 v2.1）

> 版本：v2.1=v2（拟定者回炉稿）+主控终裁补遗（§8——W-1..W-5/N-1..N-5 处置+新呈裁 3 条裁定+预算默认值锚定）。
> 设计链：拟定者 v1（仓外 design-v1.md）→对抗审核 r1（B7/W8/N6 返工，仓外 audit-r1.md）→主控处置单
> R1-R19（仓外 disposition-r1.md）→拟定者 v2（仓外 design-v2.md）→复核轮 r2（B=0/W=5/N=5 有条件放行，
> 仓外 audit-r2.md）→主控终裁补遗定稿（本档）。证据档=仓外 scripts-audits/20261010-dbcamp-db2f/。
> 裁定链：承载形态=独立票立即开工（用户 2026-10-10「按推荐立刻开工」，账本 ruling 行）；预算设置页随本批
> （裁定③）；级联两次确认（裁定⑥）；无门自动执行（裁定⑤）；会话 50 条软上限（v169 细裁）。
> 立档：2026-10-10。实施单元 U1-U6（§4.3）；每单元六段简报派发，TDD+门一/门二全对抗位。

## §0 摘要与推荐总览

本批交付 AI 域全部呈现与管理 UI：三档会话入口（只读+置灰发送框）、任务卡、审计抽屉、管理面板（设置页内节，
任务/置顶/记忆三 Tab）、预算设置节、级联删除两次确认（零计数跳过）、AI 域 IPC 面 **13 个新 channel**。

通道数推导（v1 14→终态 13）：v1=14（sessions 3+messages 1+memory 6+tasks 2+audit 1+cascade 1）；
砍 append（R8）→13；增 list-pinned（R7）→14；memory 收敛砍 anchor 级 list/search 增 scope 级
list-by-scope（R10）→13。终态=sessions 2+messages 2+memory 5+tasks 2+audit 1+cascade 1=13。

设计点终态：D1 视图内嵌面板（reader/lineage 侧栏页签+settings 内嵌）｜D2 历史只读+发送框置灰+说明文案｜
D3 管理面板=设置页新节三 Tab｜D4 六域 13 通道｜D5 共享会话壳+三档薄包装+3 store（审计行态入 aiTasksStore）｜
D6 数字输入+行内校验+仅持久化+「于下次对话生效」｜D7 串联第二弹窗+预览合计=0 跳过｜D8 e2e 七条 E1-E7｜
D9 单元 U1-U6（受锁清单见 §2）。

关键数字手算留痕：预算自洽 paper 800+2200+1000=4000≤8000、lineage 1800+600+1200=3600≤6000、
global 600+1200+1000=2800≤4000、agent 800≤2000；预算字段 3×5+2=17；消息列表 ≤50（写时淘汰）；
记忆搜索 ≤8（topK）；scope 级列表 limit=200；renderer 新增 ≤2100 行（15 件逐项估 v2 §4.1）。

## §1 范围内各面设计

### 1.1 三档会话入口

- paper 档：reader 侧栏新增「AI 会话」页签（与划线问答笔记页签并列不并入），锚=papers.id（TEXT uuid）。
- lineage 档：lineage 页侧栏新增「AI 会话」页签，锚=collections.id。
- global 档：设置页新节「AI 助手」（SettingsSection 壳）内嵌会话面板，锚=null。
- 交互流：点页签/进入节→`ai-sessions-open`（handler 调服务层 **openOrGetSession**：repo 新读
  getSessionByAnchor 取该锚最新会话，无则 createSession——每锚单活动会话入口语义；数据层多会话合法，
  任务系统不动）→渲染消息列表。
- 状态枚举：`closed | loading | ready | notFound`；列表子态 `empty("暂无会话消息") | ready`。
  幽灵锚（NOT_FOUND）→「锚对象不存在或已删除」。
- 发送框：恒 disabled，占位「对话能力将在后续版本接入」；输入框+发送按钮均置灰但可见。
- 消息行：user 右列/assistant 左列；pinned 行顶部钉标；无任务结果联动高亮（R18 砍除）。
- 错误映射：open NOT_FOUND→notFound 态；INVALID_REQUEST→面板内通用错误行「请求无效，请重试」。

### 1.2 会话内任务卡

- 位置：会话面板消息列表下方「任务」区；数据=ai-tasks-list 按 scope+anchorId 过滤。
- 六态渲染：queued=「排队中」+取消钮；running=spinner+「执行中」（无取消钮）；succeeded=「已完成」+
  结果摘要；failed=「失败」+错误文案；timeout=「超时」；cancelled=「已取消」。
- 目标描述符行：渲染 **targetTitle**（服务端 LEFT JOIN 解析；null 时渲染 scope 文案）。
- 错误映射：cancel CONFLICT→toast「仅排队中的任务可取消」；NOT_FOUND→刷新列表；INVALID_REQUEST→
  toast 通用错误（终裁 N-1：卡面场景统一 toast）。

### 1.3 审计抽屉

- 入口：任务卡「审计」钮→右侧抽屉（面板内覆盖层）。内容：该任务审计行 (task_id,seq) 升序；
  行=seq+类型标+摘要；kind='mutation'→「变更」、'permission'→「权限决策」；mutated 行展开
  before/after（服务层已截 200 字符）。
- 状态枚举：`closed | loading | ready | empty("暂无审计记录") | error`；审计行态统一入 aiTasksStore。
- 分页：首载 limit=100+「加载更多」（afterSeq 递增）——超 100 行极端面不整段渲染（终裁 N-2）。
- 只读；本批仅任务级抽屉（Q5 裁）。

### 1.4 管理面板 + 置顶/记忆数据面

- 承载：设置页新节「AI 管理」，Tab=任务/置顶消息/记忆（节序=AI 助手→AI 管理→AI 预算，Q7 裁）。
- 任务 Tab：全档任务列表（过滤 scope/状态），列=动作/档/目标（targetTitle）/状态/时间；queued 行带取消。
  空态「暂无任务」。
- 置顶消息 Tab：数据=ai-messages-list-pinned（跨会话 pinned+服务端锚标题解析），三档分组列出，
  操作=取消置顶。空态「暂无置顶消息」。SESSION_CAP banner 不在本批（R9 延后管线批）。
- 记忆 Tab：**scope 级全列**（list-by-scope）+scope 切换+分类过滤+置顶过滤+搜索框；不做锚选择器（R10）。
  操作：**新建仅 global 档开放**（终裁新呈裁-1；paper/lineage 档新建钮置灰+提示
  「暂不支持在本面板为该档新建」）；编辑/置顶/删除全档可用（id 定位）。agent origin 行只读+「代理生成」标。
  空态「暂无记忆」。label 输入面 v1 省略（见 §3.2 契约=可选）。
- 错误映射：NOT_FOUND→行消失+刷新；INVALID_REQUEST→行内通用错误；CONFLICT 无服务层抛出路径不设分支。

### 1.5 预算设置页

- 位置：设置页新节「AI 预算」（节序第三）。17 字段=每档 5（上限/L1 cap/L2 片数/L2 cap/尾段）+agent 2
  （单发/轮合计）。**默认值表（终态锚定，单源=本档 §9——AI 域报告 §3.C 预算表派生）**：
  paper cap=8000/l1=800/l2Slices=15/l2Cap=2200/tail=1000；lineage cap=6000/l1=1800/l2Slices=3/
  l2Cap=600/tail=1200；global cap=4000/l1=600/l2Slices=8/l2Cap=1200/tail=1000；agent
  perShot=800/perRound=2000。
- 校验（renderer 即时+ipc zod 双层）：整数≥0（负数/清空/非整数→invalid）；L1+L2cap+尾段≤档上限；
  单发≤轮合计。越界→行内红字+禁用保存，不静默 clamp。
- 生效语义：**仅持久化**（appSettings 整体 set）；本批零消费面，消费接线归对话管线批（caps 注入时机
  归该批）。节内固定文案：「于下次对话生效」。状态机 `clean|dirty|invalid|saving|saved(2s 回 clean)`；
  「恢复默认」钮。

### 1.6 级联删除两次确认

- 服务面：ai-cascade 服务=previewCounts(scope,anchorId)+deleteAiResourcesByAnchor 单事务
  （sessions 灭→messages FK CASCADE 随灭+memory 灭+tasks 灭；**audit 行恒存**）。
  计数口径（终裁 N-4）：会话计数=全部会话行**含空会话**（openOrGet 自动建的空会话计入——诚实计数，
  零计数跳过语义=「从未打开过 AI 面板的锚」；不特判空会话）。
- 接线双面：①papers 删除流；②folders 域删流（夹内 papers 的 paper 档级联+collections 行灭→lineage 档
  级联，双面合计呈现）。
- 流：既有删除确认（零改动）→确认后**预览合计>0** 弹第二窗：「将同时删除：会话 {a} 个/消息 {b} 条/
  记忆 {c} 条/任务 {d} 个；审计记录将保留」+「确认删除」/「取消」。**合计=0 走既有单确认流，第二窗
  不出现**（旧锁定 e2e 外部行为不变）。取消任一步=整体中止；preview 失败→错误行+「重试/取消」禁盲删。
- 状态机 `step1→previewLoading→step2 | skipped | cancelled→confirming→done`。

### 1.7 AI 域 IPC 面

全部新建（§3）。服务层冻结接口+新增服务方法（openOrGetSession/memory 手动面/cascade/pinned 查询/
scope 列表/targetTitle JOIN）为唯一上游；handlers 薄转发+zod 校验零业务逻辑；renderer 永不直写消息。

## §2 设计点权衡与受锁面

D1-D9 候选权衡全表=仓外 design-v1.md §2/design-v2.md §2（终态见 §0）。受锁面（locks manifest 实照）：
**src/shared/**（类型+api-surface+zod+appSettings 扩展）=[locked-change]；**tests/**（单测+e2e+种子件）
=[locked-change][test-refactor]；preload/main IPC handlers/main 服务件不受锁。

## §3 IPC 面 + shared 类型清单

### 3.1 通用契约

- anchorId 全表 **string|null**（TEXT uuid）；行 id（session/message/task/memory）=number。
- typed error=AiDomainError{code, message}，code∈{NOT_FOUND, INVALID_REQUEST, CONFLICT}；
  无 data 无专用业务码；数字展示一律走正常 Res 通道。UI 判别仅按 code。
- 全 Req 经 zod；channel=域前缀+动词 kebab-case。

### 3.2 通道清单（13 个）

```
-- sessions 域（2）--
ai-sessions-open
  Req { scope: enum(paper,lineage,global), anchorId: string|null }
  Res { session: AiSession }                          // openOrGetSession
  Err NOT_FOUND(锚不存在) | INVALID_REQUEST(矩阵拒)
ai-sessions-list-messages
  Req { sessionId: number }  Res { messages: AiMessage[] }   // ≤50
  Err NOT_FOUND

-- messages 域（2）--
ai-messages-set-pinned
  Req { messageId: number, pinned: boolean }  Res { message: AiMessage }  Err NOT_FOUND
ai-messages-list-pinned
  Req { scope: enum(paper,lineage,global), anchorId?: string|null }
  Res { items: PinnedMessageItem[] }                  // 跨会话 pinned+锚标题+sessionId

-- memory 域（5）--
ai-memory-list-by-scope
  Req { scope, category?, pinnedOnly?, query?, limit?: number default200 }
    // 双语义（终裁 W-1 定型）：query 缺席=列表模式——category/pinnedOnly 过滤+
    // (updated_at DESC,id DESC) 序+limit 200；query 在席=检索模式——{scope,query} 恒真组合
    // （category/pinnedOnly 与 query 互斥，zod refine 拒同席）——双路由（1-2 码点 LIKE/≥3 FTS）
    // 服务层自决+topK=8 回包，排序沿检索口径
  Res { items: AiMemoryListItem[] }
ai-memory-create
  Req { scope, anchorId: string|null, category, label?: string ≤50 default '', title: string 1..120,
        content: string, pinned?: boolean }
    // label 可选（终裁 W-3：报告 §3.B「label 单值用户标签仅展示过滤与检索命中」——非必填，
    // 表单 v1 无 label 输入面，default ''；需求出现再加输入行）；category 值域=zod refine 按
    // shared 档级枚举校验（终裁 N-3——防 IPC 直写跨档类目）
  Res { item: AiMemory }                              // origin 恒 manual（服务层盖写）
  Err INVALID_REQUEST(矩阵/值域拒)
ai-memory-update
  Req { id: number, patch { label?, title? 1..120, content?, category? } }  // category 同值域校验
  Res { item: AiMemory }  Err NOT_FOUND
ai-memory-delete
  Req { id: number }  Res { ok: true }  Err NOT_FOUND
ai-memory-set-pinned
  Req { id: number, pinned: boolean }  Res { item: AiMemory }  Err NOT_FOUND

-- tasks 域（2）--
ai-tasks-list
  Req { scope?, anchorId?: string|null, state?: enum(queued,running,succeeded,failed,timeout,cancelled),
        limit?: number default50 }
    // 读通道三值语义（终裁 W-2a）：anchorId undefined=scope 级不过滤（任务 Tab 全档面）；
    // 显式 null=仅 global；非空串=该锚——与写通道矩阵分治
  Res { tasks: AiTask[] }                             // 每行含 targetTitle（LEFT JOIN）
ai-tasks-cancel
  Req { taskId: number }  Res { task: AiTask }
  Err NOT_FOUND | CONFLICT(非 queued)

-- audit 域（1）--
ai-audit-list
  Req { taskId: number, afterSeq?: number, limit?: number default100 }
  Res { rows: AiAuditRow[] }                          // (taskId,seq) 升序

-- cascade 域（1）--
ai-cascade-preview
  Req { scope: enum(paper,folder), anchorId: string }
    // 独立枚举独立矩阵（终裁 W-2b）：paper→papers.id（paper 档计数）；folder→collections.id
    // （夹内 papers 的 paper 档计数+collections 行灭的 lineage 档计数，双面合计）；anchorId 恒非空
  Res { counts: AiCascadeCounts }                     // 合计=0→UI 跳过第二窗
```

**zod 校验矩阵（终裁 W-2 定型——写/读分治）**：
- 写/锚绑定通道（ai-sessions-open、ai-memory-create）：global+anchorId≠null 拒；paper/lineage+anchorId=null 拒。
- 读通道（ai-tasks-list、ai-messages-list-pinned）：anchorId 三值语义（undefined=不过滤/null=仅 global/
  非空串=该锚）；scope 缺省=全档（任务 Tab）。
- ai-cascade-preview：独立矩阵（scope=folder 时 anchorId=collections.id；恒必填非空）。
- ai-memory-list-by-scope：query 与 category/pinnedOnly 互斥 refine。

### 3.3 shared 类型（集中 U1，[locked-change]）

```
AiScope = 'paper'|'lineage'|'global'
AiDomainErrorCode = 'NOT_FOUND'|'INVALID_REQUEST'|'CONFLICT'
AiSession { id:number, scope:AiScope, anchorId:string|null, createdAt, updatedAt }
AiMessage { id:number, sessionId:number, role:'user'|'assistant', content, pinned:boolean, createdAt }
PinnedMessageItem = AiMessage & { anchorTitle: string|null }
AiMemory  { id:number, scope, anchorId:string|null, category, label, title, content,
            pinned:boolean, origin:'manual'|'agent', createdAt, updatedAt }
AiMemoryListItem = AiMemory & { anchorTitle: string|null }
AiTaskState = 'queued'|'running'|'succeeded'|'failed'|'timeout'|'cancelled'
AiTaskAction = 'memory.create'|'memory.update'|'memory.delete'|'memory.pin'|'memory.unpin'
             | 'memory.search'|'memory.list'|'message.pin'|'message.unpin'    // 9 白名单
AiTask { id:number, sessionId:number, action:AiTaskAction, state:AiTaskState,
         target?: { scope:AiScope, anchorId:string|null }, targetTitle?: string|null,
         resultSummary?: string, error?: string, idempotencyKey, createdAt, updatedAt }
AiAuditRow { taskId:number, seq:number, kind:'mutation'|'permission', summary:string,
             before?: string, after?: string, createdAt }        // before/after 截 200；标「变更/权限决策」
AiCascadeCounts { sessions:number, messages:number, memories:number, tasks:number }
AiBudgetTier { cap:number, l1:number, l2Slices:number, l2Cap:number, tail:number }
appSettings 扩展 aiBudgets { paper:AiBudgetTier, lineage:AiBudgetTier, global:AiBudgetTier,
                             agent:{ perShot:number, perRound:number } }
```

记忆分类常量按档冻结落 shared（paper 6=excerpt_quote/method_note/data_evidence/critique_limit/
term_glossary/reading_insight；lineage 7=node_role/relation_note/branch_summary/timeline_milestone/
controversy_debate/gap_opportunity/domain_glossary；global 6=user_preference/ui_guidance/
capability_note/automation_recipe/task_outcome/constraint_limit——020 DDL 实照）。预算默认值常量=§1.5 表。

## §4 组件树 + store + 单元切分

### 4.1 组件树（features/ai/ + 三处薄集成；单件 ≤250 行，Tailwind，零新依赖）

```
features/ai/
  AiSessionPanel.tsx        ~180   共享会话壳(props: scope, anchorId)
  MessageList.tsx           ~100   列表+空态
  MessageItem.tsx            ~60   行+pinned 标
  ComposerDisabled.tsx       ~40   置灰发送框+说明
  TaskCard.tsx              ~150   六态+取消+targetTitle 行
  AuditDrawer.tsx           ~170   抽屉+行列表+before/after 展开+加载更多
  manage/AiManageSection.tsx ~160  设置节壳+三 Tab
  manage/TasksTab.tsx       ~140   全档任务表+targetTitle 列
  manage/PinsTab.tsx        ~120   list-pinned 分组+取消置顶
  manage/MemoryTab.tsx      ~210   scope 级列表+过滤+搜索+CRUD 表单（新建仅 global）
  BudgetSection.tsx         ~200   17 输入+校验+保存/恢复默认+「于下次对话生效」
  CascadeConfirmDialog.tsx  ~150   第二确认窗+计数预览（零计数不弹出）
  aiSessionStore.ts         ~140   key=`${scope}:${anchorId??'global'}` map；会话/消息
  aiTasksStore.ts           ~140   任务列表+取消+审计行
  aiMemoryStore.ts          ~140   scope 级列表+CRUD+搜索
集成点（各 ≤40 行）：
  reader 侧栏页签注册+PaperAiPanel(papers.id) / lineage 侧栏页签注册+LineageAiPanel(collections.id)
  / settings 三节（序=AI 助手→AI 管理→AI 预算）
```

### 4.2 store 职责

aiSessionStore=会话/消息列表态；aiTasksStore=任务+取消+审计行（统一）；aiMemoryStore=scope 列表+CRUD+搜索。
跨组件单源；面板卸载清对应 key。

### 4.3 单元切分 U1-U6（依赖序 U1→U2→U3→U4→U5→U6；e2e 随单元落；每单元 verify 独立绿）

| 单元 | 交付件 | 受锁标记 | verify 边界 | 依赖 |
| --- | --- | --- | --- | --- |
| U1 shared 类型面 | shared AI 类型件（§3.3）+api-surface 扩展（13 通道）+zod schema 件（§3.2 矩阵）+appSettings aiBudgets+分类/预算默认常量 | [locked-change] | 全量 verify 绿（零行为面） | 无 |
| U2 main 侧服务+IPC | main/ipc 六域 handler；ai-memory 手动服务面（origin 盖写+校验+检索路由复用）；ai-cascade 服务（preview+单事务级联**paper/folder 双分支单测全覆盖**——终裁 W-5 服务面）；sessions 扩 openOrGetSession+repo 扩 getSessionByAnchor；pinned 跨会话查询；scope 级 listByScope 锚标题 JOIN；tasks targetTitle JOIN；preload 扩展 | 服务/handler 非受锁；配套单测=[locked-change][test-refactor] | 全量 verify 绿（含新单测） | U1 |
| U3 renderer 会话面板 | AiSessionPanel+MessageList+MessageItem+ComposerDisabled+aiSessionStore+三处集成；tests/e2e/ai-seed.ts（**含 seedCollectionRow**——终裁 W-4；函数面=§5.0） | 组件非受锁；ai-seed+E1=[locked-change][test-refactor] | verify 绿+E1 绿 | U2 |
| U4 任务卡+审计抽屉 | TaskCard+AuditDrawer+aiTasksStore；E2（六态+取消+running 无取消+终态三态）、E6（审计抽屉） | 组件非受锁；E2/E6=[locked-change][test-refactor] | verify 绿+E2/E6 绿 | U2+U3 |
| U5 管理面板三 Tab | manage/ 四件+aiMemoryStore+管理节集成；E3（置顶闭环）、E7（记忆 CRUD 全链 global 档） | 同上 | verify 绿+E3/E7 绿 | U2 |
| U6 预算节+级联接线 | BudgetSection+预算节集成；CascadeConfirmDialog+papers/folders 删除流接线；E4（持久化+校验+恢复默认）、E5（两次确认+零计数+**folder 删除第三场景**——终裁 W-5 e2e 面） | 组件/接线非受锁；E4/E5=[locked-change][test-refactor] | verify 绿+E4/E5 绿 | U1+U2 |

## §5 e2e 规格（Playwright，真实文本断言）

### 5.0 种子机制

既有 e2e-env 直写 DB 先例（seedPaperRow 模式）；tests/e2e/ai-seed.ts 函数面（终裁 W-4 闭合）：
seedAiSession(scope,anchorId)→id ／ seedAiMessage(sessionId,{role,content,pinned}) ／
seedAiTask(sessionId,{action,state,resultSummary?,error?}) ／ seedAiAuditRow(taskId,seq,kind,
{summary,before?,after?}) ／ seedAiMemory({scope,anchorId,category,title,content,pinned,origin}) ／
seedCollectionRow(name)→id ／ readAiAuditCount(taskId)。禁 test-only IPC。锚对象行复用既有
seedPaperRow/seedCollectionRow。

### 5.1 用例清单（E1-E7）

- E1 三入口可达（U3）：开文献→「AI 会话」→「暂无会话消息」+「对话能力将在后续版本接入」；脉络页同
  （seedCollectionRow）；设置页三节标+顺序。
- E2 任务卡六态与取消（U4）：queued→「排队中」+取消→点击→「已取消」；running→「执行中」无取消钮；
  succeeded/failed/timeout→「已完成」/「失败」/「超时」（failed 断言错误文案）。
- E3 置顶闭环（U5）：seed pinned 消息（挂 seedPaperRow 锚）→置顶 Tab 断言文本+锚标题→取消置顶→
  行消失+空态。
- E4 预算持久化与校验（U6）：「于下次对话生效」文案在节；paper 上限 8000→9000→保存→reload→9000；
  L1=9000（12200>9000）→行内错误+保存禁用；负数/清空→行内错误；恢复默认→回默认值（paper 8000）。
- E5 级联两次确认（U6）：场景一 paper 删——seed 文献+AI 资源（1 会话/2 消息/1 记忆/1 任务+2 审计行）→
  删→第一确认→第二窗四计数+「审计记录将保留」→取消→文献与消息仍在；再双确认→文献删+审计恒存
  （readAiAuditCount=2）。场景二零计数——无 AI 资源文献删除仅第一窗。**场景三 folder 删（终裁 W-5）**——
  seed 夹+夹内文献+paper 档与 lineage 档（collections.id 锚）AI 资源各一→删夹→第二窗断言双面合计→
  确认→两档资源俱灭+审计恒存。
- E6 审计抽屉（U4）：seed 任务+3 审计行（mutation×2/permission×1）→抽屉断言 seq 升序+「变更」
  「权限决策」+摘要文本+before/after；无审计行任务→「暂无审计记录」。
- E7 记忆手动 CRUD 全链（U5）：global 档新建（分类下拉+标题+内容）→列表断言→编辑→置顶→删除→空态；
  agent 行→「代理生成」标+无编辑面。

## §6 明确不为本批

对话管线/模型调用/流式渲染；装配引擎 UI 直消费；真实发送能力；renderer 直写消息通道与全部派生面
（appendMessage IPC/evicted toast）；SESSION_CAP banner 与 evicted toast 组件（延后管线批不留残段）；
任务结果消息联动高亮；记忆锚选择器；paper/lineage 档记忆手动新建（表单置灰）；任务手动创建入口；
记忆 agent 行编辑；审计行改/删；全局审计视图；rail 增项；多窗口；负面清单全部沿用；新依赖；
renderer 引 Node API；改既有视觉体系与删除对话框第一窗。

## §7 裁定记录（v1 Q1-Q7+v2 新呈裁 3 条——全部已裁）

v1 七问：Q1 不设 rail｜Q2 openOrGet｜Q3「于下次对话生效」｜Q4 e2e-env 直写 DB｜Q5 仅任务级抽屉｜
Q6 记忆 CRUD 最小集入范围｜Q7 节序 AI 助手→AI 管理→AI 预算不拆子页。
v2 新呈裁三条（主控终裁 2026-10-10）：**新1=新建仅 global 档开放**（paper/lineage 置灰+提示；备选
「锚 id 输入行」不采——anchorId=内部 uuid 无用户可得性，复核轮 N-5 同判）；**新2=通道名保持
ai-sessions-open**（语义收敛 main 侧，preload 零 churn）；**新3=零计数断言并入 E5 场景二**（用例数 7 不变）。

## §8 主控终裁补遗（复核轮 W/N 处置——2026-10-10）

| 审项 | 处置 | 落点 |
| --- | --- | --- |
| W-1 list-by-scope 双语义 | 定型：query 缺席=列表模式（过滤+updated_at DESC,id DESC+limit 200）；query 在席=检索模式（{scope,query} 恒真组合，category/pinnedOnly 与 query 互斥 refine 拒，topK=8 排序沿检索口径） | §3.2 |
| W-2 refine 矩阵 | 分治定型：写/锚绑定通道（open/create）用全域矩阵；读通道（tasks-list/list-pinned）anchorId 三值语义（undefined=不过滤/null=仅 global/非空串=该锚）；cascade-preview 独立枚举独立矩阵（paper→papers.id/folder→collections.id，恒必填） | §3.2 矩阵段 |
| W-3 label 契约 | label 可选 string ≤50 default ''（报告 §3.B 语义=展示过滤与检索命中，非必填）；表单 v1 无 label 输入面；E7 不涉 | §3.2 |
| W-4 种子闭合 | ai-seed.ts 增 seedCollectionRow(name)→id；E3 锚对象行=seedPaperRow 复用明示 | §5.0 |
| W-5 folder 双面验证 | 双面承载：U2 cascade 服务单测覆盖 paper/folder 双分支+E5 场景三（folder 删双面合计断言） | §4.3-U2/U6、§5.1-E5 |
| N-1 cancel INVALID_REQUEST | 卡面统一 toast 通用错误 | §1.2 |
| N-2 审计抽屉分页 | 首载 limit 100+「加载更多」（afterSeq 递增） | §1.3 |
| N-3 category 值域 | zod refine 按 shared 档级枚举×scope 校验（create/update 同矩） | §3.2 |
| N-4 空会话计数 | previewCounts 会话计数=全部会话行含空会话（诚实计数不特判；零计数语义=从未打开过 AI 面板） | §1.6 |
| N-5 新呈裁-1 备选分支 | 不采（uuid 无用户可得性） | §7 |
| 复核轮「不确定」预算 L2 片数 | 锚定：l2Slices 默认=paper 15/lineage 3/global 8（单源链=AI 域报告 §3.C 预算表→本档 §1.5；17 默认值全表落本档） | §1.5 |

## §9 预算默认值表（单源——实施 U1 常量与 E4「恢复默认」断言的唯一定值面）

| 档 | cap | l1 | l2Slices | l2Cap | tail |
| --- | --- | --- | --- | --- | --- |
| paper | 8000 | 800 | 15 | 2200 | 1000 |
| lineage | 6000 | 1800 | 3 | 600 | 1200 |
| global | 4000 | 600 | 8 | 1200 | 1000 |
| agent | perShot=800 | perRound=2000 | — | — | — |

派生：AI 域报告 §3.C 预算表（初值，校准后调——本批只持久化不消费，系数冻结挂账沿承 v175）。
