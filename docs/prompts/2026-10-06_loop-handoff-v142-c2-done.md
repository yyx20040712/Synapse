# 交接书 v142 —— F-UIRES-03 C2 连线锚点+吸附交付（2026-10-06 晨场第六场·实现批）

> 前承 v141（第四轮裁决撤 B5 件④）。本档=实现批：C2 三屋全链交付+收口。

## §0 本场消耗与开工记录

技能清点：ai-dev-org=用（三屋编排+烤验）；test-driven-development=用
（实现批 TDD 主纪律——executor 承载）；verification-before-completion=用
（verify 亲验+probe 独立矩阵）；systematic-debugging=用（executor 几何红
排障）。配置：executor/probe=随宿主会话模型（session:host-tier——2026-09-19
用户裁决未绑定形态）；门一 k1=绑定 $max；d1=绑定 $max；裁决部=绑定 $max。

## §1 基线终态（对不上禁提交）

- 基线=6903940e386（v141 裁决补正批，已推送）。本批=实现一笔：26 files
  +1012−118（23 基批+RR1 净增 3 件——exemptions/manifest 随 RR1 入 diff；
  基批口径 +965−108 系 RR1 前快照，终态以此行为准〔裁决部 C7〕）。
  verify 收口亲验 **EXIT=0**（258 件/2636 例=基线 2610+新 26 精确闭合）
  +locks 363（+2 新测试件）+health-scan RED=0/WARN=0。registry open=5
  持平（F-UIRES-03 余 B5 两件；活跃 3+DB 停泊 2——v139 声明形沿用）。
- CI 由下场开工序首查本笔 run。

## §2 交付摘要（五单元+门链）

- **P1 锚点静态层**：CardAnchorDots 新件（四边中点 div 圆点 DOM 常驻+
  显隐 CSS 单源 .drawing∪:hover；直径 8 画布 px+--accent-ink fill+
  1.5 画布 px accent 描边；inset:-1px border 补偿；pointer-events:none
  ——e2e computed-style 断言承载）。
- **P2 吸附高亮演化**：DrawAnchorHint 改造（dot 直径 12 屏幕 px=r=6/z
  补偿+环 r=9/z+.snapped 类；idle=hint/dragging=snap 经 DrawLayers 拆件
  分派；DrawPreview 吸附圆点收敛删除；样板③ r=3.2 断言随形态改写）。
- **P4 预览端点锁定**：end=snap.pt 现状锁定+e2e C2b 末帧端点=锚心
  ±0.5px+落边建立（边 path 锚级一致=F-ROUTE-02 域挂账）。
- **P5 Esc 全局面层序**：anchor 维迁 view.store（**C1「驻 hook」设计修订
  ——呈报可否决**）+escapeStep 三层（paletteFor→anchor→tool）+菜单层让路
  探测 [role=menu]+LineageNodeMenu 自治 Esc 补齐。
- **P6 drag-hint CAD 文案**：「画线＝从卡边锚点拖至目标卡」+两 icon title
  同改（点两卡径行为零改=用户确认保留隐藏径）。
- **P7 穿年份头避让**：buildSnapshot yearHeads+allObstacles 三源并集单源
  +三消费点+manual-override 负锚+降级用例。
- **门链**：executor 基批 23,211,456+RR1 4,013,823 tok→门一 k1 B0W3N7
  PWC+d1 B1W4N4 FAIL（**B1 主控证伪撤回**：toggleLineTool 同 kind=C1 N9
  无操作早退——off 支不存在；四路退出全走 resetTool 清锚+armed() 双层
  门控；d1 复核四层证据确认。附带 d1-W1 切图互斥解除〔setFolder:259 调
  resetTool——切图清锚，C1/C2 等价〕/W2 role=menu 盲测解除〔视图条件挂载
  互斥〕/W4 裁切证伪〔padding 12-18px＞4px〕）→RR1 四件（恒真断言例改写
  children 直接子恰 4+四值齐+e2e computed-style/夹具补 anchor 维/选择器
  收紧 circle.snapped 六处+豁免 4 条 138→142/routing 红数书面澄清=合跑
  计数混述）→双席复核双 PASS（B0W0N3×2）→probe 九项矩阵全绿（verify
  EXIT=0 258/2636+e2e 七例+变异 A/B 独立复现+还原 diff 空+test-surface
  142/142 stale 0+locks 363+grep 四面）→裁决部 **GO_WITH_CONDITIONS
  七条件收口全兑现**（C1 INV-109/C2 设计稿 v1.14/C3 registry/C4 本档 §4/
  C5 账本/C6 D1 行数申报更正〔实测 249/414 为准〕/C7 终态口径 §1）。
