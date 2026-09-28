# tickets/archive —— 工单票面归档索引（F-GOV-01 立，2026-09-28）

> 归档机制：F-GOV-01 治理减容役单元一存量消化——registry done 票 summary 瘦身为
> 「结论句+（全案=tickets/archive/<票号>.md）指针」，完整原文一字不改存本目录各归档件；
> 票面五层规约不随瘦身变化（id/file/area/owner/status 五字段原值随归档件保全）。
>
> 增量日落规则：增量=done 票收口满 3 批后由收口主控瘦身（F-GOV-01 立制）。

SR-INFRA-01｜SQLite 连接单例与 pragma
SR-INFRA-02｜FTS5 查询转义工具
SR-INFRA-03｜追加式迁移执行器
SR-INFRA-04｜受管文件存储（sha256 去重+路径净化）
SR-INFRA-05｜出网客户端（host 白名单+超时+退避）
SR-INFRA-06｜CSP 策略注入
SR-INFRA-07｜openExternal 外链白名单守卫
SR-INFRA-08｜app-file:// 受管文件协议
SR-INFRA-09｜主窗口与安全 webPreferences
SR-INFRA-10｜窗口位置记忆
SR-INFRA-11｜组装根（依赖注入点）
SR-INFRA-12｜IPC 统一注册（zod 校验→service→Result）
SR-INFRA-13｜contextBridge 白名单 API
SR-INFRA-14｜renderer 侧 IPC 客户端
SR-INFRA-15｜系统对话框注入（可测试）
SR-INFRA-16｜服务装配桶
SR-INFRA-17｜IPC 装配桶（对话框/事件胶水）
SR-IPC-01｜文献库域 handler（list/detail/update-meta/collections）
SR-IPC-02｜阅读器域 handler（open/标注读写/进度）
SR-IPC-03｜笔记域 handler
SR-IPC-04｜标签域 handler
SR-IPC-05｜导入域 handler（对话框令牌）
SR-IPC-06｜元数据增强 handler（手动触发）
SR-IPC-07｜导出域 handler（BibTeX/CSV/报告）
SR-IPC-08｜设置域 handler（含网络诊断）
SR-IPC-09｜系统域 handler（外链守卫打开）
SR-DB-01｜papers 表仓储（含 FTS 联查）
SR-DB-02｜annotations 表仓储
SR-DB-03｜notes 表仓储（含 FTS）
SR-DB-04｜tags/paper_tags 仓储
SR-DB-05｜collections/paper_collections 仓储
SR-SVC-01｜文献库用例：列表筛选/详情聚合/元数据编辑
SR-SVC-02｜阅读用例：取文件引用/标注读写/进度
SR-SVC-03｜导入编排：对话框→file-store→抽取→入库
SR-SVC-04｜PDF 内嵌元数据与 DOI 抽取（纯函数）
SR-SVC-05｜增强编排：DOI/标题→provider→回写
SR-SVC-06｜导出编排：对话框→序列化→写文件
SR-SVC-07｜BibTeX 转义与序列化（纯函数）
SR-SVC-08｜高亮+笔记→Markdown 读书报告（纯函数）
SR-SVC-09｜标签用例（薄透传）
SR-SVC-10｜笔记用例（含 NOT_FOUND 判定）
SR-NET-01｜CrossRef REST 封装
SR-NET-02｜OpenAlex REST 封装
SR-NET-03｜arXiv API 封装
SR-RDR-01｜文本偏移↔DOM 定位纯函数（WADM 思路）
SR-RDR-02｜pdf.js canvas 渲染封装（原 PdfCanvas 经 SR2-F-01 拆分，注册文件随直系继承者迁移）
SR-RDR-03｜官方 TextLayer CSS 接线
SR-RDR-04｜阅读器页面组装（多 tab）
SR-RDR-05｜文本选择→定位器交互层
SR-RDR-06｜标注渲染与命中层
SR-RDR-07｜阅读器工具栏
SR-RDR-08｜目录/缩略图侧栏
SR-RDR-09｜阅读器状态（打开文档/页码/缩放）
SR-LIB-01｜文献库页面组装
SR-LIB-02｜文献虚拟列表
SR-LIB-03｜文献行组件
SR-LIB-04｜文献详情侧栏
SR-LIB-05｜搜索与筛选栏
SR-LIB-06｜导入入口（拖拽+按钮）
SR-LIB-07｜文献库状态（列表/筛选/选中）
SR-NOTE-01｜笔记保存状态推导（save-status 下沉 shared；面板本体随 C-06 下线——文件登记随契约迁移）
SR-NOTE-02｜笔记状态
SR-TAG-01｜标签编辑器
SR-TAG-02｜标签筛选器
SR-TAG-03｜标签状态
SR-SET-01｜设置页（含网络行为披露）
SR-SET-02｜设置状态
SR-UI-01｜按钮组件
SR-UI-02｜对话框组件
SR-UI-03｜Toast 通知组件
SR-HK-01｜异步调用 hook
SR-HK-02｜防抖 hook
SR-PKG-01｜electron-builder NSIS 打包配置与 dist 编排（绑定预置/electronDist 复用/镜像下载）
SR-PKG-02｜安装包冒烟：静默装→沙箱启动→存活断言→静默卸载
SR2-KEY-01｜keymap 键盘快捷键单例（注册/注销成对+editable 避让）
SR2-KEY-02｜阅读器快捷键+ctrl 滚轮缩放（挂 keymap，翻页键位映射表）
SR2-ANNO-01｜标注四选项菜单（复制引文/删除/添加笔记/取消）
SR2-UIK-01｜可拖拽分隔条容器（宽度持久化 localStorage）
SR2-TABS-01｜reader.store per-tab 多文献字典重构（tab 生命周期状态机+竞态守卫 per-tab 化）
SR2-TABS-02｜阅读器多标签栏（order/activeId 消费，loading/error 态，关闭叉）
SR2-TABS-03｜灰点信号聚合（annotations 失败+notes pending 两写面→tab dirty 投影）
SR2-TABS-04｜退出拦截（close preventDefault+dirty 上报通道+二次确认）
SR2-UNDO-01｜标注操作级撤销栈（create/delete/comment-edit 逆操作，per-tab）
SR2-C-01｜片段序单源纯函数（页→页内偏移→创建序→id 全序；排序禁字符串字典序）
SR2-C-02｜corpus md 装配纯函数（ADR-0011 v1.1 口径）+单篇/全库导出通道与入口
SR2-C-03｜阅读器笔记面板（总评层+片段层；save-status 下沉 shared；ADR-0008 五模块不动）
SR2-C-04｜侧栏三栏宿主（目录/缩略图/笔记 tablist+OutlinePanel mode 化+ReaderPage props 削减）
SR2-C-05｜N1 锚点定位服务（INV-20 三层防线 exact/page/paper 单入口+标注单击反向同步）
SR2-C-06｜库侧笔记编辑面下线（NotesPanel 删除+「去阅读器写笔记」入口——方案切换=删除旧方案）
SR2-AI-01｜ai_notes 数据基座（迁移 003+repo：一行一锚定段粒度；v1 无生产者声明）
SR2-AI-02｜全文/图提取器（pdfjs 白名单 INV-16+自持文档生命周期+事件桥单向+逐页背压）
SR2-AI-03｜五件套导出会话（manifest 终局单写+单飞 EXPORT_BUSY INV-18+幂等 sha INV-17）
SR2-AI-04｜设置页 AI 语料导出节（进度行+单飞 disabled+App 层事件桥 INV-14+e2e 全链含中断重跑）
SR2-AI-05｜zcode 工具骨架（SKILL.md+config.template+queue 断点续跑幂等；config gitignore）
SR2-AI-06｜伴随进程文件协议（job 原子写幂等+status 心跳判活单源；应用永不 spawn INV-21）
SR2-AI-07｜回灌导入器（ai-notes/import+list 通道；幂等=archive 账本 sha 去重；工具永不写 DB）
SR2-AI-08｜笔记面板 AI 面（role×question 分节+七问分色单源+「AI 正在读」六态机）
SR2-AI-09｜AI 标注渲染对等（verifyQuote 重锚同几何管线/存储独立 INV-19/v1 只读）
SR2-AI-10｜设置页 zcode 联动（检测五态三档+一键装技能+心跳单源；不代启会话 INV-21 e2e 断言）
SR2-LG-01｜脉络数据基座（迁移 004 ADR-0014 DDL+repo+草稿导入全有或全无替换式；树单父 INV-27）
SR2-LG-02｜布局纯函数+只读 SVG 画布 pan/zoom（y 年份分层+Reingold-Tilford；T3-P6 后指针迁 lineage-timeline.ts）
SR2-LG-03｜脉络交互编辑（拖拽 x/y 覆盖+加删节点边改父+树约束 UI 守卫 INV-27+自动保存）
SR2-LG-04｜节点侧板（元信息+core idea+AI/人工笔记分节）+笔记双击跳阅读器（OPEN_PAPER_EVENT）
SR2-LG-05｜脉络 e2e 全链（导入→渲染真实文本→拖拽持久→树拒绝→侧板→双击跳转→退出拦截）
SR2-ENR-01｜含金量抓取缓存（迁移 005 papers 三可空列+citedByPatch 强制刷新纯函数；契约零触碰）
SR2-ENR-02｜venueTier 映射与装配（三档种子表 venueToTier+可选字段两形装配；依赖 ENR-01 数据面）
SR2-F-01｜页列几何与懒渲染回收（占位盒+视口±1 渲染+离屏回收+PdfCanvas 拆分旧删）
SR2-F-02｜四层多页化收口与跳页兼容（verifyWhenReady 页限定+跨页选区拒绝；locateAnchor 签名零触碰）
SR2-F-03｜滚动进度回写恢复与键位迁移（六态状态机——writing 用 scroll none 防回弹+用户接管三类信号）
SR2-F-04｜缩放重定义与收官 e2e（zoom 视口中心保持纯函数+收官全链 spec）
SR2-F-05｜程序滚动单容器收敛（scrollIntoNearestScroller 最近滚动祖先差值法替换原生 scrollIntoView）
SR2-F-06｜页间分隔与选区不透明（页盒 panel 底+阴影渲染；::selection 半透明改不透明近似色）
SR2-F-07｜划选自绘选区+AI 层去 multiply（::selection 置 transparent+自绘 30% accent 半透明选区块）
SR2-ENR-03｜详情面板被引数透出（UI 透出面补位：citedByCount 空显 —/零值显 0；新测试 3 it always-active）
SR2-LG-06｜脉络跳转接笔记面板信号（req.aiNoteId 有值先发 notifyAiNoteHighlight——AI-09 语义复用）
SR2-LG-07｜脉络布局非单调年份树修复+边 label 渲染（Frame 增根占位+兄弟约束增补；T3-P6 后指针迁 lineage-timeline.ts）
SR2-LG-08｜脉络跳转挂载时序竞态修复（根因=ReaderPage 挂载效应闩锁消费先于监听器注册——事件自丢失）
R1-WS1｜课题域库级隔离地基（ADR-0018：userData/workspaces/<id>/ 各含 synapse.db+files/；装配容器化热换）
R1-WS2｜课题切换器渲染层（切课题=dirty 确认→IPC switch→location.reload 全新 stores 零 stale）
R3-TH1｜视觉系统主题基建（theme.css v2 旧 9 键换值+新增 27 键；token 终值单源=mockup :root）
R2-LG9｜脉络命之座星象板视觉重制（T3-P6 时间线方案切换整族退役，file 指针仅满足存在性）
R2-LG10｜脉络布局收官（auto-fit 观察项转正+层带标可见性；T3-P6 后整族退役指针迁 LineageTimeline.tsx）
R3-LIB｜文献库视觉重制（行→卡片网格+材质三件套+hover 金 hairline+衬线年份）
R3-RDRSET｜阅读器周边+设置页视觉（ReaderToolbar 玻璃浮层+TabBar active 金底缘+金缘 tab）
SR2-AI-11｜AI 笔记呈现轴转置（groupNotes 按七问序转置+组头分色条+ROLE_LABEL「一审/二审/裁决」）
SR2-AI-12｜AI 笔记组头补原始命题（QUESTION_TEXT 七值机器抽取誊自蓝图+组头拼「第N问：原始命题」）
SR2-F-08｜划选视觉反馈回退官方原生半透明（::selection 回官方 rgba(0 0 255/0.25)+删 SelectionRects 整件）
SR2-F-09｜划选选中色改灰（仿 WPS：rgba(0 0 255/0.25)→rgba(0 0 0/0.30)；用户指令偏离官方值显式登记）
R2-LG11｜脉络重制浅色严谨板（星象板方向否决后的修正延续；T3-P6 后指针迁 LineageTimeline.tsx）
R2-LG12｜综述多参考边数据面（lineageEdge 增 kind 枚举 tree/ref 两值+迁移 006+service 受控豁免分支）
R2-SH1｜应用重命名 Synapse Remake→Synapse+userData 数据迁移（productName 派生目录搬迁复用 WS1 幂等模式）
R2-SH2｜顶栏身份区+字体衬线消费清零（App 壳 header 条 44px+侧栏品牌行删+--font-display 消费清零）
F-R2｜ui-scale≠1 程序滚动落点漂移修复（gBCR 视觉差值算术折算 effectiveZoom 单源；真机复验基线级）
P7A｜P7-A 剪贴板竞态 flake 专项（清场标记+条件重读 5×200ms；断言锚不放宽；连跑 3 次全绿）
F-R3｜AUDIT-C C-1 修票（P6 泄漏闭：settleLoadTask 纯函数——加载失败 destroy 恰一次；上游查证在档）
P7E-01｜标签生命周期（改名/合并/删除——repo 四方法含跨表事务+三 IPC 通道+TagFilter 右键管理面）
P7E-02｜拖拽导入（fromPaths 通道对 renderer 隐藏+apiDrag 桥 webUtils 解析+planDroppedImports 三滤）
B7｜tags upsert 纯空格名空判守卫（对齐 rename 先例 trim 空 INVALID_REQUEST；先红 2/绿 3/变异红证）
C-A3｜notes 防抖悬置写三件套（discard API+in-flight 代际守卫+tab 关闭路径弃改收口接线）
P7E-03｜页内高亮搜索（索引全文档+高亮仅渲染窗口+代际守卫；数量不符降级零高亮只计数）
P7E-04｜导出剪贴板（单通道 format bibtex/csv+main 侧构建 main 侧写——内容不过 renderer）
P7E-05｜阅读时长统计（搭车 saveProgress 单通道+008 迁移+复合 flusher+ready×visible 双计时门）
P7E-06｜标签多选过滤（AND 交集+tagIds 数组+逐标签 EXISTS 参数绑定+INV-53 多选适配）
P7E-07｜智能排序（枚举加值 cited_desc+COALESCE 空值归零垫底+rowid 决胜+双 Record 类型闭环）
F-A6｜划选渲染错乱+拖选卡顿根治（五轮方案残留——设计文档先行再实现；涉 ADR-0019 R3 修订）
F-A7｜旋转页占位盒宽高交换缺失修复（页尺寸缓存单源未旋转口径 vs canvas 旋转口径错配）
F-A8｜AnnotationLayer 重锚域同族化（重锚主链迁项几何族；设计链三跳毕=设计书在档）
P7D-01｜P7-D 玻璃 UX 首票 design token 先铺（动效 32 处→七 token+间距 inline 12 处→tailwind class+z 层 token）
P7X-01｜标签选中上限 UI 感知（toggle 添加方向守卫+TAG_FILTER_MAX=20 单源 schema 与 UI 同消费）
P7X-02｜时长落盘重试/outbox（renderer localStorage 持久 outbox 兜底使尾账落盘失败可恢复）
F-AUDIT-01｜audits 留档口径三桶清场（入库桶实测 243 件+数据桶 16 探针目录不入 git+.gitignore 增条）
F-SPLIT-01｜组件贴线拆件合票（五件贴线态解除——PageColumn 249→164 等五件拆分）
F-CSS-01｜theme.css 分域拆件（645 行→五件全 ≪450 新关卡+reduced-motion 守卫随域驻件末）
F-TOOL-01｜像素差分带定位器工具固化（visual-diff-locate.mjs：差分行带+crop 模式；三坑规避内建）
F-CSS-02｜theme.test 负锚升级=正则全域归零（任意数字 font-size 声明七 CSS 文件计数=0）
F-LINT-01｜INV-11 lint 机器化（类型/颜色/文案/数值单一真相源禁令机器锚定；设计链三跳毕）
F-CSS-03｜颜色 token 化战役+颜色负锚双关卡（50 值=48 新 token；零视觉差口径+语义命名优先）
F-LINT-03｜B-1 baseline 棘轮 8 组真命中收敛（跨域三组驻 ui-constants.ts+同域五组驻域件）
F-A9｜标注带垂直几何缺陷修复（划选预览带下移半行+underline 低位色带切字两病）
F-A10｜划选段末空白 affinity 缺陷（选区把下一段带上——诊断先行：行尾空白节点命中→affinity 归属）
F-A11｜笔记编辑 UX 双缺（保存状态反馈「已保存」标记+撤回/恢复按钮对；非丢数据定性在案）
F-UI-01｜顶栏左簇垂直居中（用户裁决原话执行；簇中心与顶栏中心垂直差≤1px 验收）
F-LINT-02｜B-1 同值双常量 lint 机器化（跨文件聚合=架构问题——设计链三跳强制+存量 dry-run 铁律前置）
F-REG-01｜check-tickets 工单号校验全域化（行级解析+id 前缀白名单+file 存在性全域——46 票曾脱检）
F-DOC-01｜methodology 增「设计期存量 dry-run 实证」条款（F-LINT-01 改向教训成文：验收项存在≠已验证）
P7X-03｜B6 模态期最小化语义对证（对证成立=结案推演升文档实证，免实现）
F-LOCK-01｜unlock/lock 脚本受锁集合不对称修复（新件 get-protected-files.ps1 单一收集函数三处收敛）
F-SNAP-01｜anchor-blank-snap 撞名常量语义化（局部同名不同值易埋雷——COLUMN_GAP 族消歧）
F-A12｜划选释放点浅探 affinity 事件层重定向（新件 release-affinity.ts 纯函数——手势几何判别）
F-LINT-04｜颜色关卡扩展战役 T1（COLOR_RE 单源化+url 顺修+postcss 化；设计链三跳毕）
F-LINT-04-T2｜颜色关卡扩展 T2=B-5 AST 扩展（no-inline-color 扩 VariableDeclarator 等 visitor 路径）
F-LINT-04-T4PRE｜颜色关卡扩展 T4 前置=--warning token 化（fallback orange 悬空=token 体系静默绕过通道）
F-LINT-04-T4｜颜色关卡扩展 T4=var() 语义锚 C-4c（check-quality 新段——变量消费语义配对扫描）
F-TESTREF-00｜测试面指纹门（check-test-surface.mjs——设计链三跳毕，skipSites 双向红等终裁落法）
F-TESTREF-S2｜基线再生成机检对账（再生成输出退役用例清单与豁免 delta 精确匹配——人肉步升机检）
F-TESTREF-W1A｜mock 工厂下沉（vi.mock 39 文件+Toast mock 32 文件→tests/utils 共享工厂单源；C 面零变化由指纹门对拍）
F-TESTREF-W1B｜几何桩+局部工厂下沉（三族安装对+盒构造→tests/utils/geometry.ts 单源 149 行）
F-TESTREF-W1C｜e2e 脚手架单源（launch 5 副本+seedPaperRow+first-window 配方→e2e-env.ts 单源）
F-TESTREF-W2｜探针 spec 移出默认门（projects 拆 app/probe——z-.*-probe 式 testIgnore；默认门不含探针）
F-TESTREF-W3｜src/shared 直接契约测试补齐（zod 边界+api-surface 通道完整性——覆盖倒挂最薄面）
F-TESTREF-W4｜不确定面机件化（flake 台账八线历史收录+stableRel 下沉 tests/e2e）
F-DEDUP-01｜服务层偶然复杂度收敛（DomainError 基类单源 15 文件继承+atomicWriteFile 三开关等四收敛面）
F-GEOM-01｜INV-58 双几何族同族化战役（pdf.js 项声明几何族收编 DOM 量测几何族——单一真相源化）
F-GEOM-01-G1｜M0 类型下沉切环（PdfTextItem 族+PixelBox/RowBand 落 geometry-types.ts）
F-GEOM-01-G2｜保存链单源门+几何死面收敛（所见≠所存时不给保存入口——战役唯一行为变更票）
F-GEOM-01-G3｜band 三档绑定+跨族交互点登记（新 INV 几何产链档位绑定——纯登记面零行为变更）
F-GEOM-01-G4｜目录化 M1=state/ 域迁移（10 文件迁 reader/state/）
F-GEOM-01-G5｜目录化 M2=time/ 域迁移（4 文件迁 reader/time/）
F-GEOM-01-G6｜目录化 M3=anchors/ 域迁移（13 存量+geometry-types 迁 reader/anchors/——受锁面最重步）
F-GEOM-01-G7｜目录化 M4=interact/ 域迁移（7 文件迁 reader/interact/）
F-GEOM-01-G8｜目录化 M5=panels/ 域迁移（8 文件迁 reader/panels/）
F-GEOM-01-G9｜目录化 M6a=view 渲染簇迁移（14 文件迁 reader/view/）
F-GEOM-01-G10｜目录化 M6b=view 工具/搜索/标注 UI 簇迁移（13 文件迁 reader/view/）
F-GEOM-01-G11｜战役收官票（头注扫尾+净删/交互点记账报告+验收门全跑 e2e 45 全绿）
F-SESS-01｜导出会话悬挂修复（abortActiveSession+advance 终局守卫+INV-65 入册——reload 后单飞锁释放）
F-AIN-01｜AI 笔记回灌事务包裹（withTransaction 单篇全有或全无+中断注入测试）
F-DEP-01｜postcss 显式化清账（^8.5.26 devDep 显式化+lockfile 同步 [dep-change]）
F-ELE-01｜Electron 升级预研（prebuild 矩阵+Node 24 兼容+风险清单——纯调研零 src 变更）
F-ALIGN-01｜组织定版对齐（钉版 v2.0.1+ORG-SEG v2 重写+词汇映射表补全+账本断流核查）
F-LAYER-01｜settings 下沉 services（消全仓唯一分层破口+L1 锁线——core 三域禁 import electron）
F-SENSOR-01｜ai_sensor 域整理（三前缀一域对齐+spread 拼盘解体+zcode-link 闭包耦合改显式注入）
F-EXPORT-01｜corpus.export 拆件（导出会话状态机六态外提独立+IO/事件协议分离；INV-17/18 语义不破）
F-TIME-01｜reading-time 链瘦身评估（盘点+存废候选+降档方案——产出呈裁不实施；档位裁决终结存档）
F-TIME-02｜阅读时长功能移除（删计时器+落库链+UI 面——取代 F-TIME-01 五档降档；用户裁决第六档）
F-DOCGOV-01｜文档补课批（architecture 补三结构+数据模型 10 实体表+ADR 索引 0019+关卡清单）
F-PROC-01｜制度批（DoD 增 ADR/架构回写项+交接书事故档回流段+治理基线指标扩三等）
F-STOR-01｜存储批（audits 历史件出库归档仓外档案区+locks manifest 同步+.gitignore 止血）
F-ELE-02｜Electron 实施窗票 A（better-sqlite3 12.11.1→13.0.3 N-API 化 [dep-change]）
F-ELE-03｜Electron 实施窗票 B（Electron 42.9.3→44.4.3 [dep-change]——钉版+clipboard 三点小改）
R2-SH3｜R2-SH1 漏项清偿——installer-smoke 常量面对齐 productName=Synapse（三常量改写）
R2-SH4｜R2-SH1 漏项清偿第二批（出网 User-Agent 无空格变体清偿——USER_AGENT 单源常量+文档路径失真修）
F-UI-04｜顶栏文字垂直居中+顶栏/主区背景冷雾灰（translateY(-2px) 对齐整行基线——用户裁决；像素探针常驻）
F-UI-03｜应用导航栏可调宽+窄条折叠+收起图标（SplitPane 三 prop 扩展+App nav 包裹+窄态 clip 隐藏）
F-UI-02｜阅读器工具栏+侧栏标签页图标化+反馈强化（五控件 svg+sr-only 文本+选择模式激活常亮）
F-RDR-02｜笔记编辑器偶发无法输入（isComposing 守卫+点击弹层空白重聚焦；四场景审计零复现不立深修票）
F-RDR-01｜选区空白区下拖闪烁修复（snapVisualBoundary 守卫+TTL=100ms+docOrderPair 包含形态判别）
T3-P1｜主题基建——token 三族入库+data-theme 切换接线+设置页接线+防漂移锁三族扩展（桥接段自动随族）
T3-P2｜壳层改版——顶栏签名/居中搜索+72px 窄轨+课题弹层联动+F-UI-03 退役+状态条（56→38px）
T3-P3｜文献库视图——密度列表+规格表抽屉+游标线（六列密度列表+316px 抽屉+citedByCount/lineage 载荷扩展）
T3-P4｜阅读器主题化——纸面三态+批注弹层皮肤随族+chrome 换肤（--paper 三族+--canvas-filter 夜间反色）
T3-P5｜脉络数据层 v2（迁移 010：month/slot/sub+lineage_graph_meta+upsertLineTypes 通道+lineage.json 导出+catalog_no）
T3-P6｜脉络时间线渲染（年月分组+小卡 104×52+砖砌行错位——RT 树布局/视口状态机/SVG 画布整族退役删除）
T3-P7A｜连线系统·路由+线型渲染（SVG overlay+路由三式+避让四检降级链——连线永不穿卡与月份标注）
T3-P7B｜连线系统·编辑交互（mode×picker×popover 状态机+EdgeTypePopover+store 三 action+同道错峰）
SR-SEC-01｜安全加固——app-file:// ACAO 通配收束（Origin 白名单命中回显/未命中静默不加头；休眠面事实在案）
SR-IPC-10｜契约缺口双修——workspaces 编译期保证重建+事件面 zod 兜底（type-test 双证+preload safeParse 丢帧）
F-CONSOL-03｜测试资产清出——探针 spec 四件+scripts/audits 残留六件归档仓外（F-TESTREF-W2.file 勘正+基线再生成）
C-A4｜CI 口径对齐——指纹门入 CI+DoD 措辞勘正（ci.yml 增步 fail-fast；CI run 36372251379 首绿验收）
F-GOV-01｜治理减容役收官——registry summary 瘦身归档+INV 三元组+防线登记册+宪法条款+日落规则
F-CI-01｜CI npm ci 红修复——better-sqlite3 缺省编译动作按包禁用（allowScripts deny；npm ci 触发 node-gyp 缺省编译根因链实证）
T3-P8｜交互收口——战役收官票（六源：拖拽重排/改月飞行/检查面板重皮肤/shift 过渡/飞行脱节 mockup 原样/drag-hint 双文案；回炉 R1-R8）
