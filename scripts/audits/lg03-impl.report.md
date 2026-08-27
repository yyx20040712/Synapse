# SR2-LG-03 实现者报告 —— 脉络图交互编辑+自动保存+退出聚合

日期：2026-08-27 ｜ 实现者子代理（strong，三屋模式）｜ 工单状态：open（registry 翻状态归主控收口）

## 开工技能清点（宪法会话开工纪律）

- **用**：test-driven-development（红→绿→变异红证→verify 四档）、
  verification-before-completion（verify 真退出码落盘+tail 复核）、
  javascript-testing-patterns（组件测试先例复用：canvas 测试 mount/flush、
  notes-panel typeInto）、frontend-ui-engineering（菜单/对话框/拖拽交互面）
- **备用未触发**：systematic-debugging（无卡点）
- **不用**：git 类（实现者禁 git 写操作）、subagent-driven-development（终端
  实现者不派发）、receiving-code-review（门审非本角职责）、数据工程/运维类
  （无交集）

## 摘要

- **写四通道接线**（[locked-change] 扩 schemas/api-surface，127→129 locks 含
  新测试）：lineage/upsert-node（Req=LineageNodeInput camelCase：id?/paperId?
  /title/coreIdea/year/x?/y?——缺省归一 null=新建主题节点/自动布局）/remove-node
  （Req={id}）/upsert-edge（Req={from,to,label?}——裁决字面）/remove-edge
  （Req={id}，remove 两通道共用 lineageIdReqSchema——tags attach/detach 复用
  先例）；Res=LineageNode/LineageEdge/trueAck×2；十一域穷举不变（方法枚举
  allChannels/preload/ApiHandlers 自动推导——零额外接线）。
- **service 守卫抛错升 LineageDomainError**（CONFLICT，message 中文原文不变
  ——LG-01 受锁测试断言子串兼容全绿）：机制前提=toAppError 对无 code 的普通
  Error 折叠 message 进 detail（renderer 只见「发生未预期的内部错误」），
  「reason 透传 toast」在原抛错形态下不成立（接缝归责发现，自裁申报 1）。
- **lineage.store 写态扩**（278 行）：保存态三态 saved/saving/error+
  lastWriteError+**动作队列驻 state**（queue/flushing）；动作排队**最后写胜出**
  （同 kind 同实体排队合并——新建节点无 id 不合并）；系统型失败=队首保留+
  error 态+重试（INV-04 同型：失败不推进保存态）；**CONFLICT 拒绝型=动作丢弃
  继续**（树守卫 reason 透传 toast——永不成功的动作不卡队头不误报退出 dirty）；
  upsert 成功回填 store 数据（remove-node 级联镜像清悬空边）；**load 写读互锁**
  （写队列未清空时 graph 落地丢弃+回置 ready 不卡 loading）；useLineageDirty()
  脏投影（≠saved 即脏）。
- **改父 N5 语义**：删旧边+加新边两动作入队（UI 单操作）；删成功+加失败=
  合法中间态+toast「旧连线已移除，新连线未建立：{reason}」+重试只重发加边
  （removeEdge 已成功出队不重发）。
- **Canvas 编辑回调接缝**（LineageCanvas 249 行 ≤250，可选回调零回调时行为
  不变——LG-02 受锁测试零改动全绿）：onNodeDrag（拖拽落点=布局坐标+位移/k，
  实时跟随渲染）/onNodeClick（位移阈值 3px 区分单击选中）/onNodeContextMenu
  （右键菜单锚）；视口换算收在 Canvas（k 驻组件内——Board 委托无法取得）。
- **LineageBoard**（217 行）+三子组件（NodeMenu 77/AddNodeDialog 162/
  EditIdeaDialog 46——组件 ≤250 拆分预案落地）：节点拖拽/添加两型（文献=
  library.list 搜索选取，主题=title）/加边=菜单「连线到…」目标选取/改父/
  删节点删边/core_idea textarea；保存态指示条（saving/error+重试按钮，
  autosave-first 无「保存」按钮）。
- **退出聚合扩面**：App.tsx `useTabDirtyAggregate() || useLineageDirty()` 组合根
  单点（TABS-04 行为面零触碰）；tab-dirty.ts :14 stale 声明行注释级更新
  （tabs∪lineage 三方锚定：tab-dirty+lineage.store+App）；INV-22 行扩面
  （docs/invariants.md 不受锁——manifest 129 条无 docs/，直接改）。

## 文件清单

实现面（非受锁）：
- src/renderer/features/lineage/LineageBoard.tsx（票面占位→实现 217 行，头注
  五层规约原文保留+实现注追加）
