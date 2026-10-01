# 交接书 v105 —— F-LINEAGE-02 ①a 实现批收口+F-LGRAPH-01 design-final 定案（2026-10-01）

> 前承 v104。本档=开工序第 1 步（design-final 升级）+第 2 步（①a 实现
> 批·三屋全链）完成收口。

## §0 本场消耗与开工记录

技能清点（开工纪律）：ai-dev-org=用（三屋/烤验/账本）/TDD=用（派发简报
纪律主体）/subagent-driven-development=用（派发蓝本）/verification-
before-completion=用（verify 亲跑真退出码×3 轮）/systematic-debugging、
dispatching-parallel-agents、code-review 族、frontend 族=不用（无缺陷面
/管道串行/审查归门岗/视觉已定案——理由在档）。配置自查：主控=GLM-5.3；
executor/probe=随宿主（session:host-tier）；k1=Kimi 链绑定 $max；d1/
adjudicator=deepseek 异构 $max。

消耗：executor 三轮（六单元 53.5M+回炉 1 26.4M+回炉 2 12.8M tokens）+
门一五席（k1×2+d1×3）+门二双部（probe 1.0M+adjudicator 9.9M）+主控
亲执一轮（W-1/W-2+探针）。账本 391→410。

## §1 基线终态（对不上禁提交）

- **批1（design-final 定案批，commit e635a226885）**：3 文件 +118/−2
  （新档+mockup 头部+registry 注记）；verify EXIT=0（src/tests 零触碰
  基线零变=204 件/2233）；locks 300；check-tickets open 7。
- **批2（①a 实现批）**：38 文件（+新 8 件：routing/ 五件+迁移 013+两
  测试件）——src 22+tests 13+locks manifest 1+豁免 1+design-final 1。
  **verify 亲跑+probe 独立复跑双 EXIT=0=206 件/2257 用例**（基线
  204/2233→+2 件+24 例）；e2e 64/64（主控复跑+probe 复核）；locks
  300→303；豁免 294→318（+23 ①a 主体+1 改题指纹）；check-tickets
  EXIT=0 open 7（F-LINEAGE-02 保持 open——②未毕）。

## §2 批1：F-LGRAPH-01 design-final 定案

新档 docs/design/2026-10-01_f-lgraph01-editor-design-final.md：P-1..P-20
全表生效（用户不回复默认成立口径 v104 §3）+T1..T12 定案+跨档仲裁句
（走线几何域以走线档为准/交互域以本档为准）+分域单源注+实施拆批
（①a→①框架→②编辑器）。小批分级烤验=d1 单审 PASS B0/W2/N7→主控终裁
W/N 全采纳修文（单源注/仲裁句/P-3 限定语/P-7/P-8/P-16/P-17 补注/票面
②指代）+N-7 亲验闭合（P 表机械对照 20 行两档一致+关键数值 grep 全
承载）。mockup 呈裁档转历史档（正文零改动仅头部状态行——「呈裁/拟推」
按终值表读作定案，§1/§4 未列项保持拟推态）。

## §3 批2：F-LINEAGE-02 ①a 实现批（三屋全链）

**交付**：①走线器=甲链五件 routing/{anchors,avoid,rounding,chain,bands}
（164/117/134/284/190 行全 ≤300；链六态 direct→h-slip→band→corridor→
fallback+manual-override；旧五级链 12 函数整体退役）；②布局=卡 128×72+
瀑布错位 offset(R)=(R×82) mod 148（年内跨框连续+新年复位）+月标注入
月框内 padding 顶+drag-slot/夹具族迁移（104/52/62/124→128/72/82/148）；
③via 模型全链=shared schema（缺省省略不产出 []）+四不变量校验（正交/
无重合 ≥1px/≥1 才 override/有限数钳）+迁移 013（edges.via TEXT NULL）
+repo/service（违者 INVALID_REQUEST）/IPC/store 透传+EdgeOverlay
manual 边 DOM 末位；④单测重写=22→16 例甲链例集（d 值独立推导——门一
抽 5 例+k1 复算 2 例+裁决部复算 3 例全中）。

