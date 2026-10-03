# 交接书 v115 —— CI 环境适配 A 案/A2/timeout-180 三折+脉络战役批 1/2 收口档（2026-10-03）

> 前承 v114。本档=同日下半场：A 案（超时放宽首战**无效**→A2 对症）+六道关卡
> timeout 180+脉络系统性梳理开战（k1 调研+批 1 画线链+批 2 下拉扩展全链收口）。

## §0 本场消耗与开工记录

用户开场=「继续开发」承 v114 §5；会话中追加裁决=「A 案完成后开脉络系统性
梳理，**k1 承载详细调研规划→实现者实现**」。技能清点：ai-dev-org/
subagent-driven-development/verification-before-completion/
dispatching-parallel-agents=用；TDD=executor 面用（主控配置批不用）；
systematic-debugging=用（CI 分诊）；frontend 族/dynamic-workflows=不用。
配置：executor/probe=随宿主（session:host-tier）；k1=Kimi 链 $max；d1/
裁决部=deepseek $max。

消耗：executor 三轮（lnfix1 10.3M+4.7M/lnfix2 13.0M）+k1 调研 2.86M（53
Read 自由深读=ORG-12 反例实录）+门一 7 席（k1×5/d1×2）+probe×2+裁决部×2
（lnfix2 席行级复核 105 读 7.3M）+主控亲执（A 案/A2/timeout-180 三单点
配置批+分诊+提交五笔+推送两波+账本 528→550[22 行]）。

## §1 基线终态（对不上禁提交）

- **提交五笔（本会话）**：A 案 862c3661b84+A2 61468576a88+lnfix1
  ab7d76c3715+lnfix2 61a8771cf72+timeout-180 c3c7ea67cd5；推送
  b5976b40525..c3c7ea67cd5（五笔）origin/main 同步。registry 不立票
  （视检反馈批=交接书承载先例沿用）。
- **verify 终态 EXIT=0=255 件/2598 例**（+2 件/+12 例：lnfix1 单测+9/
  lnfix2 单测+3）；**e2e 75/75**（+1=T12b；T9 增段并入既有用例）；
  **locks 355**（+2 新测试件）；useDrawLine 352 行/DrawAnchorHint 16/
  card-drag-session 331/card-stretch 件 217 均达标。
- **CI 状态（三折实录）**：①run 37101764841（A 案后）=46.6m 跑完仍
  **35 红纹丝不动**+120 处 30s 超时→分诊定性=**`_electron.launch()`
  自建 BrowserContext 不吃 `use.actionTimeout`**（A 案那行没打到靶）；
  ②A2 修正（e2e-env.ts `setDefaultTimeout(60s)`）后 run 37109891745=
  **60m04s 再撞 job timeout 取消**——A2 使失败 action 等满 60s，35 红族
  耗时翻倍爆预算（A 案 k1-W1「cancelled 连数据都拿不到」预言命中）；
  ③timeout-180 过渡预算已推——**新 run 观察=新会话首查项**（判据见 §5）。

## §2 五批门链与交付

- **A 案**（862c3661b84）：playwright config actionTimeout 60s+test 90s。
  k1 单审有条件放行（W1=时长裕度薄）。**疗效=零**（run 37101764841 实证
  35→35+120 处 30s 仍在）——保留无害（test 90s=runner 层仍有效）。
- **A2**（61468576a88）：e2e-env.ts launch() 加 `app.context().
  setDefaultTimeout(60_000)`+async 化（签名兼容零调用点改动）。k1 单审
  有条件放行 B0/W2/N2——**W1 疗效判据=首轮 CI run 30s 超时计数归零，
  纹丝不动即分诊定性错误回炉**（待新 run 验证）。
- **lnfix1=脉络批 1 画线链**（ab7d76c3715，8 件 473+/11-）：三缺口=①
  DrawAnchorHint.tsx 新 16 行（armed 待机近锚 accent 圆点——≤DRAW_SNAP_R
  与可起拖同一数学「所见即可拖」）②容差 6→12 ③落空分层（他卡膨胀圈=
  error toast「落点未在连接点上，未创建连线」排除源卡/空白=静默）。hint
  通道=leading 节流 50ms+**RR1 trailing 窗尾补发**（续期语义+cleanup 清
  timer）+取消路径收尾补算（建边路径不补=resetTool 迁移表语义——实现者
  偏离申报获采信）。门链：executor（4 变异）→门一双审 k1 B0/W1/N6+d1
  B0/W2/N8（W1 双审一致=源卡排除零守护）→RR1 三项（守护例+trailing+
  ADR 申报+拆件 lineage-drawline-rr1 守 500 线）→k1 复核 PASS→probe
  矩阵绿→裁决部 GWC（C1 亲验闭环/C3-C4 挂账）。
- **lnfix2=脉络批 2 下拉扩展**（61a8771cf72，9 件 300+/48-）：k1 调研
  双断点（A=实时 rect 被占位槽腾行 +92 吞噬 82px 下拉带/B=stretch
  padding +94 与判定共咬实时 bottom 成振荡）→**冻结基准**（grab 帧同步
  取值+激活后 rAF 单次校准，guard 四条件）消双断点+跨月联动死码四跳清理
  （frameAt/frameContains/registerFrame/framesRef——用户裁决「无效复杂度
  删除」，全仓 grep 零残留亲验）。测试亮点=stubLiveFrame **真机布局随动
  模型**（静态 mock 下旧实现假绿，随动模型才可判别）。门链：executor（4
  变异，3/3b=tsc 型红=死码变异天然形态；M3 首跑混入 TS18047 真缺陷终态
  修复诚实披露）→门一双审 k1 B0/W4/N10+d1 B0/W3/N5 零回炉→主控亲验
  （grep+onUp 实时单源）→probe 矩阵绿→裁决部 GWC（**行级复核 105 读**+
  IR「261 行」笔误勘正 217；独立意见「零回炉成立、零挂账不成立」）。
