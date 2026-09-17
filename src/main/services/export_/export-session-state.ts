/**
 * [F-EXPORT-01] corpus.export 拆件——立案骨架（票面载体）。
 *
 * 目标：导出会话状态机（六态：idle/preparing/streaming/finalizing/done/
 * failed——「五件套」指产物数非态数）外提本件独立+IO/事件协议分离（用户
 * 裁决选提前主动拆，原触发线作废——裁决 6 域归位战役群四项之三）。
 * 红线：INV-17 幂等 sha/INV-18 单飞语义不破；manifest 终局单写/清空重建
 * 既有机制随迁；e2e corpus-export 全链不破；与 F-SESS-01 同域不同票——
 * SESS 先修悬挂（梯队二）、EXPORT 后拆件（梯队四）。
 * 裁决与排程序：docs/design/2026-09-18_complexity-governance-ruling.md
 * 裁决 6/§3 梯队四。实现者领票时本骨架改写为真实现；件名可随设计修订
 * （registry file 字段随直系继承者迁移——在册先例）。
 */
export {}
