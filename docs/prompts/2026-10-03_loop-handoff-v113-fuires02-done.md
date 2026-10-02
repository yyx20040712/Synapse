# 交接书 v113 —— F-UIRES-02 整票收口·批 A 输入交互统一+批 B 小按钮图标化（2026-10-02/03）

> 前承 v112。本档=F-UIRES-02 两批全链收口（runId=20261002-fuires02-a/b）。
> **F-UIRES-02 整票 done（批 A+B 双批全毕）——用户集中 UI 视检与完善
> 触发（2026-10-02 时序裁决：本票收口→UI 视检[功能终态冻结]→DB 战役
> 设计稿呈裁→分批实施）**。门一审核位=ops-gate1-k2（换座后常设位，
> 本票两批均用）。

## §0 本场消耗与开工记录

用户开场指令=续 v112 开工序第 1 项（F-UIRES-02）+门一沿用 k2。技能清点：
ai-dev-org/subagent-driven-development/TDD/dispatching-parallel-agents/
verification-before-completion=用；systematic-debugging=备（未触发）；
frontend-design/frontend-ui-engineering/browser-use 族/dynamic-workflows/
git 族=不用（形态由 F-UIRES-01 设计稿定+无头 e2e/探针通道既有）。配置：
executor/probe/adjudicator 中 probe·executor=随宿主（session:host-tier；
adjudicator=deepseek 异构 $max 绑定）；k2 两批×2 轮=Kimi 链 $max 绑定；
d1 两批×2 轮=deepseek 异构 $max 绑定。

消耗：盘点 code-explorer×2（4.7M）+executor 三段（批 A 基批 10.3M+批 A
RR1/RR2 4.4M+批 B 基批/RR1 30.7M）+门一八席（k2 批 A 首审/复核+批 B
首审/复核≈4.6M；d1 同构≈0.9M）+probe×2（2.0M）+adjudicator×2（11.8M）
+主控亲执（设计档/双审包/亲验销项六件/B1 追认/registry/verify 终验×2/
提交×2/账本×2）。账本 487→507（20 行）。

## §1 基线终态（对不上禁提交）

- 提交两笔：批 A 7977bf21615（20 件 1959+/113-）+批 B 876ec6ca1fa
  （33 件 1054+/156-）。**verify 终验 EXIT=0=252 件/2566 例**（基线
  243/2498→+9 件/+68 例：批 A 7 件 48 例[42 基批+5 RR1+1 RR2]+批 B
  2 件 20 例[5+15]）；**e2e 70/70**（批 A/B 各 probe 全量一次，accessible
  name 变更面零红）；**locks 351**（+9=批 A 7 新测试+批 B 2 新测试）；
  registry **F-UIRES-02 翻 done**（双批注记+B1 追认句+视检时序指针）；
  check-tickets open=4→3。视觉探针 80 断言/0 失败+5 截图（批 B）。
- 树态：批 B 提交后 git status 零行（全提交含设计档）；账本 .zcode=
  gitignore 不入仓。提交 message 入库字节 UTF-8 亲验（U+FFFD=0——
  终端回显乱码=管道显示噪声虚惊）。

## §2 交付与门链

- **批 A=输入交互全域统一**（设计档=docs/design/2026-10-02_f-uires02-
  survey.md——22 输入面六类分域盘点+裁决注记+批次切分）：①shared/
  inline-keys.ts 新建（renderer 面非受锁）——inlineKeyDown 键面单源
  （自 FolderNavRows 私有提升签名零变）+useComposingCommit（TagEditor/
  EdgeMenu/LineTypeMenu 三份序B 手写拷贝合一，commitRef 每渲染镜像——
  Rule of Three）②WorkspacesPage 双面三键化（重命名 Enter/失焦/Esc/
  isComposing 全套+WorkspaceRenameRow 250 行红线拆件+确定/取消钮
  mousedown preventDefault 防夺焦双发+RR2 组词守卫；新建 Enter=创建/
  Esc=清空；课题卡双击=进重命名·单击切换不动）③EdgeMenu 失焦丢弃→
  提交（点外=确认·onDoc=click 注册主控亲验）+document 级 Esc 补
  isComposing 守卫（原全域唯一真空）④MetaEditDialog 单行字段/主题节点
  名/设置邮箱 Enter=提交（对话框失焦不提交=乙类裁决防误触；摘要
  textarea 豁免负锚）⑤LineageSideTags 失焦=提交+Esc=清空⑥R10 裁决
  撤销：LineTypeMenu 单击维持（受锁四用例锁单击+dblclick 重置 draft
  风险），序B 迁 hook 保留。
- **批 B=功能类小按钮图标化**（用户三批增补）：icons.tsx 19 常量
  （24×24+aria-hidden+stroke 走 CSS 类）+RetryButton 共享组件（13 处
  统一 ghost+三透传锚=className/testId/dataAction 受锁断言兼容）+25
  组件逐面（关闭 X 6 处含 Dialog 单点 9 对话框杠杆/收起展开对/撤销
  重做两域/LineageToolbar 保存钮去文字[用户点名例：SaveIcon+dirty
  角点+spinner+随态 title]+✋手掌/行内确认对 check·X/添加 plus+
  LineageSideTags 补 aria-label 可达名/AiNoteGroupList chevron 随态/
  SelectionToolbar 三钮/AnnotationEditor 三钮/TitleBarControls 补
  title）；title/aria-label 同源单变量+sr-only 保 textContent/accessible
  name（受锁断言零改）；组词守卫两锁（裁决部批 A C5 承载）；CSS 特异性
  双固化（.rdr-tab-close.syn-icon-btn svg (0,2,1)+.syn-retry.ws-retry
  (0,2,0)）；豁免面零动（主操作钮/菜单项/导航行/DrActions 受锁文本/
  FolderNavRows 新建保图+文/TagDropdown 清空/档位钮）。
