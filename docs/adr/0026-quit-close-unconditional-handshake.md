# ADR-0026：关闭入口无条件握手化

日期：2026-10-18 ｜ 票：F-VISFB-64 ｜ 状态：accepted（验收=本批 verify 全绿+门审；
设计单源=docs/design/2026-10-18_f-visfb64-design.md 终稿 v1.2+§⑪ 终裁八项——
三段通道完链 drafter 三轮+auditor 两轮+GLM 终裁，修订记录注 F-VISFB-64）

## 背景

F-VISFB-14 的退出握手以 main 侧 dirty 缓存为**放行闸**：clean 缓存的 close 直接
放行默认关闭。但 dirty 经「组件 effect→App render→IPC push」多跳在途窗内关窗
时缓存仍 clean（k1 轮 2 W-1≡d1-N7 同族；渲染繁忙时窗可拉宽数百毫秒），影响面
=tab/lineage/noteDraft 一切 dirty 源。另有两条并存缺陷：④查态后回执前用户写
无因果序保证（回执新鲜性）；closing/busy 挂起时取消后可能永冻（取消可恢复性）。

## 决策（五要素）

1. **无条件握手**：close 一律 preventDefault+发起 quit-flush；仅「当前
   requestId、未过 deadline、因果新鲜的 clean 回执」或用户显式确认可授权
   destroy。缓存只决定等待分级（丙形态：clean=QUIT_CLEAN_GRACE_MS 1000ms／
   dirty=QUIT_FLUSH_TIMEOUT_MS 5000ms；WC 内 dirty push 升级 WD 截止恒
   t0+5000、WD 不降级；超时只确认不静默销毁）。状态机拆件
   main/windows/quit-close-policy.ts（I/WC/WD/C/D × 八类事件，纯 TS 零
   Electron import，now()/effects 注入）。
2. **同步 closing gate**（α 修法）：renderer 模块级同步单例布尔
   （app/quit-closing-gate.ts，禁 React state）；四写源五件挂点在 enqueue/
   store 变更/句柄修改之前同步检查（notes.store/tab-dirty/lineage.store/
   lineage-note-draft/annotation-draft-registry）；flush 内部收口动作经
   runQuitInternal origin 豁免防自锁（豁免域=同步域、不跨 await——[回炉 B1]
   收窄：跨 await 收口链在命中闸点的同步调用处就地包裹或经收口核心路径）。
3. **缓存仅分级**：dirty 缓存=分级等待判定源，非放行依据（INV-22 尾句改写；
   聚合公式与 push 链零改）。
4. **abort+orphan 取消安全网**（A/B 双层）：A=新事件 quit-flush-abort
   {requestId}（C→I 用户取消时发；epoch 水线=requestId 数值比较，迟到 abort
   不误伤后续关闭序列；api-surface/shared schemas/preload/bridge 四面
   [locked-change]）；B=bridge 最晚 QUIT_FLUSH_TIMEOUT_MS 有界复位兜底。
   busy∨orphan-pending 期间新帧立即回执 true（不并发四步）；旧 epoch 未
   settle 转 orphan-pending 且禁止回 false；orphan settle 后 late-write-wins
   重聚合，全清才恢复新 flush。
5. **app 退出统一路由**：窗口 close 保持唯一活入口；window-all-closed/
   before-quit 幂等 shutdown 与 app.exit 唯一调用者（index.ts:29 启动失败径）
   维持不变；未来新增 app 级退出入口应路由 win.close()。

## 备选否决

- **乙（clean 短宽限+超时静默销毁）**：否决——即使叠加 α 仍保留「旧 dirty
  尚未保存且无回执」的静默丢稿面（α 对乙是必要非充分）。
- **γ（接受④至 destroy 无固定上界调度窗）**：否决——须用户显式接受，呈裁位
  维持（§⑧ 开放问题三项不阻塞）。
- **β（editSeq 版本纪元）**：否决——须改既有 payload，协议与测试成本高于
  同步 gate（终裁 §⑪-1）。

## 后果

- main-window.ts 退出段退役删除（quitDirtyGuard/handleCloseWithQuitGuard/
  createQuitFlushRequest/awaitQuitFlush/handleCloseWithQuitHandshake/
  QUIT_FLUSH_TIMEOUT_MS 本地常量与 getQuitDirty 活 getter），458→410 行（回炉轮后实测）；
  装配收敛为 installQuitCloseInterception（端口与订阅）。
- QUIT_FLUSH_TIMEOUT_MS 自 main-window.ts 迁出+QUIT_CLEAN_GRACE_MS 新增，
  双双上移 src/shared/constants.ts（bridge 兜底需 renderer 侧可读，单源禁
  复制）；事件通道 6→7 面（+system/quit-flush-abort/event）。
- 受锁测试改写：quit-dirty-guard/quit-handshake（clean 放行断言→握手断言=
  契约变更，test-surface 豁免终裁预批=设计稿 §⑪-6+2026-10-18 主控补明裁
  〔预批家族=clean 直放退役契约变更全族，含 quit-dirty-guard 旧 8 用例〕）；
  新增 quit-close-policy（26 用例）与 quit-flush-bridge（18 用例）always-active。
- 回退路径：仅丙→甲（grace 常量切换一行）；α 与取消安全网不得一并拆除；
  异常保守降级=禁 clean 自动销毁、统一确认，**非恢复 clean 直放**。
- W-08 参数证据缺口（繁忙恢复时长分布）接受：e2e 观察误报率，频繁误确认→
  grace 调 2000 或回退甲（一行常量）。

## 关联

- 设计单源=docs/design/2026-10-18_f-visfb64-design.md（态表/清理表/事件源
  所有权表/测试清单/拆件预算/§⑪ 终裁记录）｜INV-22（尾句改写+写源治理条款；
  INV-141/150 不触）｜INV-91（lineagePending 缓存保留面）｜前史=
  F-VISFB-14（退出握手三件套——本票取消其 clean 直放面）。
