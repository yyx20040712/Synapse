# SR2-LG-04 实现者报告 —— 节点侧板+笔记双击跳阅读器

日期：2026-08-27 ｜ 实现者子代理（strong，三屋模式）｜ 工单状态：open（registry 翻状态归主控收口）

## 开工技能清点（宪法会话开工纪律）

- **用**：test-driven-development（红→绿→变异红证→verify 四档全程）、
  verification-before-completion（verify 真退出码落盘+尾注复核）、
  javascript-testing-patterns（组件测试先例复用：board 测试 mount/flush/
  clickNode/click 派发、ai-notes-section 测试 mock 面与断言形）
- **备用未触发**：systematic-debugging（绿档仅一处 JSX 括号语法错，
  esbuild 报错定位即改，非疑难卡点）
- **不用**：git 类（实现者禁 git 写操作）、subagent-driven-development
  （终端实现者不派发）、receiving-code-review（门审非本角职责）、
  前端设计/数据工程/运维类（无交集）

## 摘要

- **锚递达路径=总线载荷扩（主控裁决 1 选项 A，自裁申报 1）**：
  open-paper-bus.ts 增 `OpenPaperRequest { paperId; anchor?; aiNoteId? }`
  载荷形状（闩锁 lastRequest 同步扩形）+`requestOpenPaperAnchored`；
  `requestOpenPaper(paperId)` 保持单字段语义（library/anchor-locate 既有
  调用方零改动；locateAnchor 内部重发不带锚——防事件回环）。
- **阅读器消费侧=新模块 open-paper-anchor.ts（openFromBus 定路由）**：
  带 anchor→locateAnchor（INV-20 单入口：打开/等就绪/三防线/exact 层
  data-ai-note-id 闪烁全归它）；无 anchor→reader.store openPaper 既有
  链路（动作型失败 toast 文案原样迁移）。ReaderPage 两路（挂载闩锁补读+
  实时监听）统一改经 openFromBus（头注接缝三方锚定：SidePanel+
  open-paper-bus+open-paper-anchor+ReaderPage 四处声明落齐）。
- **侧板四区**（LineageSidePanel 169 行+两子件）：
  ①元信息（title/year/绑定徽标 data-binding=paper|theme）②core_idea 只读
  ③AI 笔记分节（LineageSideAiNotes 110 行——ai_sensor.listByPaper 惰性
  直连+请求序号 stale 守卫+loading/error 重试/空态；role 三组中文标签×
  七问分色=ai-note-style 单源跨域只读消费，check-quality
  COMPOSITION_ROOT_ALLOW 白名单受控例外 [locked-change]）④人工笔记
  （LineageSideManualNote 76 行——notes/get 总评层 Note|null）。主题节点=
  仅前两区+「主题节点无笔记」（笔记通道零调用）。
- **双击跳转链**（票面语义）：AI 条目双击→onJumpToPaper 载荷上抛（构造
  单点在 SidePanel：anchorPage **1 基→0 基**（AiNotesSection:200 同型）；
  「无锚」判定=quoteText<2 且 anchorPage null→anchor 缺省；页码在即保留
  anchor 防回退第 0 页——locateAnchor paper 层阈值同源）→LineagePage
  编排 requestOpenPaperAnchored（anchor null→undefined 归一）→App 切
  view→ReaderPage 闩锁补读→openFromBus→locateAnchor。
- **selectedNodeId 消费=03 预留出口兑现**：LineagePage 经 lineage.store
  查找分发（nodes.find——store 消费合法非双取）；LineageBoard 透传→
  LineageCanvas 新可选 prop（accent 描边加粗+data-selected 标记；
  缺省行为不变，LG-02 受锁测试零改动全绿）。

## 文件清单

实现面（非受锁）：
- src/renderer/features/lineage/LineageSidePanel.tsx（票面占位→实现 169 行，
  头注五层规约原文保留+实现注追加；data-ticket 骨架标记翻 done 前保留）
