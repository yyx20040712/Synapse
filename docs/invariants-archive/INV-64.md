# INV-64 原行归档（F-GOV-01）

> 迁移注记：F-GOV-01（2026-09-28）主表瘦身迁此——主表现行最小三元组见 docs/invariants.md；下为本行归档时原文整行（论证/演进史/同族变体/取证注记均在原文内）。

> | INV-64 | e2e 内禁截图比对：tests/e2e/** 禁 `toHaveScreenshot` 断言——视觉回归的像素 diff 限 scripts/audits 工具层（探针取证域，settings.png 先例）；e2e「看见」类断言=计算样式+真实文本（INV-06 口径——几何可见 ≠ 视觉可见）。现存 0 处=既成事实升格受检不变量（2026-09-11 终裁 §4-4 W4 行；锚面=本 API——手写 screenshot+自比对属未来负锚扩展位，声明与锚面刻意对齐） | F-TESTREF-W4（2026-09-18 入册）+scripts/check-quality.mjs 第 9 段负锚 | 机检：check-quality.mjs 第 9 段（tests/e2e 下 .ts/.tsx 出现 toHaveScreenshot 即红——quality 关卡，verify 链+CI 同口径） | 已锚定（本票落锚：负锚上线+注入红证 w4-inv64-anchor-red.log） |