- **citimeout-180**（c3c7ea67cd5）：六道关卡 60→180 过渡预算。**回调
  触发条件（量化）=B 案后 e2e 红≤5 或连续 3 run ≤45min→回调 60/90**。

## §3 主控亲执（申报）

CI 分诊三轮（120 处 30s 超时形态 grep/失败上下文 gh 抽查/60m04s 取消源
定性）+三个单点配置批亲执（A 案/A2/timeout-180）+k1 调研派发与终裁（三
批规划采信：批 1/2 立派+批 3 诊断先行；跳过 deepseek 审核位=用户显式两
步指令承载申报，对抗性由实现批门链兜底）+亲验销项（DRAW_SNAP_R 零外部
消费/store 切 mode 清 tool/四符号 grep/onUp 段/if:always() 缺位/public
不计费）+提交五笔+推送两波+账本 22 行。过程失误如实：①RR1 条款「建边
后 hint 在场」与迁移表 resetTool 语义不相容（实现者纠正）；②派 probe
简报「20+6 例」估算口径误差（实测 23+3，非实现者失实）；③票面「guard
三条件」实为四条件（d1-N1 勘正）。

## §4 挂账与登记（带单清单——裁决部「零挂账不成立」意见全数兑现）

- **lnfix2 裁决部 C2**：冻结基准时效（拖拽会话期间框视口位不变=未声明
  假设——k1-W2/d1-W2 双审同款）→**下批首票登记 docs/invariants.md**
  （新条或并入 INV-98，执行列指向 lineage-card-stretch.test）。
- **lnfix2 裁决部 C3**：rAF guard「s.extend 跳过」分支+高卡离流缩框校准
  +12px 死区收敛断言——帧时序用例（驻 stretch 件余量足）。
- **lnfix2 裁决部 C4**：82（PULL_BAND_PX）vs 94（padding，基础 12→增量
  82）两值来源落档或对齐值面裁决。
- **lnfix1 裁决部 C3 四项**：恰值边界例（dist==DRAW_SNAP_R 钉「≤」）/
  draw-dashed 分支 hint 例（或附共享路径证据豁免）/helper 第 3 份复制
  抽稀（**test-refactor 票**）/lineage-drawline 件 484/500 头寸。
- **timeout-180 k1-W2**：CI cancelled 无报告的结构性风险——报告步
  `if: always()` 或 e2e 拆独立 job（后续票）。
- **批 3（脉络走线绕右）待开**：k1 调研档（仓外 lineage-survey-
  k1-20261003.md）§四批 3 规划=诊断先行（EdgeOverlay 增 data-route 1 行
  +仓外探针 dump 用户库 route 分布——**用户库副本跑，禁直触真实
  userData**）→主控终裁方向（默认=band 终落锚散开）→bands.ts+lineage-
  routing.test 增例+**T-P1b 必迁**（laneX 谓词族全崩——迁移形态须主控
  裁决）。§五未知 6 项（用户库形态未复核为最大悬念）。
- **B 案战役**：CI 环境逐用例适配（可见性等待稳定化/布局断言轮询化/
  慢机时序宽容）——输入=新 CI run 收窄面实测（见 §5）；与 timeout-180
  回调条件联动。
- 承 v114 挂账：键盘可达性专项断言/正则精确断言/TagDropdown 248 拆件
  预警/FolderNav resizer/NodeMenu 双入口退役知悉。

## §5 新会话开工序

1. **CI 新 run 首查**（timeout-180 后首个 run，判据双条）：①A2-W1 疗效
   =失败日志「Timeout 30000ms exceeded」计数**归零**（不归零=A2 分诊
   定性错→回炉重分诊，先查该 spec 是否自设 page 级超时[k1-N2]）；②
   收窄面=35 红→实测 N 红（B 案输入+timeout 回调条件基数）。预期形态：
   30s 超时族应转绿或转「Timeout 60000ms」；断言漂移族（布局中间态）
   仍红=B 案面。
2. **批 3 派发**（诊断先行——k1 档 §四批 3+§五；T-P1b 迁移形态主控
   裁决随诊断结果呈批）。
3. **下批首票=lnfix2-C2 invariants 登记**（§4 首条）。
4. 用户续视检（画线锚点指示/容差 12 体感/下拉扩展 stretch 动画——批
   1/2 验收面）→功能终态冻结→DB 战役设计稿呈裁（v113 §5 不变）。
5. S5 盲形清单搭车（承 v110）。

## §6 操作条款存续

承 v114 §6（=v113 §6）全项。门一常设双审=k1+d1（修订三形态——本日
lnfix1/lnfix2 两批全链再实证）。单点配置批=主控亲执+k1 单审+亲验机检
矩阵（本日三批实证）。事故档回流：本日候选=「Playwright electron
context 不吃 use.* 配置」（A 案无效根因——跨 A/A2 两批教训，建议新会
话回流十九节）。账本 528→550。
