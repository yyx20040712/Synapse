# 交接书 v128 —— A 批收官：数据契约批四单元全毕（2026-10-04）

> 前承 v127（单元四 B 半场）。本档=同日续场：用户指令「当前会话批准完成
> A 批」——A1b/A2/A3/A4 四单元三屋全链落地（A1a 前场已毕）。

## §0 本场消耗与开工记录

用户指令=「当前会话批准宛城A批」（=批准完成 A 批——明确指令面，v124
口径满足）。技能清点：ai-dev-org=用（实现批全对抗位×4 单元+分级烤验：
A4 纯文档 4 文件超小批定义走双审）；subagent-driven-development=用
（ops-executor×3 随宿主档）；test-driven-development=用（executor 红证
形态：先红实证〔typecheck error 清单+定向 failed〕→绿）；verification-
before-completion=用（每单元收口 verify 真退出码）；systematic-debugging
=用（A3 e2e 两红根因定位）。配置=主控 GLM5.3 宿主单岗；k1（kimi-third
$max）+d1（deepseek $max）双审×4 轮+executor×3。

## §1 基线终态（对不上禁提交）

- 仓库=8f5a41e5fa6（A4 登记笔）已推送；工作树清洁；locks 351 同步
  （353→351=删两件受锁测试件）。A 批提交链：8e85ac4f0c4（A1b）→
  07da7f0be53（A2）→ceeff6a667b（A3）→8f5a41e5fa6（A4）。
- **批级门二实证**：verify EXIT=0 真码（每单元主控复跑）+全量 e2e
  **75 passed 2.9m 零 flake**（A3 RR2 后终态——A4 纯文档复验 EXIT=0）
  +指纹门绿（cases 2680→2658→改写面豁免 502→530 全命中）。
- CI：四笔提交的 run 待出——本场开场时 bc8124139c9 run=success（v127
  收口绿）；下场首查 A 批四 run（若个别 run 红=查六道关卡 vs 尾注闸
  step——本场四笔 message 均带受锁尾注且规避了尾注裸串教训，预期绿）。

## §2 四单元交付摘要

- **A1b 标签域退役**（8e85ac4f0c4，38 文件 +219/−1087）：五层（schema
  字段/repo 写链读映射/patch-node 白名单+store+写队列/组件三件套+六挂点/
  导出+GOLDEN 重冻结）；lineageNodeSchema 无 tags 字段=INV-103 锚。
- **A2 title 停用**（07da7f0be53，21 文件 +221/−167）：schema/repo 读写链
  /FTS LIKE 单列化/markdown+corpus 导出行（executor 盘出）/ReaderNotesPanel
  静态「全文笔记」节标；FTS 触发器行为主控亲验（AFTER 行终值+trigram
  空串零 token+UPDATE 对称幂等）。
- **A3 core_idea 全退役**（ceeff6a667b，70 文件 +470/−589）：五面+会话语义
  换血（editCoreIdea→moveNode 同 patch 轴单消息同径——主控出示 store:265
  -271 证据）+BoardDialogs 头注预言兑现（挂点消亡本件随消亡）；**RR2 主控
  亲执 e2e 两修**（T2 fixed 菜单浮层拦截→坐标点透明遮罩；T3 months 候选=
  全库跨年月组 flatMap+moveTargetLabel(year,null)「未定月」不带年）。
- **A4 声明与登记**（8f5a41e5fa6，5 文件 +47/−5）：INV-101~104（101/102
  诚实降档「部分」——类型面锚边界=门审裁决；103/104 已锚定负锚）+
  ADR-0014 v1.6（三死列单修订承载）+architecture §5/§6+defense-lifecycle
  ㉓ 扩行（六项 DDL 挂账：终态判据+执行序③先于②+⑥虚表全套）。

## §3 门链全录（四单元）

- A1b：executor（红证三形态）→k1 B0W3N5+d1 B0W3N7→RR1 七项处置
  （override 轴实测销项/豁免映射/三面补扫描/命名参数/登记残留）。
- A2：executor（tsc 13 error+3 failed 先红）→k1 B0W2N4+d1 **B1W2N6 返工**
  （审包证据密度不足=主控构造缺陷）→**证据补发包**（七组原文）→d1 终审
  B0W1N3→账目销项。
- A3：executor（78 error+7 failed 先红）→k1 B0W3N8+d1 B0W6N6→RR1 全处置
  （双豁免链/moveNode 同径/断言对位 17→16）→**RR2 主控亲执 e2e 两修**
  →全量 e2e 75 passed。
- A4：主控亲执→k1 B0W3N7+d1 B0W4N4→RR1 五项修订（降档/引证/终态化/
  虚表全套/翻转义务）。

## §4 挂账与下场首办

- **对齐批③基线再生成+②stale 清除**（v127 §4 挂账续——弹药已备）：
  预留完整一场连续执行。
- **D 批 DB 战役**（㉓ 六项——A 批三死列清列+对齐批三 DDL；终态判据与
  执行序已登记）。
- **B 批**：工具条几何遮挡（v124 立案）。
- A 批前向债务三件（architecture §6 在档）：6 件 SQL 直写夹具+token
  名实+seed 宽松类型缝隙。

## §5 新会话开工序

1. CI 首查：A 批四 run（8e85ac4f0c4/07da7f0be53/ceeff6a667b/8f5a41e5fa6）。
2. 对齐批③基线再生成+②清除同场（预留完整一场）。
3. 视指令：D 批 DB 战役启动（㉓ 六项票面就绪）或 B 批。

## §6 操作条款新增（承 v127 §6 全项外）

- **异构位审包密度下限=A1b 级**（内联核心 diff 原文——A2 d1 首轮 B1
  「摘要级=结构性拒审」实录；补发包=七组原文〔SQL/触发器/关键块/夹具/
  豁免清单/负锚/流程〕形态在档）。
- **executor e2e 改写须实跑验证**（playwright esbuild 不查类型——A3 两
  缺陷实录：fixed 浮层拦截点击路径+候选集数据源凭想象硬编码；spec 改写
  后定向跑是 DoD 不是可选项）。
- **豁免机制三口径**（A 批三发现入册）：整文件删除=file 级消失自动出集
  （豁免零条而门绿）；已豁免键的再删除=豁免语义内（双豁免链——被删 it
  键在对齐批已豁免则 A3 删不再触发）；断言原文指纹=改写类收紧走 caseTitle
  豁免（12 条/批常态）。
- **pickMonth 同值 no-op 短路在 UI 层**（useCardDrag:154）而 store 层
  moveNodeMonth 恒 enqueue——两层语义差在档（e2e 触发器设计须知）。
- moveTargetLabel(year,null)=「未定月」不带年（null 月短路）。账本
  （本地件）625→629（本场四行：gate1×2+commit×2）。
