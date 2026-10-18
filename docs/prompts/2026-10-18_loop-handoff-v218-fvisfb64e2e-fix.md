# 交接书 v218 —— F-VISFB-64 e2e 挂起攻坚收口（L4 根因修复；深夜场；本笔与修复同链推送）

> 前承 v217（其 §1-5「v217 未推送、修复同链推送」由本笔兑现）。用户裁决沿承
> （2026-10-18 22:50 逐字）「我直接让kimi和deepseek一起排障」——本场=kimi
> 拟定+deepseek 对抗审双源攻坚+主控终裁承接（v217 §1-3 授权面）。

## §0 本场总账（runId=20261018-fvisfb64e2e）

- **根因（L4，实证链完整）**：`installQuitCloseInterception` 的 `teardown()` 在
  'closed' 回调内调 `win.removeListener`/`win.webContents.removeListener`——窗已
  销毁→同步抛 `TypeError: Object has been destroyed`→主进程未捕获异常→Electron
  原生 Error 对话框（Ok 无人点）→e2e 挂死/CI 57min 超时/僵尸进程。竞态面=
  disposed 守卫先行置位与否（解释全部概率性：空库 close 6.7s/139s、quit 直调
  4.2/13.9/27.5s、数据态 30s 挂/1.8s 过）。**证据链**：spec 旁路取证（窗口清单
  仅「Error」框+threads=39/poll）→错误框截图转写（栈=reportQuitFlush→receipt→
  destroyWindow→closed→windowDestroyed→disposePolicy→teardown）→全档案在
  `/home/yyx/synapse-archive/scripts-audits/20261018-fvisfb64-impl/`
  （probe5v2/spec-forensics/error-shot/verify-fix 四脚本+日志+截图）。
- **修复（4+1+1 笔）**：`facfe3c6`+`bb6ba98f`（src：接口 isDestroyed 补形+
  teardown 双守卫——win 亡整跳/wc 独亡 win 侧照拆+wc 侧跳过）；`98c43e33`+
  `3221dc38`+`09b3c39e`（tests [locked-change]：fake 建模 Electron 销毁语义+
  三格红例[win 亡零触摸/wc 独亡/活窗全拆]+timer 零锚+d1-W1 第三针实录[不可观测
  ——机理=policy clean 路径先行清臂+quitPolicy 死引用良性，测试债注在档]）；
  `f0a60714`（lineage T3 closeMain 双态吞拒——**64 批测试自身竞态缺陷**：确认态
  即时退出与 evaluate 往返竞态断供「Target closed」，断言面不变）。
- **验证矩阵**：export-clipboard spec×3=rc0/7.6s/Error 框采样 0/残留进程 1s 净退
  （**L2 管道滞留形绝迹=归并 L4，看门狗 C2 无据不立项**）；全量本地 e2e
  =**135 passed+T3 修复后定向绿（17.3m，零挂起——对比修复前 120s×3+CI 57min）**；
  `npm run verify` EXIT=0 亲验（含 locks 525）。
- **对抗链**：三段通道完链两轮——kimi 拟定（分灶模型+修法候选，32978tok）→
  deepseek 审（B10/W7/N3 返工裁决——B5「第四可能」要求直接引导 L4 发现）→双岗
  回炉（L4 重映射+双守卫条件）→executor 两轮+主控第三小轮→门一双审 k1
  （B0/W1/N4 PASS）+d1（B0/W1/N6 有条件放行——四条件全偿：W1 锚+针/N1 防御面
  定性=生产零外部 dispose 调用/N3 quitPolicy 读点全 ?. 空安全/N5 manifest 两笔
  各自携带实证）。
- **追加（首 CI 回执驱动的 seam 批，416423bb+a396e764）**：push 后 CI run
  39141915828=e2e 步红（134 passed+1 flaky+**零用例终败**——步红根因=ai-budget
  E4 首试 90s 超时〔CI 慢机 flaky，重试过〕后 **worker teardown 的 app.close()
  撞脏态 C 确认框无人点击→teardown 90s 挂**「error not part of any test」）——
  C 框无人值守面在 teardown 路径现身（测试内 dialog 桩救不了 teardown）。主控
  终裁落 **v217 §1-3 授权方向① e2e seam**：bootstrap confirmQuit 加
  SYNAPSE_E2E_QUIT_AUTOCONFIRM=1 分流（生产不设 env=零行为变化）+e2e-env
  launch 默认注入+lineage T3 单点退出（cancel 态真路径）+T3 closeMain 竞态吞拒
  （f0a60714）。定向验证：T3〔seam 退出版〕9.6s 绿+export-clipboard〔seam 默认〕
  7.4s 绿+verify EXIT=0 复验。

