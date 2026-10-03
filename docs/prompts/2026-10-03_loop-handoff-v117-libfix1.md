# 交接书 v117 —— B 案首修批全链收口档+lnfix3 范围闸埋雷处置档（2026-10-03）

> 前承 v116。本档=同日第四场：开工首查揪出 lnfix3 范围闸埋雷
> （同日第二雷）→用户裁决 reword+force push 处置→B 案首修批
> （libfix1）全链（裁决→executor 两轮→双审→RR1→复核→probe→
> 裁决部 GO_WITH_CONDITIONS）→事故档十九/二十节回流。

## §0 本场消耗与开工记录

用户开场=「基于 v116 交接书继续开发」承 v116 §5。技能清点：
ai-dev-org/subagent-driven-development/verification-before-completion=
用；systematic-debugging=用（范围闸埋雷诊断+塌陷账精确化）；test-
driven-development=executor 面用；dispatching-parallel-agents=门一
双审/复核并行派发用；frontend 族/dynamic-workflows=不用。配置：
executor/probe=随宿主（session:host-tier）；k1=Kimi 链 $max；
d1=deepseek $max；裁决部=绑定子代理 $max。

消耗：executor 两轮（libfix1 首轮 3.24M+RR1 回炉 1.75M）+门一四席
（k1×2/d1×2——首审双有条件放行+复核双放行）+probe×1（1.20M）+
裁决部×1+主控亲执（CI 首查+埋雷诊断 reword+force push+塌陷账勘察
〔公式精确化=drawer 常驻发现〕+B 案裁决+裁决 A 扩面+RR1 裁决+
W-RR1-1 亲改〔1260→1274〕+W4 亲验销项〔基线/豁免档 dump〕+
INV-73 回写+事故档十九/二十节+提交 78a63292996+账本 564→573〔9 行〕）。

## §1 基线终态（对不上禁提交）

- **远端 main=131dca1a1d8**（重写链：eaa7f41870d/99eacd5e654 不变
  +7caa8c3cad4〔reword 后 lnfix3〕+131dca1a1d8〔v116 docs〕）；
  **本地待推送=78a63292996**（libfix1）+本笔 v117 docs。
- **哈希映射（先例口径：旧哈希=撰写时态保留）**：
  798247c9a35→7caa8c3cad4；2a3b4fa39d3→131dca1a1d8。
- **verify 终态 EXIT=0=255 件/2606 例**（2602→2604 首轮 2 锚→2606
  RR1 2 锚）；locks 355（manifest 哈希四轮同步）；e2e 窄窗单跑 2/2。
- registry 不立票（脉络/修复战役批=交接书承载先例沿用）。

## §2 本场主事件一——lnfix3 范围闸埋雷处置（同日第二雷）

- **发现**：开工首查 run 37124188921（lnfix3 触发）「manifest 变更
  尾注检查」job=failure——798247c9a35 带 [test-refactor] 尾注但 diff
  含 src 两文件（anchors/bands.ts），范围闸白名单不含 src。与
  F-UIRES-VFIX-01 批 A/B（d65683889c9 登记+ab9dc261e12 处置）同日
  同形态=**同日第二次踩同雷**（先例处置未内化=流程缺口，教训二十）。
- **处置（用户裁决=reword+force push）**：filter-branch 限位 reword
  （msg-filter 仅 798247c9a35：标题 [locked-change][test-refactor]→
  [locked-change]，正文逐字节不动）；树零变实证（新旧树哈希一致）+
  message 对比 node 字节级（仅差尾注+U+FFFD=0）+范围闸脚本本地
  重放绿→force-with-lease 推送→run 37126078518 范围闸 job=success
  实证生效。Git Bash 管道显示层中文乱码两现均经 node 读文件证伪
  （显示假象非内容损伤）。
- **尾注三分纪律（教训二十沉淀，收口清单新增）**：纯测试面战役票
  （diff 全在白名单）=[locked-change][test-refactor]；**src+tests
  复合批=[locked-change] 单尾注**；纯 src 批无尾注要求。提交前对含
  尾注提交本地重放范围闸一行脚本。

## §3 本场主事件二——B 案首修批（runId=20261003-libfix1）全链

- **塌陷账精确化（主控勘察，v116 §2 公式落地实值）**：窗口宽−72
  (rail,theme-shell.css:212)−224(fnav,library-explorer.css:9)−316
  **(规格表抽屉常驻——LibraryPage.tsx:141 无条件渲染 aside，v116
  未列主因补齐)**−522(行内：star30+id46+year74+cite52+tags180+gap
  14×5+row padding 40+6+list padding 24)=main 净宽，<1134 塌 0。
  三档探针 0/18/151.6 精确吻合；clamp 下限 640（window-state.ts:33）
  =真产品缺陷。裁决=候选 A 组合（候选 B 的 setContentSize 收编为
  e2e 回归锁手段非修复本体）。
- **修复**：library.css 四处——.lib-r-main min-width 0→120px；
  行/表头 .lib-r-tags/.lib-c-tags 定宽 180 改 flex:0 1 180px+
  min-width:0（窄窗先收缩，正常宽视觉零变）；表头 .lib-c-title 补
  min-width:120px（INV-73 表头行同源）。1024 预期 main=120、tags
  收至 0、溢出约 48px 由 overflow-x:hidden 裁右缘（year/cite 尾部
  出界=已知可接受降级）。