- **门链（两批同构）**：executor TDD 红绿+变异红证（批 A 七处/批 B
  六处含 probe 复验）→门一双审（批 A：k2 PWC+d1 PWC 零 B 重叠·W 高度
  交叉；批 B：k2 FAIL[B1]+d1 PWC）→RR（批 A RR1 六项+RR2 一项=2/2
  用满；批 B RR1 五项=1/2）→复核双席 PASS（批 B B0/W0）→probe 矩阵
  6/6×2（含批 B e2e name 变更面必验过关）→裁决部 GO_WITH_CONDITIONS
  ×2（批 A A-G 全成立+推翻主控 k2-W2 销项[三元仅替换命名项他项仍在场]；
  批 B A-G 成立+B1 追认+整票翻 done 判定+复算行账精算闭合）。
- **B1 案（批 B）**：票面 R10「保存→勾」=主控简报速写失误（R7 确定钮
  已用勾）——「确定=勾/保存=软盘」为正确语义二分，executor ICON_SAVE
  方向正确，主控追认+executor 补申报（自裁第 11 条）双落地。

## §3 主控亲执（申报）

①设计档亲撰（双盘点代理事实基础+22 面六类分域+40 钮分类+批次切分）；
②批 A 五销项亲验（onDoc=click 注册[EdgeMenu:77]/三对话框无 form/计数
vitest 实测 42=机输出/W6 submitRename busy 守卫在/k2-W2 三元结构——
**最后一项被裁决部读证推翻**（:162-196 他项仍在场），如实入档转 W 级
残余登记）；③审包两笔误申报（计数 grep 43 失真/件数 10→11——计数必
机输出纪律再证）；④B1 追认裁决；⑤C4 设计档 stale 回写+k2-W2 残余
登记；⑥registry 翻 done（locks:unlock→编辑→apply 351）+verify 终验
×2 亲跑真退出码+提交×2 显式列件+提交 message UTF-8 入库字节亲验
（node 读 git log——终端回显乱码虚惊）+账本×2 append（498/507）。

## §4 挂账与登记（单源=本档+裁决部两包 C 清单）

- **用户视验单 10 项候选（裁决部 C3 含两补强——交互组[4/5/6/10]先行）**：
  1 重试钮统一 ghost 形态（13 处——原三面语义色：ErrorBoundary 主色
  实底/笔记保存失败红/AddNode 搜索失败链接式；**补：含真实失败注入面
  渲染尺寸核**）；2 LineageToolbar 保存钮纯图标（dirty/spinner/随态
  title）；3 SelectionToolbar 三钮纯图标；4 WorkspacesPage 双击进编辑
  +三键范式体感；5 文件夹行双击不进编辑（豁免裁决——要求加一句话改）；
  6「+新建文件夹」保图+文（豁免裁决）；7 chip/添加钮 16px 图标小片
  尺寸观感；8 AiNoteGroupList chevron 形态；9 小手钮 title「小手选择
  （点选卡/线）」与 name「选择」口径；10 **EdgeMenu renaming 态点他项
  残余（非纯视觉：改名提交+菜单关+动作落空——两案候选=他项 mousedown
  preventDefault∨renaming 态禁用他项，后续票裁）**。
- **观察项**：添加节点文献搜索每字符直发 IPC 无防抖（设计档戊类注记，
  性能小瑕疵非本票面）；ICON_CHEVRON_UP 零生产消费（chevron 四向全集
  票面锁定，合规保留）。
- **勘正注记（裁决部批 A C7）**：v112 正文「2497 例」为笔误（raw=2498）
  ——历史档不改，本档注记备查。
- 移动子面 ▸ 形态维持「如用户视验要求」条件态；S5 盲形清单搭车条款
  承 v110 §4 不变；视觉回归关注点承 v107 §5.3+v111/v112。
- 教训回流状态：本票**无新教训节**（计数 grep 再证=宪法既有条二次
  实证；B1 追认=简报映射失误属操作个案非规则级——均如实申报）。

## §5 新会话开工序

1. **用户集中 UI 视检与完善**（2026-10-02 时序裁决——F-UIRES-02 收口
   即触发；视验单=§4 十项候选；功能终态冻结后进 DB 战役）。
2. **DB 战役窗口**（视检毕）：设计稿呈裁（设计输入=UI 终态功能现状+
   AI 规划需求锚[多层级/AI 可读/自洽可维护/AI 读脉络笔记建议评论对话/
   记忆独立单向依赖脉络按需激活/AI 会话历史]）→分批实施（F-TAGS-02
   域化+星标 F-STAR-01+AI 记忆域+AI 会话域+**papers.delete 文件清理
   处置[v112 §4 挂账]**+存量治理同窗整合）。
3. S5 盲形清单随任意票搭车或单独小票（承 v110）。

## §6 操作条款存续

承 v112 §6（=v111 §6=v110 §6）全项。账本行 schema 单源=ai-dev-org
references/02 §9；tier 记法 model-field: 前缀（会话内随宿主=session:
host-tier）。门一常设双审=k2+d1（2026-10-02 修订二换座后形态，本票
两批全链实证）。事故档回流状态：本票无新增（见 §4 末行）。
