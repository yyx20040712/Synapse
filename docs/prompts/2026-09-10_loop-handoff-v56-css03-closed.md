# 2026-09-10 LOOP 交接 v56——F-CSS-03 收口（v55 B 态恢复+战役毕）

> 上段=v55（八票窗七毕+CSS-03 中断挂起）。本段=v55 §0 B 态恢复序执行：
> theme.test 定向判绿→中间态盘点（token+正锚+CSS/tsx 迁移已毕）→实现者
> 续做关卡面（C-4/B-5/W3）→主控处置 test 8 红（[locked-change] 断言载体
> 迁移）→像素差分八态零带→门链毕→收口。基线推进：用例 1514→1562
> （+48=it.each 语义）/locks 311 不变；registry **0 open/164 done**。

## 0. 开场（三态恢复——下批次首读）

- 预期 **A 态**：HEAD=本交接提交+干净树（收口毕 verify exit=0 亲验+证据
  随档）→直接接 §2 首项。
- B/C 态处置照 AGENTS 既有规约。
- HEAD 链：…85ea665876（F-A10）→3eb778feff（v55 交接）→本交接提交。

## 1. 本段终态（F-CSS-03 一票）

| 票 | 提交 | 要点 |
| --- | --- | --- |
| F-CSS-03 | 本提交 | 颜色 token 化战役收口：50 值（48 新+2 既有消费）驻 :root+正锚；C-4/B-5/W3 三关卡上线存量零命中；八态像素差分 0 带=零视觉差铁证；INV-11 颜色面升格；test 8 红主控 [locked-change] 处置（断言载体迁移+变异锚保活） |

## 2. 挂起项与后续票候选

1. **F-LINT-03 候选（扩容）**：baseline 棘轮 8 组真命中收敛（6 处 import
   重构）+本票门审备案四件：①B-5 扩展面（模块级 style 常量对象+SVG
   presentation attr 颜色字面量均不在 AST 面）②C-4 token 值重复定义守卫
   ③COLOR_RE 双写机器哨兵（check-quality 文本断言比对 eslint.config 正则）
   ④消费点语义锚（误引近似 token 如 --panel-a88↔a90 三层防线均不红）+
   注释历史色值十进规避写法规范（C-4 误伤代价——issue 号 #17561/决策
   RGB 值被清）。
2. **事件层独立票候选**（F-A10 G2）：文本位下探 DOM 态零信号不可修——
   mousedown 命中层方案。
3. **F-A9 观察项**：紧排边界带扩张+快路径每帧 gBCR 性能锚——真机复现
   再立票。
4. **F-UI-01 升级路径**：用户复测若仍观感偏上=光学中心层立新票需在场裁
   位移量。
5. **AGENTS 环境事实节候选**：多行 node -e 坑已三现（v54 §4 预告）——
   下段入册；可并入 argv 换行参数坑（本段 §4 教训 6）。
6. **settings.png 非确定面观察**：probe 八态之一存在瞬态差异带（指纹见
   §4 教训 3）——再现 2 次即立案（e2e 非确定通则）。

## 3. 本段成本账本（§4 口径——模型×供应商分列）

```
主控 GLM5.3（本窗全程）：B 态盘点/基线分项复跑/8 红亲核+12 断言改点亲改
  /门审包拼装 2 次+处置裁决（transparent/延伸清理认可/变异锚保活发现）/
  像素差分 3 轮（build+probe×2+diff×2+crop）/收口九件套
实现者（GLM5.3flash 续做轮）：5.0M tok/57 工具调用/28min——关卡面+红证
  变异 7 支+报告（BLOCKED 正确停手：test 8 红上报 [locked-change] 域）
门一：kimi-main 504×3 退避耗尽→kimi-backup 504×3 耗尽（131K 包超网关窗，
  switches=2）→deepseek 兜底 in=44.5K/out=25.3K/236s（B1+W5+N2——同源
  欠账如实记，B1 经主控核实位闭合）
门二：deepseek in=38.7K/out=29.5K/240s（放行收口有条件——必办三项全毕）
```

## 4. 教训行（本段追加六条）

- **外部审计位材料必须内联 prompt**：ds-call 是纯文本管道零仓库接触——
  「输入四件」引用路径=门一空审一轮（「材料未达」回执）；先例形态=
  f-lint01-gate1-prompt.md 全内联，本段重拼 131K 包毕。
- **Kimi 网关窗对 >100K 审包不可用**：131K 字符包 kimi 两源 504×6 全退避
  耗尽（LINT-01 38KB 实录的放大版）→deepseek 兜底。后果=门一/门二同源
  欠账——处置照 A10 先例：撞限≠作废，主控核实位补位（B1 像素差分闭合
  即实例）+如实申报。后续大 diff 审包要么分片要么预期兜底。
- **probe settings 态非确定指纹**：首采差异带 y=[208,240) x=[32,112)
  （crop 在档 f-css03-settings-crop.png）复采逐字节零差——判别法=
  「颜色回归是确定性的」：两次采集对照，一次差一次同=瞬态非回归。
  再现 2 次立案。
- **管道 exit=$? 假绿再现（主控亲踩）**：`npm run test 2>&1 | tail; echo
  exit=$?` 取到 tail 的 0——正确法=全量重定向落盘后 echo；v55 教训行
  「raw 回读」的后半句同源（取证姿势错=假证据件入库，本段删件重取）。
- **断言载体迁移必须核变异锚**：值迁移票改受锁测试锚时，not.toBe 类
  变异红证锚必须随载体同迁（不迁=翻转变异形态后静默失效）；粒度对账
  用断言数不用用例数（实现者报「8 用例」实际 12 断言改点+1 漏网
  lineage-manual-edit:188——主控预防性扫描兜住）。
- **Git Bash→Windows node argv 丢弃含换行参数**（实现者 §7.8 实录）：
  红证植入首跑无效——单行植入法重做有效；与多行 node -e 三坑同族，
  AGENTS 环境事实节候选合并入册。

## 5. 环境事实滚动

- 基线：**160 文件/1562 用例（1514+48 it.each 展开）/locks 311/e2e 44**；
  registry 0 open/164 done。
- C-4/B-5/W3 上线：新 CSS 颜色字面量（非 --name: 定义行）/tsx inline
  style Literal 色/FS_DECL 多处=即红；COLOR_RE 双文件逐字一致纪律。
- B-5 机器出口范围差（门二 4.2）：「lint 存量零命中」仅证 AST 入口面
  （JSXAttribute style→ObjectExpression→Literal），模块常量对象/SVG
  attr 面靠迁移期清零+人审（扩展面见 §2.1）。
- p7d01-out/baseline 随本票消费毕（A9/A10 视觉修后态→F-CSS-03 迁移后
  零差）；after 态两轮在档（after-run1=首采+after=复采）。
- verify 段序含 build（use electron）——vitest 后跑探针/build 无需手动
  切 ABI（build 自带）；并发 vitest 与 electron 探针仍须串行（v55 教训）。

## 6. F-CSS-03 收口核验单（供追溯）

- 证据桶：红证四支+变异三支+存量四关+终态四关+probe×2+diff/crop+
  门一审包/回执/报告+门二审包/报告+locks apply+closeout verify（全
  raw 含 exit 真值）——scripts/audits/f-css03-*。
- 受锁改面：theme.test.ts+6 测试件+check-quality.mjs+eslint.config.js+
  registry.ts（受锁）——apply 311 同步；invariants.md（docs/ 不受锁）。
- 门二必办三项闭环：①apply 311 ✓②closeout verify raw 真值回读（提交
  信息记录）③像素 raw+crop 归档 ✓。