- **测试面**：theme.test 新 describe 4 锚（各附回填红证恰 1 红）；
  library-cards 2 旧锚替换（主控裁决 A=设计值变更→锁同步；:279
  所在用例由 F-LIBUI-01 历史 case 级豁免承接——主控 dump 基线+
  豁免档实证销 d1-W4）+exemptions +1 条；e2e 窄窗 1024 回归锁
  （getContentSize==1024 resize 直证防 no-op 假绿+main≥100+
  getByText visible 反向锁+复原 1285 实测宽分档——判定线 1274=
  1133.4+140 上取整）。
- **门链**：executor 首轮（先红 2+Received:0+bugform 变异红证+撞
  cards 旧锚互斥**正确停手**——白名单墙执行正确，根因=主控派发
  漏查被改设计值的测试锁面）→裁决 A 扩面→双审 k1 B0W1N4+d1
  B0W4N3 双有条件放行（k1-W1=d1-W3 表头零锁面双源一致/d1-W1
  resize no-op 假绿/d1-W2 **CI 虚拟屏钳制致复原档必红**）→RR1
  回炉→复核 k1 B0W1N0（新 W-RR1-1 判定线算术 [1260,1273.4) 假红
  窗）+d1 B0W0N2 双放行→主控亲改 1274→probe 矩阵 7 项（6 绿+
  A1 半红旗：删式变异 auto 兜底不塌 0=CSS 正确语义，bugform 红证
  链完整——红旗指向 probe 简报处方笔误非实现）→**裁决部
  GO_WITH_CONDITIONS**（复算四组成立）。
- **ADR 面**：无触及如实申报（布局值变更由 INV-73 承载——本批
  扩注收缩语义+锁面列 theme 4 锚）。

## §4 挂账与登记（带单清单）

- **C1（裁决部，下场首查项）**：CI 实跑核验——**注意两段验证面**
  ①run 37126078518（131dca1a，不含 libfix1）=重写链验证（范围闸
  已绿✓+T-P1b 迁移验收+34 红族仍预期红）；②libfix1 push 后新 run
  =修复验证面（34 红族**大面转绿**+窄窗用例 1285 复原分支按分档
  行为终局确证）。若转绿不达预期重开本票。
- **C2**：收缩次序行为锁（tags 先收/main 止 120 无运行时行为锚——
  下次触动 library 布局时评估立项，k1-N2 承接）。
- **C3**：复原档上界开口（theme flex 锚兜底，记录在案）。
- **C4**：case 级豁免粒度粗（d1-N1——test-surface 基线再生成时评估
  收紧为 assertionText 级；基线快照落后 c-tier 断言仍驻+豁免 stale
  157=既有再生成挂账）。
- **C5**：变异处方 bugform 规约（probe 简报对 CSS 守卫属性禁写删式
  ——教训十九沉淀列承载）。
- **timeout-180 回调条件联动（v116 §4 承）**：修复后 CI 面若 e2e
  红≤5 或连续 3 run ≤45min → 回调 60/90（下场 CI 结果出来后评估）。
- 承 v116 挂账：lnfix3 C1-C4/单点观测窗批先例类三要件/INV-100
  承载挂账（C3 帧时序/94 值耦合 CSS 变量化/k1-N2 声明处粒度）/
  timeout-180 k1-W2 沿承/事故档候选②（Playwright electron 不吃
  use.* 配置）/承 v114/v115 全项（键盘可达性/正则精确断言/
  TagDropdown 248 拆件/FolderNav resizer/NodeMenu 双入口/lnfix1
  C3 四项）。
- 教训档：十九节（flex 塌 0 族+虚拟屏视口+bugform 口径）/二十节
  （范围闸埋雷复发+尾注三分纪律+历史改写三件套）已回流。

## §5 新会话开工序

1. **CI 双段核对**：①37126078518 终态（T-P1b 迁移验收+34 红族
   仍红确认=B 案根因闭环对照）；②libfix1 push 后新 run（预期
   e2e 大面转绿——35 红中 34 例根因已除，T1 坐标漂移族另列慢机
   宽容面）+窄窗用例 1285 分支行为。若新 run 未出（77m 量级）等
   完再判。
2. **timeout-180 回调评估**（C1+回调条件联动）。
3. 用户续视检（v116 §5 承+新增：窄窗手动缩窗观感——标题列保底
   不灭+tags 列收缩）→功能终态冻结→DB 战役设计稿呈裁。
4. S5 盲形清单搭车（承 v110）。

## §6 操作条款存续

承 v116 §6（=v114 §6）全项。新增：**尾注三分纪律**（§2——src+
tests 复合批单 [locked-change]，提交前本地重放范围闸脚本）；
**派发前 grep 测试面既有锁**（被改设计值的锁面预查——executor
接缝呈报制兜底但预查省一轮往返）；**变异处方 bugform 口径**（CSS
守卫属性禁删式——auto 兜底假绿）。门一常设双审=k1+d1。账本
564→573（9 行）。
