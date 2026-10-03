# 交接书 v114 —— 用户集中 UI 视检日·四批全链收口档（2026-10-03）

> 前承 v113。本档=视检触发日全量：F-UIRES-VFIX-01+批 α+reword 推送+批
> tagrows 四批，与 CI 修复事件。**用户新会话裁决（2026-10-03）：脉络图
> 复杂问题在新会话系统性梳理（业务逻辑+方案+爆炸面+集中修复）——批 β
> 撤销**；标签行结构批已毕（tagrows）；reword+推送已毕。

## §0 本场消耗与开工记录

用户开场=续 v113 视检（k2 常设位沿用）。技能清点：ai-dev-org/
subagent-driven-development/TDD/verification-before-completion/dispatching-
parallel-agents=用；systematic-debugging=用（三键消失诊断）；frontend 族/
dynamic-workflows=不用。配置：executor/probe=随宿主（session:host-tier）；
k2 全程=Kimi 链 $max 绑定；d1=deepseek 异构 $max；裁决部=deepseek $max。

消耗：executor 四批（VFIX 3.9M+α 5.7M+tagrows 9.7M）+门一 13 席（k2×6/
d1×7）+probe×3+裁决部×3+主控亲执（诊断探针 5 枚/双审包/亲验销项/两 CI
红修复/提交 7 笔/推送×3/账本 507→528[21 行]）。

## §1 基线终态（对不上禁提交）

- **提交七笔**（本日）：VFIX c1 467742ed08c→506ba199e3/c2 3dc9220dffd→
  d65683889c（reword 改写）+v113 82f9de991a5→5cd3265841+批 α
  eceab4cb942→73143c289a+registry 注记 ab9dc261e12+CI 修复 e000e88bbe2+
  tagrows 55ddb7aa1a5。**哈希映射六笔入 registry F-UIRES-VFIX-01 票面**
  （旧→新——reword 改写批 A 68f54f338f/批 B 1821649562 删 [test-refactor]
  尾注；树零变实证+verify EXIT=0 两轮+6 笔中文 U+FFFD=0）。
- **verify 终态 EXIT=0=253 件/2586 例**（+1 件 tag-dropdown-row/+20 例）；
  **e2e 74/74**（+1 标签行内编辑）；**locks 353**；registry 不立票（用户
  视检反馈批=交接书承载——批 α 裁决部 C5 先例）。
- 推送毕：f2f4968de75..55ddb7aa1a5（75 笔）origin/main 同步。**CI 事件**
  ：首推两红（①locks=45 文件 CRLF 工作副本污染 manifest sha[本地绿 CI 红
  根因=locks:generate 读 CRLF 工作副本而库内历来 LF]→修复笔 e000e88b[45
  文件 sed 归一 LF+manifest 352 条记 LF sha——git diff 全空=内容零变实证]
  ②manifest 尾注 job 在强推 BASE 下的 range 异常→新 push 自愈）；修复笔
  run 30m8s 被取消（取消源不明——concurrency cancel-in-progress 在档但无
  新 run，疑手动）；**tagrows push 触发新 run 待绿确认（新会话首查项）**。

## §2 四批门链与交付

- **F-UIRES-VFIX-01**（视检第 1 报「三键消失+异常放大+右缘出窗」）：
  根因=uiScale=medium 档下 `.app-content-row{zoom}` 的 max-content 贡献
  撑破 `.app-shell` grid 隐式列→header/statusbar 同列 stretch→三键出窗
  （「未归档正常/主图·全部犯病」=文献集宽度分化；「切主题就好」=离开
  文献库视图巧合）。修复=grid-template-columns: minmax(0,1fr) 一行；新
  e2e ui-scale-viewport.spec 2 用例四面断言（(c) scrollWidth 假阳性改锁
  .app-content-row=本批教训）；探针四态四档达标。教训=事故档十七节。
- **批 α**（文献库三件）：双加号（文字去「+」+15 处受锁锚 exact:true 同
  步）/文件夹行双击进重命名（用户裁决翻转原豁免——三入口[右键/F2/双击]
  等价+双层 busy 防御）/TagDropdown 入口移位排序右邻。教训=事故档十八节
  （React disabled 合成事件抑制=红证 2×2 双拆——门一处方被 executor 证伪
  后矩阵闭合）。