## §1 新会话开工序

1. **CI 回执核验**（本笔 push 的 run——§4）：e2e 步预期 <20min（本地 17.3m 含
   深夜并行负载；CI windows-latest 无挂起面）。若 e2e 红：按 FLK 台账口径分诊，
   T3/export-clipboard 同指纹复现=立案（修复面回归信号）。
2. 白天窗全量本地 e2e 复验一次（deepseek W4 验收门——本場为深夜窗数据）。
3. C 态确认框无人值守面立票（§2 呈批①裁决后）。

## §2 待用户面（呈批）

1. **C 态确认框无人值守面——e2e 面已由 seam 根治（方向①落地，§0 追加段）**；
   **剩余呈批=生产语义面**（kimi/deepseek 双源一致呈报）：慢机真实用户也可能
   被 1000ms clean 窗的迟到回执误弹确认框（生产语境体验面，非测试面）。选项：
   ①维持现状（生产零改动——主控推荐，慢机误弹属低频体验面）；②握手语义修订
   （迟到 clean 回执自愈/窗宽自适应——设计修订链+门审回炉+快照时效方案
   〔deepseek B3 数据丢失关切必须先解〕）。裁决前不立项。
2. 治理沿承：teardown 无条件段不变量（timer+引用清不论销毁态必经；死引用良性）
   登记 docs/invariants.md——随下批顺手（非独立票）。
3. ai-budget E4 CI flaky（首试 90s 超时重试过，run 39141915828）——单现
   observing（FLK 台账口径；非确定失败单现→复跑定绿；再现有同指纹即立案）。

## §3 治理注记（本场增量）

1. **双开工会话互扰教训**（今晨 06:00 任务 8 轮空等实录）：占用检测须三分
   （活跃/悬置残留/空闲）+开工锁互斥——完善版开工提示词 v2 已落档
   `/home/yyx/synapse-archive/scripts-audits/20261018-fvisfb64-impl/kickoff-prompt-v2.md`。
2. **进程滞留取证组合拳定型**（dossier §3-3 补强）：窗口清单采样（wmctrl——
   原生 Error 框直证）+/proc threads/wchan/fd 形态+旁路 shell 轮询（不依赖 PW
   自身超时）——四脚本可直接复用（同 §0 档案目录）。
3. 深夜窗全量 e2e 判读实录：17.3m/135+1 零挂起——环境级 FLK-02/03 未现（本夜
   样本），沿承白天权威口径不变。
4. 探针脚本自含竞态笔误教训（probe5 v1 setTimeout().then TypeError）——探针
   也要「先跑一条用例预演」（仪器化纪律 §3-1 同族）。

## §4 CI 回执

- run 39141915828（首 push 877b4ad7）=**failure**——e2e 步红定性=teardown 脏态
  C 框挂面（§0 追加段），非修复回归（零用例终败+134 passed）；处置=seam 批
  （416423bb/a396e764）+本笔重推。
- 本笔 push（seam 批+v218 修订）→ 新 run **待核验**：e2e 步绿即闭账（预期
  全绿；若 ai-budget E4 再 flaky 且 teardown 不再挂=seam 生效佐证）。**未核验
  不得翻 done**——收口会话或下场首动作补 conclusion。

## §5 沿承挂账

v217 §2/§5 全量沿承（31/62/64 呈裁位+W-08+L 系）；v216 §5 除「e2e 挂起移交」
条外沿承（本笔销项）。批档=仓外 20261018-fvisfb64-impl（本场新增：probe5×2+
spec-forensics+error-shot+verify-fix 四脚本与日志+错误框截图+kimi/deepseek 两
轮输出全文+gate 双审输出）。
