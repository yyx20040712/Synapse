/**
 * [F-DBCAMP-01 DB-2 UI U5·回炉 R3] AI 域 UI 文案单源（独立常量件——解
 * k3-N7「常量 import 拉起 store 模块」异味：消费方（store/PinsTab/TasksTab/
 * MemoryTab）import 本零依赖纯常量件，不连带 zustand store 模块图）。
 * 「请求无效，请重试」原 5 现散落（store 定义+三组件内联）收敛于此。
 * 注：AiSessionPanel/aiTasksStore（U3/U4 件）同名文案为既有批次落点，
 * 本批零接触面不回改（沿各件头注口径）。
 */

/** 行内/面板通用错误文案（设计 §1.4——与全应用口径一致） */
export const GENERIC_ERROR = '请求无效，请重试'