- src/renderer/features/lineage/LineageSideAiNotes.tsx（新增 110 行——区3，
  ai-note-style 白名单例外宿主）
- src/renderer/features/lineage/LineageSideManualNote.tsx（新增 76 行——区4）
- src/renderer/features/lineage/LineagePage.tsx（62→97 行：侧板布局 aside+
  selectedNode selector+handleJumpToPaper 总线发送单点）
- src/renderer/features/lineage/LineageBoard.tsx（233 行：selectedNodeId
  透传 Canvas 一行）
- src/renderer/features/lineage/LineageCanvas.tsx（249 行：+selectedNodeId
  可选 prop+选中视觉；ZOOM 三常量合并对象+Viewport interface 单行化
  对冲行数——check-quality 组件 250 关卡）
- src/renderer/features/reader/open-paper-anchor.ts（新增 30 行——消费侧
  定路由，头注接缝锚定）
- src/renderer/features/reader/ReaderPage.tsx（250 行：open 两路统一走
  openFromBus；effect 依赖 []——openFromBus 内部 getState 无 props 耦合）
- src/renderer/shared/open-paper-bus.ts（29→53 行：OpenPaperAnchor/
  OpenPaperRequest 形状+requestOpenPaperAnchored+闩锁扩形；既有函数
  签名零破坏）
- src/renderer/features/reader/ai-note-style.ts（头注消费方清单+LG-04
  白名单例外行——接缝双向锚定）
- src/renderer/features/reader/ai-notes.store.ts（头注 W4 例外声明：lineage
  侧板直连不经本 store，单约范围限 reader 域——接缝双向锚定）

受锁面（unlock→批内改→generate→apply 全程留痕，129→130）：
- scripts/check-quality.mjs（COMPOSITION_ROOT_ALLOW+LineageSideAiNotes→
  reader/ai-note-style 白名单行+注释块说明）
- tests/unit/renderer/lineage-side-panel.test.tsx（新增 428 行 [locked-change]，
  18 用例 always-active 不经 guardedDescribe）
- locks/manifest.json（130 条）

## 红证四档（TDD）

1. **红**：测试先行（18 用例全量断言），实现缺失→npm run test **EXIT:1**
   （文件级构造红：open-paper-anchor 模块不存在 vite import 解析失败；
   基线 84 文件 596 用例零回归）。用例级渲染红由变异红证 M1~M4 承担
   （lg03 同型——文件级红遮蔽用例级，断言级变异逐条补证），日志
   scripts/audits/lg04-red.log（尾注 EXIT:1）。
2. **绿**：npm run test **85 文件 614 用例 EXIT:0**（基线 84/596→+1 文件
   +18 用例），scripts/audits/lg04-green.log（尾注 EXIT:0）。绿档中途一次
   EXIT:1：LineageSideAiNotes 三元表达式 JSX 闭合括号缺一（esbuild 报错
   定位即改——语法错非断言错，基线其余文件无影响）。
3. **断言级变异红证**（cp 备份法，禁 git checkout；npm 真退出码；四轮还原
   diff 全空，scripts/audits/lg04-mutation.log 含实施命令痕迹）：
   - M1 anchorPage 0 基转换删除（`-1` 移除）→0 基三用例红（3 failed/611，
     exit=1）；还原 diff 空。
   - M2 无锚判定恒 true→篇级防线两用例红（2 failed/612，exit=1）；还原
     diff 空。
   - M3 消费方定路由分支恒假（openFromBus `if (false)`）→「带锚→
     locateAnchor 单入口」用例红（1 failed/613，exit=1）；还原 diff 空。
   - M4 stale 守卫删除（cleanup seq 置位移除）→「换节点晚到旧响应不
     覆盖」用例红（1 failed/613，exit=1）；还原 diff 空。
4. **verify 终局**：scripts/audits/lg04-verify.log（尾注 EXIT:0）——
   quality（无占位/无乱码/跨域白名单生效）+tickets（data-ticket 标记
   保留见自裁 2）+locks 130 一致+lint+typecheck+test 85/614+build。
   中途一次 exit≠0 收敛：LineageCanvas 253 行破组件 250 关卡（Viewport
   interface 单行化 -4→249）。

