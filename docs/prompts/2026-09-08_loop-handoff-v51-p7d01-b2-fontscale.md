# 2026-09-08 LOOP 交接 v51——P7D-01 批二字号六档毕（在场轮）+§6.2 口径切换首用+第 14 处耦合族捕获实录

> 上段=v50（F-A8-G3A 取证+池尽收束）。本段=用户「指引我裁决」开场→
> 裁决面全景+主项路由（批二/INV-11/门 3 解锁三选一）→批二全链毕。
> 基线推进：**156 文件/1543 用例（1450+93）/locks 286/e2e 43**。

## 1. 本段终态

| 项 | 数值/结论 |
| --- | --- |
| 用户裁决 | 四问全落推荐案（AskUserQuestion 零异议）：6 档刻度/10.5→11/半值四项全按推荐/15→14——裁决档 docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md+mockup 六面板（docs/design/mockups/p7d01-b2-fontscale.html,100%+2× 放大条） |
| P7D-01 批二 | **毕**（cc692d176e,48 文件）——六 token（micro 10/caption 11/body 12/strong 13/title 14/display 17）+30 处硬编码替换+tailwind 156 处经 v4 @theme 重绑零逐处改写+theme.test 93 新用例（先红 27）+INV-61 字号单源登记 |
| §6.2 口径切换首用 | 探针 COMPARE FAIL=**预期红**（13+2 处值变化）;定向验收三件套=像素差分带对位（16px 块网格,变化带恰落预期组件区无意外区）+crop 目检 0 可见差+DOM 计算样式断言 13/13（六 token+变化组件+@theme 重绑真机生效） |
| 第 14 处耦合族 | **主控 E-3 注释清理时捕获,门一/实现者均漏**——edge-label 盒高族（max-height 37.05px×CSS+EDGE_LABEL_H+LH 12.35+双测试锚）:字号 9.5→10 后 3 行 39px>37.05px=截断行为差;回炉一轮 8 处全迁+回炉二轮估宽基准 9.5/4.75→10/5 随迁（防重叠碰撞盒语义主控裁非纯容差;夹具 hw 50→52 适配断言零放宽亲核） |
| 门审 | 门一 Kimi K3 PWW W4/N13（W 全处置:C-2C-3 负锚升级增强单候选——正则全域「任意数字 font-size 声明归零」不阻塞本票）;门二 GLM5.3 同源欠账如实记 **PASS 无条件**（verify 1543 EXIT=0+DOM 断言复跑 13/13+变异 --fs-body 恰 1 红还原空+耦合族唯一性扩大口径独立复核） |

基线衔接：1450→1543=批二 93 新用例（TOKENS 6+FS 矩阵 84+tsx 形态 2+@theme 1）;locks 286 不变（五受锁件 sha 更新）;e2e 43 不变。

## 2. 下段执行序

1. **F-A8 门 3 收口票（观察期——真机使用后）**：本段用户在场但未真机使用
   （裁决面=AskUserQuestion/mockup 非日常阅读）;五项清单 v46 §2-1,项⑤
   =G3A 已落档;开放项三件转门 3。
2. **被动观察/备案池**：F-ARCH4-M1（多场零现）;outbox 期二;F-R3;
   **INV-61 负锚升级增强单候选**（门一 C-2C-3——正则全域归零+去分号
   依赖,小票）;INV-11 lint 机器化设计票（用户裁决优先级——本段未选）。
3. 探针工具增强候选（本段实操暴露）：像素差分带定位器（temp .cjs 配方
   在档 /tmp 不可复用——配方=d4 脚本块网格 16px/TH6/cnt≥4+file:// 原源
   goto+--allow-file-access-from-files 三坑）可固化为 scripts/audits 工具
   （§6.2 后续视觉票复用面）。

> 停止条件：①池尽（批二毕后仅剩条件项——门 3 需真机使用、增强单候选
> 与 INV-11 需用户裁决优先级）;在场窗口若延续,可裁决 INV-11/增强单。

## 3. 本段成本账本（续 v50 §3）

```
P7D-01 批二：实现者 GLM5.3flash 三轮（首证 2.16M tok/11.4min+回炉一
  1.84M/4.2min+续命 0.97M/3.1min）;门一 Kimi K3（ds-call 链）约
  in 9k/out 11k;门二 GLM5.3 同源欠账（deepseek 平台未配置）1.94M
  tok/14.6min;主控 GLM5.3：裁决案册/mockup/四问路由/两自裁追认/E-3
  清理+耦合族捕获/§6.2 三件套验收（像素 diff 三坑调试+DOM 断言探针）/
  探针 seed 崩溃诊断（out/ 坏中间态 rebuild 闭环）/registry+交接书
```

## 4. 教训行（本段追加——v50 §4 之续）

- **字号类票面必须显式清点「字号→行高→盒高」派生链**（批二实录）：
  max-height/碰撞盒常量/估宽基准与字号字面量耦合时,字号替换后派生值
  不同步=静默行为差（3 行截断+悬停滚动提前触发）——门一负锚只扫
  font-size 声明拦不住;**清点法=grep 行高系数（×1.3 等）+盒高字面量
  （非整数值如 37.05 即派生痕迹）+估宽基准**。E-3 注释失实反而是
  线索源——注释里的公式暴露了耦合。
- **§6.2 定向验收三件套=可复用验收范式**（批二首用定稿）：①像素差分
  带对位（块网格定位器——变化带须逐带归属预期组件区,意外带=回炉）
  ②crop 目检（变化区 0 肉眼可见意外差——亚像素重排噪声与真缺陷的分界）
  ③DOM 计算样式断言（变化组件 computed 值=裁决锚值——最硬一环）。
  COMPARE PASS/FAIL 的二值口径在改值票面失效,三件套替代。
- **Playwright 像素 diff 三坑**（批二调试实录）：about:blank 加载 file://
  图片静默挂死（onload 永不触发）→须 goto file:// 原源页;file:// 页
  canvas 被污染（opaque origin）→须 --allow-file-access-from-files;
  中文路径 file URL 须 pathToFileURL 编码。逐像素双循环（1280×800）单
  evaluate 不可行——16px 块网格+步进 2 秒级。
- **electron seed 崩溃「browser has been closed」先查 out/ 产物态**（批二
  探针两次崩溃实录）：实现者 verify 的 build 与主控探针 launch 并行时
  out/ 可处坏中间态——最小 launch 复现+npm run build 重跑即恢复,非
  代码缺陷勿误归因。
- **同构复算型测试对值迁移不设防**（回炉二轮实录）：edge-label-layout.
  test 用实现常量 LH 复算期望——常量改期望自动跟随,值漂移无锚;绝对值
  锚（lineage-canvas:462）才是防线。同构复算=文档不是测试,关键常量
  需至少一处绝对锚（门二增量复核确认）。

## 5. 环境事实滚动

- 基线：**156 文件/1543 用例/locks 286/e2e 43**;registry 1 open
  （F-A8）/153 done。
- tailwind v4.3.3 @theme 重绑实证可用（--text-xs: var(--fs-body) 编译
  链经 vite build+真机 DOM 双验证）——后续 token 轴（若有）同配方。
- 像素差分定位器配方在档（见 §2-3）;探针 sweeps 无 font-size 维度
  （transition/zIndex only）——字号票的 DOM 面须补断言探针（b2-fs-assert
  .mjs 配方,驻 temp 已失,断言清单在 gate2 包可重建）。
- 沿用 v50/v49/v48 各条。
