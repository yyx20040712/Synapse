import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { getReaderOutbox } from './features/reader/time/reading-time-setup'
import './shared/theme.css'
// [F-CSS-01] theme.css 分域拆件——import 序=原相对序（源顺序=层叠语义）：
// token 留守件先行（@import tailwindcss+:root 必先于一切消费方），四皮肤件
// 按原 theme.css 内段序 壳→按钮→阅读器→脉络
import './shared/theme-shell.css'
import './shared/theme-buttons.css'
import './shared/theme-reader.css'
import './shared/theme-lineage.css'
import './shared/theme-lineage-tools.css' // [F-LGRAPH-01②] 工具组/线型列表皮肤（分域拆件）
import './shared/theme-lineage-nav.css'
import './shared/theme-lineage-card.css' // [F-LGRAPH-01②U4] 卡三层+详情面板皮肤（分域拆件）

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('找不到 #root 挂载点')
// P7X-02 启动闸门（回炉 W1：渲染先行+后台回放）——重放存量（T5 恢复+按序
// 排空）不阻塞首帧：send 挂起只停在后台排空循环（UI 活），ToastHost 在 App
// 子树=回放期死信/退化 WARN 实时可见（pre-render toast 的自动消失计时从调用
// 点起、回放>3.5s 即丢的结构性缺陷同根消除）。replayOnStart 内部不 reject
// （store 异常=退化内存+WARN、send 失败=T4 重试，无 reject 面）——void 即可；
// 排空闸门仍由模块内部承载（resolve 前新 enqueue 只入队不派发，回炉 W2）。
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
void getReaderOutbox().replayOnStart()