## 测试证据（18 用例，always-active）

- **消费方级 INV-20（openFromBus，4）**：带锚请求→locateAnchor 单入口
  （锚三元组+aiNoteId 透传；openPaper 不重复调）/无锚请求→openPaper
  既有链路（locateAnchor 不介入）/页级降级（resolve page）静默零 toast
  （降级提示归单入口内部——消费侧不重复）/无锚打开失败→动作型 toast
  （文案保持）。
- **SidePanel 组件级（11）**：文献节点四区渲染（元信息 title/年份/绑定
  徽标+核心 idea+AI 分节 role 组中文标签序+QUESTION_COLOR.Q1 分色单源
  断言+人工笔记 contentMd）/主题节点仅前两区+空态文案+笔记通道零调用/
  AI 条目双击→onJumpToPaper 锚三元组+aiNoteId（anchorPage 1 基→0 基
  断言 3→2）/无锚条目→anchor 缺省（篇级防线）/有页码无引文→anchor
  保留页码（不回退第 0 页）/条目单击不触发跳转/AI 取数失败 error+重试
  恢复/人工取数失败 error+重试（与 AI 面独立呈现互不覆盖）/双空数据
  空态文案（非错误）/未选中节点空态/换节点 stale 守卫（慢旧响应晚到
  不覆盖新节点数据）。
- **Page 编排级（3）**：单击节点→侧板挂载呈现节点+Canvas 选中视觉态
  （data-selected true/false）全链/带锚双击→requestOpenPaperAnchored
  0 基锚载荷/无锚双击→载荷 anchor 缺省（仅开篇）。

## locks 实录

基线 129 → unlock（130 个文件解锁面）→批内改（check-quality.mjs 白名单行
+新测试随实现三轮语法/行数收敛）→generate（**130 条**，+1 新受锁路径
tests/unit/renderer/lineage-side-panel.test.tsx；check-quality.mjs 内容
sha 同步）→apply（130 只读）→verify 内 locks:check 一致 exit=0。manifest
行尾已核 LF（git CRLF 警告为误报，od 无 \r 实证）。manifest 变更随本单
提交，提交信息须带 [locked-change] 尾注。

## 自裁申报

1. **锚递达路径选 A（bus 载荷扩），弃 B（reader.store pendingJump）**：
   ①open-paper-bus 本就是跨域唯一合法通道（头注明文「跨域只允许经本
   模块」），载荷扩顺架构语义；B 需 lineage 域写 reader.store——反向
   新增跨域违例（白名单外），例外面反而更大。②locateAnchor 已内置
   「tab 未开→requestOpenPaper→轮询 ready→定位」全链（waitOpen），
   A 的消费侧只需一次定路由（30 行模块）；B 需 store 状态机+消费时序
   两面。③locateAnchor 内部重发不带锚（requestOpenPaper 单字段），
   天然防「带锚事件→消费→再发事件」回环。接缝声明四处落齐（SidePanel
   /open-paper-bus/open-paper-anchor/ReaderPage 头注）。
2. **data-ticket 标记保留**（lg03 自裁 8 同型）：票面「完成后删除
   data-ticket 与占位」与 check-tickets 规则 4（open 且 .tsx UI 工单
   必须含标记）冲突——占位已删，`data-ticket="SR2-LG-04"` 保留在两个
   渲染分支根 div（票面文件自身合法），翻 done 时主控收口移除。verify
   exit=0 实证此形态为 open 期唯一绿形态。
3. **人工笔记无双击跳转**：票面测试条款双击面仅 AI 条目；Note 总评层
   无锚三元组，双击语义=仅开篇（价值低——开篇路径已有阅读器入口）。
   不做声明入 LineageSideManualNote 头注。
