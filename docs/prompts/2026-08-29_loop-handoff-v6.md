# 2026-08-29 LOOP 交接文档 v6——R2-LIB1/R2-UI1 收官+新工单池刷新

> 定位：v5 执行序第 1 单（LIB1）+用户补充需求单（UI1）同场收官。
> 基线不变：verify 107 文件 890 用例 / e2e 26 / locks 166（Node 24 口径）。
> 本轮提交：`e7e0db58`（LIB1）+ `540a20b0`（UI1）。

## 1. 本轮收官两单

### R2-LIB1 文献卡网格行间空白带（v5 §2#10，应急微票）
- 修值：`library.css` `grid-auto-rows: 1fr`→`minmax(190px, auto)`
  （U4 回归实锤：1fr 在 h-full 定高滚动容器把视口高平分给各行）。
- ⑤f 真机量化：真实库副本 default 课题 8 卡=4 行、行高全 190px、
  **行间距恒 12/12/12px**（`scripts/audits/r2-ui1-out/r2-ui1-forensics.json`
  grid 段 + S7 截图，视觉评审「紧凑均匀无拉伸」过）。U4 空态无背书缺口补上。

### R2-UI1 课题切换钮可见性+渐变动画+按压反馈（用户补充需求，微票）
- **病灶真因**（比 v5 台账更进一步）：R2-SH2 把切换器迁白顶栏后触发钮仍用
  夜面色——米白字 `#efe9da` 贴白底 ≈ 不可见；且 `borderColor` 内联值无
  `border` 宽度类=**边框根本不渲染**（borderColor 单独存在画不出边框）。
- 修法：新件 `features/workspaces/workspace.css`（冷色调 accent 墨青蓝实
  边框+syn-pan-x 流光+ws-pop 面板入场+条目/字段全链）；Switcher 内联皮肤
  迁类（**B1 语义第三次实证**：内联恒压类选择器，hover/active 挂类才生效）。
- 渐变动画词汇：theme.css 共享 keyframes `syn-pan-x/y`——nav 右缘金线
  220% 缓移+active 金条 300% 微光+primary CTA 渐变底 hover 流动
  （theme.test.ts 三锁断言原文保持：inset .45/clip-path/hover .7）。
- 按压反馈（游戏钮语义=色变+微缩+下沉/内阴影）：syn-btn 四变体+
  nav-item+lib-chip+lib-card+lineage 工具条 `:active` 全族；transition
  族同步补（按压是过渡不是跳变）。`prefers-reduced-motion` 关常驻流光。
- 真机取证：computed 全链（border/animation/按压 matrix+brightness）+
  8 帧截图+视觉评审三连过（钮清晰可见/面板白底冷蓝边/网格紧凑）。

## 2. 开工自检增量（对 v5 §1 的修订）

- **视觉通道升级**：Read 本地 PNG→CDN URL 后 `analyze_image` **本次可用**
  （S2/S3/S7 三连成功——v5「反斜杠 CDN URL 签名失败 400」本轮未复现）。
  下次仍以 computed 转储为主、视觉评审为辅，但通道不必预设已死。
- **Node 25 坑复证**：本机默认 node v25.2.1 下 verify 必 11 红
  （split-pane `localStorage.clear is not a function`——Node25 webstorage
  泄漏进 jsdom）；git stash 干净树同红=环境红定责法。**一切命令前缀
  `export PATH="/d/nodejs24:$PATH"`**（DEV-SETUP 表已录，2026-08-29 双实录）。
- 真实库副本取证配方：`SYNAPSE_USER_DATA` 指向 temp 副本，只拷数据面
  （workspaces/ai-sensor/settings.json/workspace.json/window-state.json，
  Cache 系可再生不搬）——比 f5b 全量拷轻。脚本先例：
  `scripts/audits/r2-ui1-forensics.mjs`。

## 3. 新工单池（v5 §3 执行序刷新——前两步已走）

1. ~~R2-LIB1~~（✅ e7e0db58）
2. ~~R2-UI1 用户补充需求~~（✅ 540a20b0）
3. **R2-F-11**（取证先行）：标注/选区矩形相对文本下偏量化取证器
   （annotation-rect vs text span rect 差值转储）→定值修复；
   **R2-F-10**（选中叠深：selection alpha 0.30→0.15~0.20 实验定值）+
   **R2-F-12**（工具条拖选位移阈值——LineageCanvas DRAG_THRESHOLD 同型）
   可并 F-11 一役（阅读器三连，F 系修正役第 4 轮）。
   ⚠ 受锁面预警：reader-text.spec 是锁定文件，F-10 改 ::selection 色值
   可能触碰三处 rgb(0,0,0,.30) 断言（F-08 先例：[locked-change]+locks 舞步）。
4. **R2-SH3** frameless 标题栏合并（bilibili 式，中票三屋）。
5. **R2-SET1** 字体大小（先探 px 消费面）。
6. **U2'** 脉络案册（§4 三候选出用户选——v5 §4 原文续存）。

## 4. 遗留池增补（本轮教训）

- `borderColor` 无 border 宽度类=边框静默不渲染（类同 B1 家族：属性存在
  ≠生效，层叠/简写缺省位都是静默杀）。回流候选：皮肤类变更 lint 面
  「border-color 无 border-style/width」不可机检，靠评审问一句。
- 微票拆提交的外科手法：同文件双票 hunks=文件备份法（cp 全量→回退他票
  hunks→commit→cp 回填→diff 确认 IDENTICAL）——避开 git add -p 交互禁用。
- R2-UI1 未入 registry（U4 微票先例：压缩路径无 registry 条目）；
  check-tickets 只校验 SR2?-\d 形态条目，无冲突。

## 5. 成本与档案

- 本轮（v5→v6）：LIB1+UI1 全周期（含 Node25 定责 stash 对比+取证器两跑）
  ≈主控单会话完成；无子代理派发（两票均微票·主控直做口径）。
- 档案：`scripts/audits/r2-ui1-out/`（9 件证据：json/raw.txt/8 帧 PNG
  其中 S7 随 LIB1 提交）+视觉评审三连记录（本文件 §1）。
