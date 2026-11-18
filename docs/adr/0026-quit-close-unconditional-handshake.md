# ADR-0026：关闭入口无条件握手化

日期：2026-10-18 · 状态：已裁决——已落地（quit-close-policy 状态机+取消安全网现行，INV-22）

## 背景

先行退出握手以 main 侧 dirty 缓存为**放行闸**：clean 缓存的 close 直接放行
默认关闭。但 dirty 经「组件 effect→App render→IPC push」多跳在途窗内关窗
时缓存仍 clean（渲染繁忙时窗可拉宽数百毫秒），影响面=tab/lineage/
noteDraft 一切 dirty 源。另有两条并存缺陷：查态后回执前用户写无因果序
保证（回执新鲜性）；closing/busy 挂起时取消后可能永冻（取消可恢复性）。

## 候选

- **乙（clean 短宽限+超时静默销毁）**：否决——即使叠加 α 仍保留「旧
  dirty 尚未保存且无回执」的静默丢稿面（α 对乙是必要非充分）。
- **γ（接受回执新鲜性问题至 destroy 无固定上界调度窗）**：否决——须
  用户显式接受，呈裁位维持（设计单源 §⑧ 开放问题三项不阻塞）。
- **β（editSeq 版本纪元）**：否决——须改既有 payload，协议与测试成本
  高于同步 gate（设计单源 §⑪-1）。

## 裁决（五要素）

1. **无条件握手**：close 一律 preventDefault+发起 quit-flush；仅「当前
   requestId、未过 deadline、因果新鲜的 clean 回执」或用户显式确认可
   授权 destroy。缓存只决定等待分级（丙形态：clean=QUIT_CLEAN_GRACE_MS
   1000ms／dirty=QUIT_FLUSH_TIMEOUT_MS 5000ms；WC 内 dirty push 升级 WD
   截止恒 t0+5000、WD 不降级；超时只确认不静默销毁）。状态机拆件
   main/windows/quit-close-policy.ts（I/WC/WD/C/D × 八类事件，纯 TS 零
   Electron import，now()/effects 注入）。
2. **同步 closing gate**（α 修法）：renderer 模块级同步单例布尔
   （app/quit-closing-gate.ts，禁 React state）；四写源五件挂点在
   enqueue/store 变更/句柄修改之前同步检查（notes.store/tab-dirty/
   lineage.store/lineage-note-draft/annotation-draft-registry）；flush
   内部清理动作经 runQuitInternal origin 豁免防自锁（豁免域=同步域、
   不跨 await——跨 await 的清理链在命中闸点的同步调用处就地包裹或经
   统一清理路径）。
3. **缓存仅分级**：dirty 缓存=分级等待判定源，非放行依据（INV-22 尾句
   改写；聚合公式与 push 链零改）。
4. **abort+orphan 取消安全网**（A/B 双层）：A=新事件 quit-flush-abort
   {requestId}（C→I 用户取消时发；epoch 水线=requestId 数值比较，迟到
   abort 不误伤后续关闭序列；api-surface/shared schemas/preload/bridge
   四面 [locked-change]）；B=bridge 最晚 QUIT_FLUSH_TIMEOUT_MS 有界复位
   兜底。busy∨orphan-pending 期间新帧立即回执 true（不并发四步）；旧
   epoch 未 settle 转 orphan-pending 且禁止回 false；orphan settle 后
   late-write-wins 重聚合，全清才恢复新 flush。
5. **app 退出统一路由**：窗口 close 保持唯一活入口；window-all-closed/
   before-quit 幂等 shutdown 与 app.exit 唯一调用者（index.ts:29 启动
   失败径）维持不变；未来新增 app 级退出入口应路由 win.close()。

## 后果

- main-window.ts 退出段退役删除（quitDirtyGuard/
  handleCloseWithQuitGuard/createQuitFlushRequest/awaitQuitFlush/
  handleCloseWithQuitHandshake/QUIT_FLUSH_TIMEOUT_MS 本地常量与
  getQuitDirty 活 getter），458→410 行；装配收敛为
  installQuitCloseInterception（端口与订阅）。
- QUIT_FLUSH_TIMEOUT_MS 自 main-window.ts 迁出+QUIT_CLEAN_GRACE_MS
  新增，双双上移 src/shared/constants.ts（bridge 兜底需 renderer 侧可
  读，单源禁复制）；事件通道 6→7 面（+system/quit-flush-abort/event）。
- 受锁测试改写：quit-dirty-guard/quit-handshake（clean 放行断言→握手
  断言=契约变更，test-surface 豁免在档=设计稿 §⑪-6；预批家族=clean
  直放退役契约变更全族，含 quit-dirty-guard 旧 8 用例）；新增
  quit-close-policy（26 用例）与 quit-flush-bridge（18 用例）
  always-active。
- 回退路径：仅丙→甲（grace 常量切换一行）；α 与取消安全网不得一并
  拆除；异常保守降级=禁 clean 自动销毁、统一确认，**非恢复 clean
  直放**。
- 繁忙恢复时长分布的参数证据缺口接受：e2e 观察误报率，频繁误确认→
  grace 调 2000 或回退甲（一行常量）。
- 设计单源=docs/design/2026-10-18_f-visfb64-design.md（态表/清理表/
  事件源所有权表/测试清单/拆件预算/§⑪ 终裁记录）｜INV-22（尾句改写+
  写源治理条款；INV-141/150 不触）｜INV-91（lineagePending 缓存保留
  面）｜前史=先行退出握手三件套（本 ADR 取消其 clean 直放面）。
