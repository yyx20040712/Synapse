# F-R3 票面归档（F-GOV-01）

- id: F-R3
- file: src/renderer/features/reader/state/CorpusExtractor.ts
- area: reader
- owner: strong
- status: done

## summary 原文

AUDIT-C C-1 修票（二波场 2026-09-02）：轨二 c=P6 泄漏闭（settleLoadTask 纯函数——加载失败 destroy 恰一次+自身拒绝吞并+await settle 后重抛原错误；loadPdfDocument 接线保 task 句柄；头注状态机表证伪格改如实双路径）；轨一 e=上游查证（f-r3-upstream-check.md：v5.5.207 已修主逃逸点 onFailure 终接守卫/6.3.289 另有 destroy() 族硬化/master pdfManagerReady 悬尾仍在）→**终裁不升级**（任一档位不承诺零同族噪声+跨 major 回归面不换 devtools-only 收益；升级再评估触发条件=上游悬尾族全消）；轨二 b=destroy 序列化不采（无消噪声收益+切换串行延迟确定代价）；INV-49 登记（worker-per-task+销毁序+接受残余+代理计数监控锚）；门一 Kimi 3B/2W/0N PASS+门二 deepseek 2B/1W/2N PASS（W1 变异红证缺口主控补销=变异 A 同引用重抛/B 恰一次/C 顺序 settle+顺序测试 1 it；W2 upstream 档补包+降噪论证补强）；实现者 GLM5.3 统一档 1.94M tok+主控压缩票三变异；票面 f-r3-fix-brief.md+报告 f-r3-fix-impl.report.md+四门审档在档

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
