/**
 * [F-LAYER-01] settings 下沉 services——立案骨架（票面载体）。
 *
 * 目标：消掉全仓唯一分层破口——ipc/settings.ts 在 ipc 层写业务（裁决 6
 * 域归位战役群四项之一）；业务逻辑下沉本件，ipc 层回归薄分发。
 * 红线：分层单向 ipc→services→repos→db 不破；随票落 L1 锁线——
 * eslint 新红线 src/main/services、src/main/db、src/shared 禁
 * import 'electron'（把「core 可抽包」既有事实升为机检；eslint.config.js
 * 受锁——unlock→改→apply 单链 [locked-change]）。
 * 裁决与排程序：docs/design/2026-09-18_complexity-governance-ruling.md
 * 裁决 6/§3 梯队四/§4 L1。排期=F-GEOM-01 后；实现者领票时本骨架改写为真实现。
 */
export {}