- src/renderer/features/lineage/LineageNodeMenu.tsx（新增 77 行）
- src/renderer/features/lineage/LineageAddNodeDialog.tsx（新增 162 行）
- src/renderer/features/lineage/LineageEditIdeaDialog.tsx（新增 46 行）
- src/renderer/features/lineage/LineageCanvas.tsx（LG-02 交付扩可选编辑回调，
  179→249 行；头注「只读」条目改「节点交互原语上抛（写路径归 Board）」）
- src/renderer/features/lineage/lineage.store.ts（57→278 行，写面状态机全量
  迁移表入头注）
- src/renderer/features/lineage/LineagePage.tsx（Canvas→Board 编排+selectedNodeId
  驻页（04 侧板消费面预留））
- src/main/ipc/lineage.ts（四通道委托+缺省归一：paperId/x/y 省略→null、label→''）
- src/main/services/lineage/lineage.service.ts（守卫 7 处 throw 换 LineageDomainError
  ——逻辑/文案零改动）
- src/renderer/app/App.tsx（聚合扩一行族+注释）
- src/renderer/features/reader/tab-dirty.ts（:14 stale 声明行注释级）
- docs/invariants.md（INV-22 行扩面——非受锁）

受锁面（unlock→批内改→generate→apply 全程留痕，127→129）：
- src/shared/ipc/schemas.ts（四通道 Req schema+类型）
- src/shared/ipc/api-surface.ts（lineage 域四端点+models/lineage schema import）
- tests/unit/renderer/lineage-store-write.test.ts（新增 [locked-change]，11 用例
  always-active 不经 guardedDescribe）
- tests/unit/renderer/lineage-board.test.tsx（新增 [locked-change]，14 用例
  always-active）
- locks/manifest.json（129 条）

## 红证四档（TDD）

1. **红**：两测试文件先行（20 用例全量断言），实现缺失→红，npm exit=1
   （11 failed/573 passed，基线零回归）——构成=board 10 用例构造级断言红
   （占位 Board 渲染空 div，交互元素/断言目标缺失）+store-write 文件级
   模块红（node 环境下 vi.mock importOriginal 触发 client.ts 顶层
   `window.api` 引用 ReferenceError——文件加载即失败非用例级；环境转
   jsdom 后用例首次执行时实现已在，故 store 写面的用例级红证由变异
   红证 M1/M2 承担），scripts/audits/lg03-red.log（尾注 EXIT:1）。中途
   补组合根用例的 window.api stub（App.tsx:74 直用 window.api 非 client
   门面——jsdom 下 undefined）。
2. **绿**：npm run test 84 文件 593 用例全过（基线 82/573 → +2 文件+20 用例），
   exit=0，scripts/audits/lg03-green.log。绿档间**两个实现缺陷被测试拦出**：
   ①flush 出队 slice(1) 与排队合并冲突（flight 中队首被合并替换后盲切首位
   误删未发送的后值——改按动作身份 filter 出队）；②load 写读互锁丢弃分支
   不回置 status 卡 loading（回置 ready——写进行中必有数据面）。另修测试
   卫生四处（React 受控输入 typeInto 原生 setter 法——notes-panel 先例；
   once 队列跨用例残留→逐 fn mockReset 重设默认；mock 回显不全污染后续
   断言；node→jsdom 环境——client.ts 顶层读 window）。
3. **断言级变异红证**（cp 备份法，禁 git checkout；npm 真退出码；三轮还原
   diff 均空输出 RESTORE-DIFF-EMPTY，scripts/audits/lg03-mutation.log；变异
   对象=非受锁的 lineage.store.ts/LineageCanvas.tsx）：
   - M1 排队合并禁用（sameTarget 恒 false）→「连续编辑最后写胜出」红
     （1 failed/592，exit=1）；还原 diff 空。
   - M2 拒绝型分类破坏（CONFLICT→永不匹配）→「拒绝型丢弃+toast+saved」+
     「树拒绝三路径 toast（saveStatus 断言）」红（2 failed/591，exit=1）；
     还原 diff 空。
   - M3 拖拽落点位移丢弃（drag 回调载荷=原点）→「拖拽落点→upsert-node x/y
     载荷」红（1 failed/592，exit=1）；还原 diff 空。