- **INV-109 登记**（锚几何一致+吸附⇔判定+Esc 层序+退出画线域清锚守卫句
  d1-N1）；**设计稿 v1.14**（版本头+C2 交付回写+**F8 行 ±6 勘误**+§4.3
  锚定句）。豁免 138→142（hits 142 stale 0）。

## §3 呈裁项（用户可否决位——未否决即维持）

1. **P3 吸附判定域维持 12 内容坐标**：设计稿 F8 行「±6 屏幕 px（现状
   判定不动）」中 ±6 系拟稿沿 R2 分析档旧值（实代码 lnfix1〔10-03〕已
   12 且先于 R2 反馈 10-04）——按「现状判定不动」意图主句维持 12，设计
   稿 v1.14 勘误在案。
2. **browse/focus 模式 hover 卡也显示锚点**：票面「armed 或 hover 卡」
   直译实施（无模式限定）；如需收窄为仅 edit 模式=一句话微改呈裁。
3. **P5 anchor 维迁 view.store**：C1 时「驻 useDrawLine 现域」的设计修订
   （Esc 单口触达必要通道+document 双监听注册序脆弱面禁用）。

## §4 挂账清单（八项——承前挂账全不动外新增）

1. **Dialog×Esc 交界面**（k1-W2 备案）：脏确认框开+Esc=对话框关+
   escapeStep 同发双消费理论面（C1 预存族同型——palette/tool 层同暴露，
   本批锚层沿承非新增缺口）——后续票治理或维持。
2. **pendingLink 无 Esc 通道**（LineageBoardMenu 目标选取态仅「取消」钮
   ——键盘退出径缺位）：建议立票（executor+d1 双呈报）。
3. **真实避让 e2e 缺位**（P7 单测合成面覆盖、真实端到端「线绕年份头」
   无 e2e）：挂 F-ROUTE-02 同批（B4 障碍几何校准 N5 同呈）。
4. **dot 视觉规格+ring strokeWidth 未锁**（直径 8/描边 1.5/fill 无值断言
   面；ring strokeWidth=1.5/z 全仓零断言——k1-N4+d1-N2 合并备案）。
5. **4px 环带 hover 边缘效应**（卡边线外 4px 非.hover 域——dot 在而卡
   hover 态未达）：低优，CAD 引力域视觉连续性后续评估。
6. **drawline-rr1 夹具未同型补 anchor 维**（该件无锚写入例+起拖即清=
   无现实泄漏——k1/d1 复核共同备案）。
7. **豁免双登冗余**（cx=228 同文本两条——机制上单条即够，双登零功能
   影响；k1 复核 N3 洞察：exemptionHits per-occurrence 全量返回）。
8. **LineageTimeline.tsx 249 行贴 250 红线**（裁决部 N 级提示：下一单元
   任何增量即触发拆件预案）。
- 承前挂账全不动（v138 §4 十一项+v139 §4+v140 §4+v141 §4——其中
  「Esc 全局层序 EdgeMenu×palette 组合→C2 承接评估」**已随本批销项**）。

## §5 新会话开工序

1. CI 首查一笔 run（本批提交）。
2. **B5 派发**（两件：卡面两钮迁详情页+resizer 键盘可达——票面=设计稿
   §2 B5 v1.13〔第四轮缩两件后形态〕）。
3. B5 毕后 F-ROUTE-02 设计派发（三段通道：Kimi 拟定→deepseek 审核→主控
   终裁——设计要求含起终点非用户指定适配分析+B4 障碍几何校准 N5 同批呈
   +本批真实避让 e2e 缺位挂账）→F-LOCATE-01。

## §6 本场成本（收口登记）

- executor（随宿主）：基批 23,211,456+RR1 4,013,823=27,225,279 tok。
- 门一 k1：基审 4,308,866+复核 1,541,506=5,850,372 tok。
- 门一 d1：基审 738,377+复核 3,661,499=4,399,876 tok。
- probe（随宿主）：946,528 tok。裁决部：2,955,223 tok。
- 合计 40,377,278 tok（裁决部复算基 38,422,055+裁决部自耗 2,955,223）。
- 账本登记见 .zcode/org-ledger.jsonl（本批笔数随 §6 落）。