**门链**（回炉 2 轮+主控亲执）：executor 六单元（TDD 首红 4 组+变异
10 支）→门一双审 k1 **FAIL B=2**（拖拽 fixed 盒 margin 双计+同锚散开
注册身份错位）/d1 PWC→**回炉轮 1**（R1-R7：B 面修复+W-1 出桩自适应+
T-P1b 谓词恢复+小件）→双席复审 k1 PASS/d1 **FAIL B=1**（margin-left
.25s 过渡维度——静态修复漏 CSS 过渡语义）→**回炉轮 2**（R8 激活禁断
三径+R9 三锁+R10 拆件 ≤300）→d1 三审 PWC（W-1 清场径无回流分隔+W-2
记录仪恒真）→**主控亲执**（W-1 cleanupFlight 回流分隔对齐零位移径
范式+W-2 切片判别修正——首版切片起点取 pDown 后系恒真经变异证伪后
修正+浏览器 CSS 探针实证：形态 A 过渡启动坐实/形态 B 全程 82px 无
过渡）→门二 probe 6 项全 PASS（verify 独立复跑+变异双复现+退役零残留
+证据核验+数字对账+树态并集）→**裁决部 GO_WITH_CONDITIONS**（62 项
终裁：闭合 22/登记 11/采纳保留 22/驳回 3/关闭 4——说了没改=0；5 格
独立复算全中）→C1-C5 收口条件全兑现（变异 raw 补档/五席尾栏补全+
UUID 勘误/账本补记 4 行+tier 记法统一/registry 注记不翻/注释三处+
补注 5+erratum）。

**教训回流（事故档待回流——`AI辅助开发经验教训.md`）**：
1. **CSS 过渡按「样式重算周期末计算值」判定**——同步块内先设属性后
   清禁断（transition）若无强制回流分隔，禁断失效（回炉轮 2+主控亲执
   实证；零位移径「恢复→void offsetWidth→清键」范式应作为一切
   「禁断→恢复」操作的标准式）。
2. **切片断言的采样起点必须取在「被锁行为发生前最后一个自然采样点」
   之后**——起点取早则历史样本混入恒真（主控亲执首版切片即犯——变异
   红证是断言判别力的唯一裁判）。
3. 门一代落审计档勿截尾栏（MODEL-SELF/FINDINGS 机读面——C2 复盘）。

## §4 挂账与登记（单源=design-final §5 补注 1-5）

- 12 锚全满短桩错峰（D-L2-11）→F-LGRAPH-01 ②端点重连域；
- 导出 via 扩面（schema_version 3+golden）+store update 载荷清 via
  →②收口前立单；
- 预埋 API（anchorId/stubEnd）保留申报——②消费；
- h-slip 斜段判读=关闭（先例判读，补注 2）；rounding 字面勘误=补注 3；
  瀑布 82 重标定指针=补注 5；
- F-LINEAGE-02 ②拆分（useCardDrag 547/store 538 物理行）随 F-LGRAPH-01
  启动；N 级保留 22 项清单在裁决档（gate2-adjudicator.md）随②批携带。

## §5 新会话开工序（承 v104 §3 余项）

1. **F-LGRAPH-01 实施①（框架）**：模式栏+导航窗格（P-17 宽度记忆）+
   退役清单执行（十四行）+useCardDrag/lineage.store 拆分（500 红线+
   F-LINEAGE-02 ②一并毕）。
2. **F-LGRAPH-01 实施②（编辑器）**：工具组+画线+卡片三层 128×72+
   详情面板+拖拽分屏+手动调线编辑态（含锚错峰/导出 via/update 载荷
   三挂账）+右键反馈+聚焦 dim+缩放+e2e。
3. 小挂账批穿插（F-TESTREF-S1 第 7/8/9 条+F1/W1/W3+T4/W2）；DB 窗口
   挂账不变（F-TAGS-02+F-STAR-01）；F-UIRES-01 等用户库页输入。

## §6 操作条款存续

承 v104 §4（=v103 §6=v102 §6）全项。账本行 schema 单源=ai-dev-org
references/02 §9；tier 记法自本批统一 model-field: 前缀（裁决部 N-1）。
