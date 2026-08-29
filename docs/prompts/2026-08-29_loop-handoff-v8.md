# 2026-08-29 LOOP 交接文档 v8——R2-SH3 frameless 标题栏收官

> 定位:v7 后半场。SH3(中票三屋)全收官。**新基线:verify 108 文件
> 904 用例 / locks 171 / e2e 27**(v7:107/893/169/26)。
> 本轮提交:见 git log(SH3 原子提交 [locked-change])。

## 1. R2-SH3 收官档案

- **方案**(v5 决1 用户令「顶栏与系统三键合并,bilibili 式」):
  `titleBarStyle:'hidden'`(main-window.ts,WINDOW_SECURITY_FLAGS 面零
  触碰)+自绘 caption 三键 `TitleBarControls.tsx`(三键 aria:最小化/
  最大化↔向下还原/关闭;10px stroke 图标,禁新依赖)挂 App header 右区
  (版本号 margin-left:auto 后,三键最右)。
- **IPC 单通道四 action**:`system/window-control`(minimize /
  maximize-toggle / close / get-state),close 走 win.close() **绝不
  destroy**(保 TABS-04 dirty 拦截链——quit guard 接缝门一 E3 核过);
  maximize 态推送=`system/window-state/event` 事件+preload 桥
  onWindowState;初值 get-state 拉取(时序自包含,主控预裁)。
- **drag/no-drag**:整条 .app-header=drag(双击空白=Windows 原生最大化
  /还原,零代码);.app-header-switcher 与 .titlebar-controls 两容器
  no-drag。取证实证 computed 三值+workspaces.spec 回归绿(免费防线成立)。
- **三屋**:实现者(TDD 首红 11 failed|893→绿 904,变异红证四方向,
  自裁 8 项)→门一 23B/2W/10N 可收口→主控直修 2W+G1(C1 get-state 应答
  函数式 setState 关乱序覆盖窗/C5-C6 theme.css 联动注释/G1 头注张力)→
  门二放行(漂移恰好=三处主控修,无第四处)。
- **真机取证**(r2-sh3-forensics.mjs 无头):computed app-region 三值 /
  aria 切换 / isMaximized true→false / close hover rgb(232,17,35) /
  44px 贯通热区(取证驱动修 align-self:stretch——初测 10px 病灶)。

## 2. 收口验证与 flake 记录

- verify exit=0(108 文件 904 用例,r2-sh3-verify.raw.txt);locks
  169→171(window-control.test.ts+forensics.mjs 扫入);e2e **首跑 26+1
  红**→单跑绿→全量复跑 **27/27 exit=0**(r2-sh3-e2e2.raw.txt)。
- **P7-A 剪贴板用例 flake 定性**(证据链):首跑读到系统剪贴板残留
  「2026-08-29_loop-handoff-v7.md」(用户手工复制的文件名,非应用写入
  =ctrl+c 异步写入与 clipboard.readText 的全局资源竞态);单跑即绿;
  本票 diff 19 文件零触碰 reader/剪贴板面;同链路 P7-C(selectText+
  toolbar)首跑即过。结论=环境级竞态非回归;若再现,处置=该用例读前
  重试一次(受锁改动走 [locked-change],未到必改线)。

## 3. 遗留池增补(门一 E4/E5)

- **E4**:maximized 态关窗,saveBounds 存最大化 bounds→下次启动恢复
  大窗但非 maximized 态(既有怪癖;本票双击最大化路径使其更易触达)。
  候选修法=close 时 isMaximized 则存 restore bounds(后续票)。
- **E5(SET1 票面预裁引用)**:zoom 若挂根容器将等比放大自绘 caption
  (44px 热区随 zoom 变大,与系统「caption 不随 zoom」惯例相悖;
  margin-right:-12px 对冲随 zoom 等比仍贴缘)。SET1 开工须裁决 caption
  zoom 豁免面(决策③原文「PDF 画布是否跟随开工时实证」同批)。
- multiply 叠色物理上限/v7 §4 两条原样有效。

## 4. 新对话执行序(v7 §3 刷新——SH3 已走)

1. ~~R2-SH3~~(✅ 本场)——⚠ 真机用户复测面:**Windows 三键 hover/press
   观感与系统一致性+双击顶栏空白最大化/还原+关闭键 dirty 拦截弹窗**。
2. **R2-SET1** zoom 三档(小 100%/中 110%/大 125%,根容器 zoom;PDF
   canvas 跟随性实证定豁免面;**E5:caption 豁免裁决一并做**)。
3. **U2' 脉络落地**:B 确认条+让位布局+美观 mockup(先 mockup 供用户审
   ——L6 ⑤c)+换行红线逐面核查(节点标签/侧板/AI 笔记)。
4. 复测邀请:SH3 三键面+F 三连+UI1+LIB1(合并一批)。

## 5. 成本与档案

- 本场(v7→v8):主控(票面/派发/2W+G1 直修/收口)+实现者子代理
  7,139,381 tok/111 工具调用/23.3min+门一 1,175,442 tok/28/8.6min+
  门二 241,957 tok/16/3.9min(三屋标准配置)。
- 档案:scripts/audits/r2-sh3-*(票面/开工/实现报告/门一二审档/diff 包/
  14 份 raw 证据/out 四件)+locks manifest 171。
