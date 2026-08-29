# R2-LG11 收口单（主控）——脉络重制浅色严谨板收官

> 2026-08-29。三屋全流程+真机复评+压缩票修正全档。门二放行清单逐项兑现。

## 1. 收口核验（主控亲验）

- verify 全链 exit=0（`r2-lg11-verify2.log`：quality/tickets/locks 164/lint/
  typecheck/**test 875 用例**/build 末环——registry 翻 done 后重跑，顺序铁律遵守）。
- locks manifest **164**=163（实现者）+r2-lg11-forensics.mjs（取证器入锁
  ——lock-protected.ps1 scripts 通配同 f1 六取证器防篡改口径）。
- e2e：见 §4 基线跑记录。
- 真机复评四线全过（§3）。

## 2. 申报栏（门二清单）

1. **W1 更正**：实现者报告 §4 恒等推算「6 字=ceil(0.962)」系笔误（0.962 为
   12 字值；6 字实为 0.481）——结论不受影响，门一独立复算恒等成立。
2. **W2 申报**：票面 §2.4「props 增 survey: boolean」实现为卡内自算
   （isSurvey 单源保持、行为等价、头注在案）——接口字面偏离，接受。
3. **locks 164 vs 票面预测 162**：+1=canvas.test 拆 lineage-canvas-visual.test
   （max-lines 500 硬红线，实现者自裁 1）；+1=取证器脚本入锁（主控收口段）。
4. **isCore 出度口径修正（压缩票，主控直做——本单最大事件）**：初版「入度
   ≥2」在 INV-27 树单父约束下**数学恒假**（合法图每节点入度≤1，isCore 永不
   触发）。单测全绿的原因=classify/visual 夹具直喂多父非法图（组件测试绕过
   service 校验层）；真机取证器 fixture 造双入边即被 service 多父守卫拒
   （toast「多父边：文献 r2-lg11-core 已有父节点」），逻辑错位当场暴露。
   修正=「被引用数≥2 的开宗立派论文」→**出度≥2（≥2 个继承者）**；改动=
   classify.ts 公式+头注、classify.test 出度化（含树约束现实性注释）、
   visual.test CORE 夹具出度化（CORE 2020 开宗→R1/R2 2021 继承）、票面 §0
   转译表/§2.1、INV-38 行；变异红证 mutation-5.log（出度→入度互换=4 it 红：
   classify 3+visual 四态 1——夹具与实现联动锁死）。
5. **票面勘误（派发前已更正）**：层带年份标 y 偏移改固定 LAYER_LABEL_DY=32
   （INV-38 消费面四改三）；用例数预测修正 ≈875。

## 3. 真机复评（票面 §9 放行线——r2-lg11-forensics.mjs 取证档 r2-lg11-out/）

| 放行线 | 结果 | 证据 |
| --- | --- | --- |
| 换行在框内 | PASS | 60 字长题名：题名级 -webkit-line-clamp=3+内容溢出>0（省略生效）+**全部卡容器级零溢出** |
| 边框编码可辨 | PASS | 核心 var(--accent) 1.5 实线/普通 var(--node-branch) 1 实线/综述 1 虚线 6-4 三型互异（SVG 属性=视觉真值） |
| 整图不回退 | PASS | 5 节点/4 边/4 层带计数+auto-fit transform 非初始+图例四项真实文本 |
| 综述右列 | PASS | surveyLeft=560=othersRightMax 480+SURVEY_COL_GAP 80 精确吻合 |

## 4. e2e 基线

`npm run test:e2e` 三轮实录：①首跑 23 passed/2 failed——lineage T1 strict
violation（本单 SVG `<title>` tooltip 与题名 div 同名双元素——**组件测试
不可见面，真机链路第二次暴露**）+reader 剪贴板（已知 flake）；②tooltip
改道修复后 24 passed/1 failed——仅剩剪贴板；③该条单跑复验 **passed
（1.7s）**=系统剪贴板共享资源时序 flake（R2-LG10 先例同型）。**终态 25/25**。

**tooltip 改道（压缩票 2，主控直做）**：SVG `<title>` 元素 → 题名 div 的
HTML `title` 属性（HTML 原生 tooltip；属性值不入 textContent——同名双元素
消除，e2e 断言零改；NodeCard 头注「优先调整实现保断言」先例执行）。改动=
NodeCard（元素删+属性加+头注）+visual.test it4（title 属性断言+SVG title
防回归 null 断言）+取证器 tooltipFull 读取。verify 复跑 exit=0（verify4.log
875 用例）。

## 5. 遗留池登记（门一 W4/W5/W6+环境事实）

- **B10**：Board 重试按钮内联 style 恒压 `.lineage-toolbar>button:hover`
  （B1 同型 hover 静默失效——旧形态平移非本单回归；候选=皮肤迁类）。
- **W5**：layout.test「同层多综述」it 对右列语义非独占锁定（旧代码亦绿）——
  U2b 动 layout 时顺带补精确 x 值断言。
- **W6**：side-panel.test.tsx 499/500 临界——下次受锁改写预计触发拆分。
- **环境事实（非工单）**：①取证器 seed 链 ABI 换绑的 Windows 文件锁竞态
  （electron 退出延迟持锁→copyFile 间歇损坏→DLOPEN）——防线=退出缓冲
  1.5s+拷贝后 hash 校验重拷+sqlite-abi use electron 终态兜底；②lock-protected
  .ps1 的 scripts/**.mjs 通配=取证器自动入锁（防篡改口径，新脚本注意）；
  ③jsdom 序列化两盲区（WebkitBoxOrient 丢弃/hex→rgb 归一）——源码形态锁+
  rgb 等价断言先例已在 visual.test/side-panel.test 注释，可固化档。
- **L6 新实录（教训回流候选——methodology §4.1⑤c 增补案例）**：公式类
  用户语言转译错位的「单测全绿」形态——「被引用数」被译成入度，而树单父
  约束使该公式**数学上不可达**（合法数据形态下恒假）；单测夹具直喂非法图
  绕过 service 校验层=假绿机制。防线=涉约束公式必须推演「合法数据形态下
  可达性」+真机复评用合法链路数据（经 service 校验）而非直喂。

## 6. 成本账本（三屋+主控）

| 屋 | token | 工具调用 | 时长 |
| --- | --- | --- | --- |
| 实现者 | 15,756,120 | 120 | 31.4 min |
| 门一 | 999,905 | 16 | 8.0 min |
| 门二 | 1,052,984 | 17 | 4.0 min |
| 主控（票面/处置/压缩票/复评/收口） | ≈（会话总账） | — | — |
