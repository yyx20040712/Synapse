# INV-62 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-62 | 划选终点事件层可重定向：mouseup 真划选（位移≥3px）且释放点浅探（focus 行盒顶上方间隙+距上一视觉行盒底 ≤ max(距 focus 盒顶, 4px 余量)+释放 x 在上一行释放 x 最近栏组右缘+1px 外——该处无文本）时，selection focus 可被改写为上一行（该栏组）行尾（锚定侧原样）——锚定链输入此前仅浏览器原生解析（F-A10 G2 文本位下探锚定层零 DOM 信号），事件层改写须发生在 evaluate.full 之前同帧消费终态；量测不可用环境零变 | F-A12 2026-09-10；判定=src/renderer/features/reader/interact/release-affinity.ts（纯函数——手势态表+事件时间线驻头注）；接线=SelectionLayer.onMouseUp（dragged 门=程序化零触） | release-affinity.test.ts 17 用例（G2 紧间隙复刻/深点零变/词间空格行盒内零触/向上对称面/四零盒守卫/双栏最近栏组定向/首行零变/坍缩零触/等距取上一行/大间隙刻意零变/W1 域判别+容差双点/W2 跨多行上界/C-1 翻转兜底回归网）+selection-layer-fa12.test.tsx 接线三态锁（程序化零触/微位移早退/真划选触发） | 已锚定（单测级 F-A12 本单；已知边界=栏间隙释放保守零变[R-2]+组内 right 非单调选组偏差[R-1 罕见保守]——观察备案真机再现再立票） |