4. **verify 终局**：scripts/audits/lg03-verify.log，**exit=0**（quality 无占位/
   无乱码/无跨域引用+tickets 一致（data-ticket 标记保留见自裁 8）+locks 129
   一致+lint+typecheck+test 84/593+build）。中途三次 exit≠0 全部收敛：
   ①Canvas 251 行超 check-quality 组件 250 上限（split 计数含尾元素——压至
   wc 249）；②lint 拦测试 `typeof import()` 类型注解（改 import type * as 语句）；
   ③typecheck 拦两处（WriteAction 联合窄化 `'reparent' in action`——vitest
   不查类型 tsc 关卡拦住，宪法「受锁测试改动后必须全量 verify」同族实证；
   Element.click 收窄 cast）。每次受锁测试改动均 unlock→改→generate→apply。

## 测试证据（20 用例）

- **lineage-store-write.test.ts**（10，jsdom 环境——client 顶层 window）：
  加节点两型载荷（paperId 绑定+元数据默认 vs 主题 null）+回填/moveNode+
  editCoreIdea 全字段载荷（x/y 覆盖与 coreIdea 互不清空——防半更新丢字段）/
  连续编辑最后写胜出（flight pending→两次入队合并→总调用 2 次末值落发）/
  系统型失败 error 态（≠saved）+lastWriteError+队列保留+toast+retry 重发恢复
  saved/拒绝型 CONFLICT 丢弃+reason toast+回落 saved+队列空/removeNode 级联
  回填（悬空边全清）/upsertEdge+removeEdge 回填（追加/清除）/**N5 改父部分
  失败**（删旧+加新两调用+error 态+toast「旧连线已移除，新连线未建立」+
  合法中间态 edges 空+retry 只重发加边（removeEdge 1 次 upsertEdge 2 次））/
  **load 写读互锁**（队列未清空 graph 落地丢弃不覆盖写回填）。
- **lineage-board.test.tsx**（10，createRoot/act/flush+typeInto）：拖拽落点→
  upsert-node x/y 载荷（覆盖位 500/400+位移 60/30→560/430+全字段保留）/单击
  选中上抛（位移低于阈值不触发写）/加边全流程（右键菜单→连线到…→提示条→
  点目标→upsertEdge {from,to,label:''}+完成即退出选取模式）/树拒绝三路径
  toast（多父/成环/自环 reason 透传+拒绝=丢弃非脏态）/改父=删+加两调用/
  删父连线+删节点/core_idea 编辑（textarea 改值+**x/y 保留**断言）/保存失败
  指示+重试按钮重发+成功指示消退/添加对话框两型（library.list 搜索载荷+
  选取→paperId 绑定；主题 title→paperId null）/组合根退出聚合（App 挂载→
  nav 切脉络→拖拽失败→setQuitDirty 末次 {dirty:true}——INV-22 扩面锚定）。

## locks 实录

基线 127 → unlock（129 个文件解锁面）→批内改（schemas/api-surface/两新测试
+lint/typecheck 修复三轮）→generate（129 条，+2 新受锁路径 lineage-store-
write.test.ts/lineage-board.test.tsx）→apply（129 只读）→verify 内 locks:check
一致 exit=0。**注意**：lint/typecheck 修复轮再次触碰已入锁的新测试——每轮
unlock→改→generate→apply 闭环（manifest sha 与工作区同步，无跨轮延迟）。
manifest 变更随本单提交，提交信息须带 [locked-change] 尾注。

## 自裁申报

1. **service 守卫抛错升 LineageDomainError（动 LG-01 文件，主控追认
   2026-08-27——回炉 1 轮裁决）**：票面「service reason 透传 toast」在原
   普通 Error 形态下机制不成立（toAppError 折叠 message 进 detail，
   renderer unwrap 只见通用文案——追认理由即此折叠机制）。处置=域错误类
   升级（reader.service ReaderDomainError 同型，守卫 7 处 throw：upsertNode
   幽灵 paperId 1+upsertEdge 自环/来源不存在/目标不存在/重复边/多父/成环 6），
   **守卫逻辑与中文文案零改动**（LG-01 受锁测试 toThrow 子串全绿实证）。
   ipc/lineage.ts 零 catch（结构化透传），装配层不包装。
2. **写失败二分类（票面未显式）**：CONFLICT（业务拒绝：树守卫/幽灵 paperId）
   =动作丢弃+toast+保存态回落（永不成功的动作保留会卡死队头+退出 dirty 永
   真误报）；其他（系统型：DB/IO）=队首保留+error+重试（票面字面）。N5 改父
   的加边系统型失败仍走保留重试路径（合法中间态语义不受分类影响）。
3. **队列/flushing 驻 store state**（非模块闭包）：脏态判定单源（queue 非空
   即未竟）+测试可直接断言（notes.store 防抖句柄闭包先例的取舍反转——理由
   写入头注）。
4. **Canvas 可选编辑回调**（扩 LG-02 交付面）：视口换算（位移/k）只能在
   Canvas 内正确完成（k 驻组件 state）——「Board 包裹画布」的接缝具体化为
   回调上抛；零回调时行为与 LG-02 完全一致（受锁 canvas 测试零改动全绿）。
   头注「只读：无任何写交互元素」条目改写为「节点交互原语上抛，写路径归
   Board」——接缝声明随单更新。
5. **upsert-node Req 可选字段语义**：paperId/x/y 省略→ipc 装配归一 null
   （主题节点/自动布局）；**整行 upsert 语义下消费方半更新会清字段**——防
   线收口在 store 语义化动作（moveNode/editCoreIdea 内部全字段构造，Board
   不手拼载荷）。
6. **树拒绝零 UI 预守卫**（含 pendingLink 点击自己=service 自环拒绝 toast）：
   票面「本单零守卫代码只接 toast 呈现」字面遵从——「双保险同 08」的 UI 侧
   在本单=toast 可见性而非按钮禁用（票面原文如此，未发明禁用交互）。
7. **重复 paper 节点防呆**：添加对话框过滤 existingPaperIds（DB 不禁止同
   paperId 双节点，LG-01 草稿校验的重复节点面仅限导入路径——应用内防呆归
   消费方，票面未提，自裁备案）。
8. **data-ticket 标记形态**：票面「完成后：删除 data-ticket 与占位→npm run
   verify 绿」与 check-tickets 规则 4（open 且 .tsx UI 工单必须含标记）冲突
   ——占位（空 div return）已删，标记改为实现根 div 属性保留
   （data-ticket="SR2-LG-03"——SidePanel 同态），翻 done 时由主控收口移除
   （规则 4b 拦残留）。verify exit=0 实证此形态为 open 期唯一绿形态。
9. **导入草稿入口（初轮未做→回炉 1 轮主控裁决①补入）**：初轮按主控裁决 4
   交互最小面清单（无导入项）未做，LG-01 票面「renderer 确认对话框『导入将
   替换现有脉络图』」消费窗口悬空候裁——门一裁为回炉项，已补（处置见文末
   「回炉 1 轮处置记录」节：Board 工具栏按钮+confirm+importDraft 通道消费+
   成功刷新+errors toast）。
10. **测试中途修正实录**（全部收敛，无绕过断言）：window.api stub（组合根
    用例）/React 受控输入 typeInto（原生 setter——reader-notes-panel 先例）/
    once 队列残留防御（clearAllMocks 不清 once→逐 fn mockReset）/mock 回显
    全量（半行回显污染后续断言）/node→jsdom 环境/typecheck 两处（in 窄化+
    Element cast）/lint typeof import() 形态。
11. **删减面 diff 自查**：git diff --stat=12 文件 585+/61-（manifest/INV-22/
    schemas/api-surface/ipc/service/store/Canvas/Board/Page/App/tab-dirty），
    未跟踪新增 5 路径（三子组件+两测试）——全部在票面交付面+受锁面；
    dist_new/ 为 2026-08-23 前历史残留（本会话未触碰，LG-01/02 报告同声明）；
    无范围蔓延。
12. **工单号引用纪律**：新文件头注一律「LG-03」短式；SR2-LG-03 全号仅票面
    文件 LineageBoard.tsx 头注原文+Board 根 div data-ticket 标记（票面文件
    自身合法）；新代码/测试注释零其他 open 工单全号。

## 疑虑

- **树拒绝丢弃后无「重试该边」**：被拒动作已丢弃（重试无意义——永不成功），
  用户须重新发起连线；toast 6s 可见性是唯一指引。若门审要求拒绝后进入
  「修正目标」模式（保留 source 重选），为一小交互面补改。
- **拖拽视口换算的 jsdom 验证边界**：组件测试 k=1（位移/k=位移）；k≠1（缩放
  后拖拽）公式正确性靠实现审读（viewportRef 同步 effect），zoom+drag 组合
  真实浏览器面归 LG-05 e2e（LG-02 报告 zoom 锚点同族边界）。
- **store flush 内弹 toast**（含拒绝型 reason）：动作型可见性不在组件树——
  reader.store「.ts 模块 showToast」先例同型；组件测试经 toast-store mock
  断言（无第二真相源）。
- **LineageCanvas 249 行贴 250 上限**（check-quality split('\n') 计数含尾元
  素，wc 249）：后续任何节点交互扩展须先拆（拖拽会话可抽 hook）。
- **e2e 面全归 LG-05**：拖拽→reload 位置持久/树拒绝 toast 真实渲染/退出拦截
  弹窗全链——本单仅组件级+组合根级锚定（INV-22 扩面状态列已注记）。
- **LineagePage 无侧板布局**：selectedNodeId 落页 state 但零消费——消费面=
  LG-04 侧板（LineageSidePanel，票面 props 形态已预留；主控回炉 1 轮 N1
  记录：不改动仅指针备案，2026-08-27）。
- **导入草稿 errors 呈现为汇总计数+首条明细**（回炉裁决①授权形态自裁）：
  逐条多 toast 会被同文案 1s 去重吞且刷屏、对话框清单面超出回炉范围——
  完整清单呈现为 v2 候选；CANCELLED（main 侧文件选择取消）=info 轻量
  toast「已取消导入」无其他动作（LibraryPage 导出「取消也可见反馈」先例
  对齐主控「取消=无操作」语义）。

## 回炉 1 轮处置记录（主控裁决：门一意见全采，2026-08-27）

- **①导入草稿入口（候裁 B 回炉项，LG-01 票面条款兑现）**：
  - 实现面：Board 工具栏「导入草稿」按钮（data-testid="lineage-import"）
    +动作体拆独立文件 **src/renderer/features/lineage/lineage-import.ts**
    （41 行，新增——组件行数红线落点：内联版把 Board 顶到 263 行破
    check-quality 组件 250 关卡，拆出后 Board 231 行；window.confirm 在
    .ts 模块的先例=tab-dirty.ts confirmCloseDirty）。链路：confirm「导入
    将替换现有脉络图」→lineage/import（main 侧 dialog 选 JSON，INV-07）
    →成功计数 toast（nodeCount/edgeCount）+store.load() 刷新；校验失败
    =汇总计数+首条 path/reason toast（形态自裁见疑虑段）；CANCELLED=
    info 轻量反馈无其他动作。
  - 测试：lineage-board.test.tsx 增 3 用例（+回炉红证 MUT-RW：confirm 后
    强制 return 不调通道→确认+errors 两用例红（2 failed/594，exit=1），
    取消用例守卫面在 confirm 分支不受该变异影响；还原 diff 空）——
    确认接受→importDraft({}) 调用+成功 toast 文本+graph 刷新调用；confirm
    取消→通道与 graph 零调用；errors→toast 真实文本（共 2 处+首条
    path+reason）+失败不刷新。日志：lg03-rework-red.log / lg03-rework-
    green.log / lg03-verify-rework.log。
- **②文书修正（W1/W3）**：自裁申报 1 的 DomainError 条目计数 6→**7 处**
  （upsertNode 幽灵 paperId 1+upsertEdge 六守卫）+「主控追认 2026-08-27」
  字样与追认理由（toAppError 折叠机制所致 reason 透传不成立）入条目；
  mutation log 补实施命令痕迹节（每轮变异前后 cp 备份/变异 node -e/还原
  diff 命令行实录，含回炉 MUT-RW）；红档措辞精度修正（11 failed 构成=
  board 10 用例构造级断言红+store-write 文件级模块红——node 环境下
  vi.mock importOriginal 触发 client.ts 顶层 window 引用，用例级红证由
  变异 M1/M2 承担的说明补齐）。
- **③N1 记录（零改动）**：selectedNodeId 零消费=LG-04 消费面（票面 props
  形态已预留）——不改动，疑虑段指针句已补（见上「LineagePage 无侧板
  布局」条）。
- **回炉终局数字**：npm run test 84 文件 **596 用例** exit=0（初轮 593
  +3）；npm run verify **exit=0**（quality+tickets+locks 129+lint+
  typecheck+test 596+build），真退出码追加 lg03-verify.log（全文=
  lg03-verify-rework.log）。回炉两次 exit≠0 收敛实录：①Board 263 行破
  组件 250 关卡（导入逻辑拆 lineage-import.ts）；②typecheck 拦测试
  confirmSpy helper 的 spyOn 泛型联合（去 helper 改两处内联——Rule of
  Three 内保持重复）。受锁测试改动两轮均 unlock→改→generate→apply
  闭环（manifest 129 条 sha 同步，[locked-change] 尾注随提交）。
- **回炉文件清单增量**：src/renderer/features/lineage/lineage-import.ts
  （新增 41 行）+LineageBoard.tsx（231 行，按钮接线）+tests/unit/
  renderer/lineage-board.test.tsx（+3 用例）。
