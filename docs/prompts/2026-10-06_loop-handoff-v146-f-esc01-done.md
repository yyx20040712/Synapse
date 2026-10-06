# 交接书 v146 —— F-ESC-01 Esc 接缝收尾批（三屋全链毕，2026-10-06 晚场第十场）

> 前承 v145（B5 收官批）。本批=pendingLink Esc 退出+Dialog 让路两主件
> +B5 裁决部 R1/R3 两搭车销项。runId=20261006-fesc01。基线=ec7544da0c4。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋+烤验触发表+账本）；subagent-driven-
development=用；test-driven-development=用（executor 侧）；verification-
before-completion=用（verify 亲验+probe 独立重跑）。配置：executor/probe=
随宿主（session:host-tier）；门一 k1（kimi-third $max）+d1（deepseek
$max）；裁决部（kimi-third $max）。

## §1 基线终态（对不上禁提交）

- **CI 首查销项（v144-C6 正式闭合）**：B5 批 run 37428116060=success
  （单测 259 件/2645 例+e2e 81 passed——与 v145 §1 逐数一致）。
- 基线=ec7544da0c4（工作区干净起）。本批 9 文件：src 3
  （use-lineage-esc.ts/LineageBoardMenu.tsx/use-sidebar-pane.ts）+tests 3
  （c2-esc/use-sidebar-pane.test/e2e lineage.spec）+docs/invariants.md
  +locks/manifest+registry（收口面）+本档。
- verify 259 件/2653 例（2645+8）；e2e 全量 82（81+T12d）；locks 364
  （4 哈希随迁：3 测件+invariants.md——后者受锁面勘误，executor EPERM
  实证后按锁序走毕）；豁免 142/142/0 零新增。
- CI：本批提交推送后由下场首查（e2e 面+82 例计数）。

## §2 交付（票面两主件+两搭车）

1. **件① pendingLink Esc 退出**：LineageBoardMenu 自治 Esc useEffect
   （LineageNodeMenu 先例同型——无 mode 门）——守卫三段=IME 早退/INPUT
   原生优先/[role=dialog]+[role=menu] 在场让路（防 dialog/menu×pendingLink
   同帧双关两层）；经 props.setPendingLink(null) 回写（宿主态归属不变）；
   提示条挂 data-esc-family="menu" 可探测标记（拒 role=menu 语义不符/拒
   testid 承载行为选择器）。
2. **件② Dialog 让路**：单口让路查询扩单语句三选择器
   '[role="dialog"], [role="menu"], [data-esc-family="menu"]'；Dialog.tsx
   零改动——自治关闭完整承载主控亲核（Dialog.tsx:28-41 document keydown
   +关态 return null 零 DOM 残留；lineage 域唯一 Dialog 消费=
   nav-graph-picker.tsx 脏确认框挂 LineagePage 子树，probe ⑨复核一致）。
3. **搭车 R3（B5 裁决部挂账销项）**：onResizeKey ArrowLeft/Right 函数式
   更新 setWidth(w=>clamp(w±16))；Home/End 常量直设不动。
4. **搭车 R1（B5 裁决部挂账销项）**：分支级变异红证 m4-m7+m12 四分支全
   红（含 RR2 补 ArrowLeft 回退段判别镜像：284 起两连左直调→252，闭包
   形态=268 必红）。
5. **INV-109 ④子句更新**：层序表=INPUT/IME＞对话框层（[role=dialog] 让路
   ——Dialog 自治 Esc 承载）＞菜单层（EdgeMenu/LineageNodeMenu 自治+
   [role=menu] 让路+pendingLink 提示条同族）＞色板＞锚＞工具；句末挂账
   注记「dialog×menu 同帧理论双关=C1 预存族挂账未扩治〔门一 k1-W1〕」
   （两自治监听间无互探测——包内无可达性证据不扩治）；锚定列补
   LineageBoardMenu.tsx。

## §3 三屋门链

- executor（随宿主，基批 5,031,960 tok/91 tools/27min+RR1 1,731,438/
  15/2.3min+RR2 1,894,140/14/4.2min）：TDD 定向首红 5 红（a/b/c1/e/R3）
  +e2e 首红→绿→全量 259/2653+e2e 82+verify EXIT=0+变异 m1-m12+locks
  364；自裁 6 项申报（红相降档/两头注 RR1 补/Dialog 让路 e2e 免——单测
  a/d/e 承载）。