4. **AI 分节分组逻辑本域重写**（AiNoteGroupList 属 reader 域不可引——
   Rule of Three 第 2 次保持重复；分色/标签仍 ai-note-style 单源白名单
   例外，映射零复写）。分组断言覆盖 role 序+空组剔除。
5. **消费逻辑独立模块 open-paper-anchor.ts**（非 ReaderPage 内联）：
   ReaderPage 组件测试需 mock pdfjs 重渲染树（jsdom 不可行面），独立
   模块让消费方级用例直测定路由；ReaderPage 仅两行接线（行数 250 不
   超限）。openFromBus 对 locateAnchor 不 catch——审读其实现全路径无
   reject（DOM 异常内吞/stale 返回值非异常），疑虑段备案。
6. **Canvas 行数手术**：+selectedNodeId 面（props+sel 判定+rect 内联
   改造+头注 2 行）与 -ZOOM 三常量合并对象、-Viewport interface 单行
   化（253→249）对冲——语义零变化（数值/字段同型），LG-02 受锁测试
   零改动全绿实证。
7. **anchorPage 语义链**：SidePanel payload 面 `number|null`（票面接口
   层字面）→LineagePage 归一 `null→undefined`→bus OpenPaperAnchor
   `anchorPage?: number`（locateAnchor LocateAnchor 形状一致零转换）。
   转换只在 SidePanel 一处（1 基→0 基），全链单点。
8. **ReaderPage effect 依赖 []**：openFromBus 经 getState 取 store 无
   props 依赖（原 [openPaper] 依赖随 openPaper selector 删除而消失）
   ——zustand getState 惯例（ReaderShortcuts 同族）。
9. **删减面 diff 自查**：git diff --stat=10 文件 214+/54-（manifest/
   check-quality/Board/Canvas/Page/SidePanel/ReaderPage/ai-note-style/
   ai-notes.store/open-paper-bus），未跟踪新增 4 路径（LineageSideAiNotes/
   LineageSideManualNote/open-paper-anchor/lineage-side-panel.test.tsx）
   ——全部在票面交付面+主控裁决面（W4 直连/白名单/阅读器侧消费接缝）；
   dist_new/ 为 2026-08-23 前历史残留（本会话未触碰，LG-01/02/03 报告
   同声明）；无范围蔓延。
10. **工单号引用纪律**：新文件头注一律「LG-04」短式（测试文件头注同）；
    SR2-LG-04 全号仅票面文件 LineageSidePanel.tsx 头注原文+根 div
    data-ticket 标记（票面文件自身合法）；新代码/测试注释零其他 open
    工单全号（LG-05 短式未出现于新代码）。

## 疑虑

- **e2e 面全归 LG-05**：真实浏览器全链（双击→切 view→PDF 加载→锚闪烁）
  与真实文本断言——本单组件级+模块级覆盖至 locateAnchor 调用边界。
- **openFromBus 对 locateAnchor 无 catch**：现实现全路径无 reject（审读
  结论）；若未来 locateAnchor 增加 throw 路径需补 catch（动作型 toast）。
- **locateAnchor verifyQuote 的 `.textLayer` 全局 querySelector**：多 tab
  页面仅 active tab 渲染文本层（TABS 语义下成立）——既有 C-05 交付语义，
  本单消费链不放大该面。
- **Canvas 249 行仍贴 250 上限**（lg03 疑虑同款）：后续节点交互扩展先拆
  拖拽会话 hook。
- **带锚双击时 App 切 view 后 ReaderPage 闩锁补读是主路径**（用户在脉络
  视图双击→ReaderPage 必然未挂载）；已挂载 handler 分支为防御性对称
  （未来分屏/多窗场景），无独立用例（同覆盖面由闩锁路径用例承担）。
- **请求序号 stale 守卫形态**（cleanup 置位 seq=1）：组件卸载/换 paperId
  均触发 cleanup——与 ai-notes.store 模块级递增序号不同形但同语义
  （组件作用域内更简）；换 paperId 即旧 effect 清理→新 effect 新闭包，
  无跨闭包竞态。