- **reword 推送**：用户裁决=历史改写案。批 A/B filter-branch msg-filter
  限位删尾注；树零变+U+FFFD=0；哈希映射入票。
- **批 tagrows**（标签下拉行三段结构=用户设计定案）：[勾选框 role=
  checkbox][名称区行内编辑（✓ 钮 mousedown preventDefault+Enter 保存/
  Esc 取消/**失焦=恢复不保存**[票面钦定与批 A 相反锚注差异]/组词守卫/
  busy 门 isPending）][颜色框→行内色板（8 预设+恢复默认 null 路；失败面
  toast+guard.end）]+勾选只归 checkbox（四路负锚+变异 MA）+Esc 分层+role
  menu→group。门链=k2 FAIL B1[✓ 竞态]→主控亲验 L142 防线+RR1 七项→
  变异 MC 真浏览器红证（jsdom 盲区检出力）→复核双 PASS→probe 253/2586+
  74/74+视觉三断言→裁决部 GWC（A-G+A1 全成立+行号级自读复核）。

## §3 主控亲执（申报）

诊断探针五枚（folder-zoom/ui-scale×2/folders/user-settings 只读 settings
取证）+ci.yml 范围闸亲验（发现批 A/B 埋雷——用户裁决改写）+两 CI 红根因
诊断与修复（CRLF 归一 45 文件）+reword 树零变/U+FFFD 亲验+B1 销项亲验
（L142）+d1 补发证据原文五项+提交七笔显式列件+推送×3+账本 507→528。
过程失误如实：批 α 复核简报计数口径混写（k2-N1 抓出）；tagrows 首审包
摘要化致 d1 程序性维持（补发原文销）。

## §4 挂账与登记

- **视检反馈批间状态**：已毕=VFIX/α/tagrows+「文件夹过多滚动条」（已有
  在档）；**新会话承载=脉络系统性梳理**（用户裁决——三项定性在档：画线
  链完好但锚点无视觉指示+up 须落目标卡缘 ±6px[检出力实证]+失败静默；
  月框下拉 stretch 机制未贯通[下拉带 extend 实测永不触发]；走线绕右=
  seed 复现直连/垂直弧，用户库形态待复核——探针件 probe-lineage-trio/
  probe-pull-stretch 驻仓外可复跑）。
- **登记项**：①k2-N1 role=checkbox 键盘可达性专项断言（挂账——tagrows
  裁决部 P2）②d1-N1 e2e `^名\d+$` 正则前缀歧义→`.lib-dd-nm` 精确断言
  （随下批）③TagDropdown 248/250 行贴限拆件预警④FolderNav 可伸缩
  resizer（用户提出——功能面较大未排期）⑤CI 30m 取消源不明（如再现在
  查）⑥观察项：NodeMenu「连接父文献」双入口已退役面知悉（画线替代）。
- **教训档**：十七节（overflow:hidden 剪辑链 scrollWidth 恒真假绿——
  溢出断言锁真实元素 rect）/十八节（React disabled 合成事件抑制——红证
  双层互掩 2×2 双拆+负断言真空真风险）。
- 教训回流状态：两节已入库；计数纪律二次实证（tagrows probe M4 措辞微差
  自查）。

## §5 新会话开工序

1. **CI 绿确认**（tagrows push 触发 run——若红按 §1 CI 事件两根因谱系
   排查；30m+ 未出结果查 runner）。
2. **用户新会话=脉络系统性梳理**（用户裁决 2026-10-03：业务逻辑+方案+
   爆炸面+集中修复——三项定性+五探针证据为输入；批 β 原「无跨月联动」
   裁决并入：月框内下拉扩展=需求，跨月联动=无效复杂度删除）。
3. 用户续视检（批 α/tagrows 验收面：双击重命名/标签钮新位/标签行三段
   编辑体感）→功能终态冻结→**DB 战役设计稿呈裁**（v113 §5 不变——F-
   TAGS-02/F-STAR-01/AI 域/文件清理/存量治理同窗）。
4. S5 盲形清单搭车（承 v110）。

## §6 操作条款存续

承 v113 §6（=v112 §6）全项。账本行 schema 单源=ai-dev-org references/02
§9；tier 记法 model-field: 前缀。门一常设双审=k2+d1（2026-10-02 修订二
换座后形态——本日四批全链再实证）。事故档回流：十七/十八节新增（本日
两批各一）。