- 门一：k1 首轮 PWC B0W3N3（W1 dialog×menu 未挂账/W2 c2c3d 四守卫零
  变异/W3 Left 无判别面）→RR2 三 W 处置→复核 **B0W0N1 放行升级**（三
  W 全销项；N1=终态树全量 verify 归收口——probe ①销）。d1 首轮**通道
  异议申报**（席位墙拒收路径引用式审包=B-1 不可验拦截，非代码否定）
  ——主控按 06 §6 补遗三裁：书面授权档案区读取例外（repo 仍禁）补包
  重派→二轮 **B0W0N7 放行**（N1=Dialog 面包外不可验——主控亲核
  Dialog.tsx:43-45+grep 消费面销项）。零 B 级；d1 空审 30,743 tok 入账。
- probe（随宿主，1,651,452 tok/44 tools/10.7min）：十项矩阵全 GO——
  verify 259/2653 EXIT=0（RR2 终态树首跑全量）+定向 20/20+11/11+e2e
  lineage 20+全量 82+变异 A/B/C 独立复现（还原 diff 空三重证）+locks
  364+grep 四面（消费面恰 2/三选择器齐/INV 三要素/零 todo）+Dialog 消费
  面（renderer 5 件，lineage 域唯一=nav-graph-picker）+8 件+273/−24 零
  未跟踪。异常处置：变异 B 首试 node -e 隔层截断（shell 四坑族）即改
  Write 脚本件执行——源文件未受染三重证。
- 裁决部（kimi-third $max，1,141,433 tok/48 tools/6.1min）：**GO**（无
  回炉项）——16 条逐条裁决全成立+独立复算四组（+273/−24 实数/2653=2645
  +8 例闭合/e2e 82=81+1/变异覆盖面=每个改动行为行至少一条红证）；时间
  线一致性核验（m4 断言行 247 vs m12 行 253=RR2 前后态吻合，无事后拼包）。
  N 级三：N-A=提示条监听「非 Escape 键」守卫删除形无判别面（暴露面窄
  ——逆向形已覆盖；次批顺手补一例+变异，不单开批）/N-B=报告 §5 locks
  行精度备案（无需动作）/N-C=门审文书入档（收口兑现=gate1-k1/d1-
  verdict.md 两件入档案区）。

## §4 挂账与下场首办

- **F-ESC-01 翻 done**。registry open 5→4（活跃 2：F-ROUTE-02/F-LOCATE-01
  +DB 停泊 2——F-TAGS-02/F-STAR-01）。
- **下场首查**：本批提交 CI run（e2e 面+82 例计数）。
- **下场首办=F-ROUTE-02 设计派发**（三段通道：Kimi 拟定→deepseek 审核→
  主控终裁；设计要求=候选位分配算法+起终点非用户指定适配分析〔点两卡径
  保留——用户 2026-10-06 三轮②确认〕+N5 余量=年份头外障碍几何全面校准
  +B4 字面量冻结后复扫〔年份头面勿重复交付——cirefix 批已毕〕+C2 挂账
  「真实避让 e2e 缺位」同批呈）→F-LOCATE-01。
- 承前挂账更新：v142 八项+门一 PWC 机读档 R2 **不动**；v145 新增三笔中
  R1/R3 **本批销项**，side-jumps testid 前缀命名误导残留（k1-N7，受锁
  sha256 下沿用有意）不动；行数临界（lineage-side-panel.test.tsx 540 非
  空行）不动——本批未触碰该件。**新增**：N-A「非 Escape 键不关提示条」
  判别例+变异（裁决部——下次触碰 c2-esc 顺手补）；dialog×menu 同帧双关
  C1 预存族（INV-109 ④注记在册——若实际观测到可达即立票）。
- 证据件仓外档案：2026-10-06_f-esc01/ 目录 34 件（impl 报告含 RR1/RR2
  段/raw 证据 28 件含 probe 十项/gate1-k1/d1-verdict.md 门审文书两件=
  裁决部 N-C 兑现）。

## §5 新会话开工序

1. CI 首查本批 run（e2e 面+82 例）。
2. F-ROUTE-02 设计三段通道派发（Kimi 拟定者通道——02 §8.1/06 §3；
   2026-10-03 修订四扩面：前端任务设计稿可派 Kimi）。
3. 设计定稿后实施批；毕后 F-LOCATE-01。

## §6 本场成本（收口登记）

- executor 基批+RR1+RR2 合计 8,657,538 tok/120 tools/33.5min；门一 k1
  首轮+复核 7,327,604 tok/73 tools/22.7min+d1 两轮 3,024,558 tok/42
  tools/5.4min；probe 1,651,452/44/10.7min；裁决部 1,141,433/48/6.1min。
  逐席入账本。
- 账本 739→745 六笔（dispatch/gate1-k1/gate1-d1/gate2-probe/
  gate2-adjudicate/commit）。
