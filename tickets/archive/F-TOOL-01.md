# F-TOOL-01 票面归档（F-GOV-01）

- id: F-TOOL-01
- file: scripts/visual-diff-locate.mjs
- area: infra
- owner: strong
- status: done

## summary 原文

像素差分带定位器工具固化（2026-09-08 批二 §6.2 三件套实操暴露——temp 配方不可复用,v51 §2-3 候选+用户裁决 2026-09-09 立案夜间批）：scripts/audits/visual-diff-locate.mjs 新件——输入 baseline/after 两 PNG 目录+态清单,输出每态差分行带（16px 块网格/TH6/cnt≥4——y 行带+x 范围）+可选 crop 模式（指定区域 before/after 上下拼接输出）;**三坑规避内建**（Playwright 像素 diff 实录 v51 教训行）:①goto file:// 原源页（about:blank 加载 file:// 静默挂死）②launch args --allow-file-access-from-files（file:// 页 canvas 污染）③pathToFileURL 中文路径编码;纯 Node 面零 app 依赖（不 launch electron）;自产 .mjs 诞生即 locks:generate+apply（AGENTS 硬规）;验收=对 p7d01-out 现存 baseline/after 八态实跑（批二裁决态——差分带与批二在档对位一致）+变异自证（同图对比=零带）;工具头注含 §6.2 三件套使用语境（带对位=三件套①,输出供②crop 与人工核对）;**毕 2026-09-09 夜间批三屋全链**：333 行终态（差分/crop 双模式+JSON 报告+退出码合同 0/0=2/1）;实现者 GLM5.3flash[环境统一档如实记]三轮（首证+回炉1=主控亲核 crop 上下顺序颠倒[IHDR 断言对内容顺序盲→urlBase/urlAfter 语义直画+合成蓝红图顺序验证 PASS]+回炉2=门一 1B/2W/3N 全闭合:crop 尺寸不等 bail(1)/statSync isDirectory/mkdtemp-launch 入 try 判空清理/负例六支 2-2-1-2-1-2/头注对位表/crop-态清单互斥）;门一 deepseek 兜底（**Kimi 双源同窗 403 额度耗尽,switches=2 落路由账**——R1 BLOCKED→R2 全 ADDRESSED 无新破坏;低置信清理顺序缺口一条主控裁量不修=触发不确定+回炉限额满）;门二统一档同源欠账如实记 PASS 无条件（8 条亲跑矩阵全中:--check/同图八零带/lib 8 带逐带零差异/负例抽查/verify 档真实性/manifest sha256 亲算/带几何独立复算自洽）;证据群 f-tool01-*.raw.txt/gate1-kimi.md[R1]/gate1-r2-review.md/gate2-full.md;八态 42 带逐带归位批二 §6.2 预期区（顶栏/侧栏/卡片 meta/边标签/图例/底部版本号,无意外区,最大带 2.2%）;locks 286→287;verify 156 文件/1543 用例 exit=0 亲验;【file 锚随迁 2026-09-19 F-STOR-01】原锚 scripts/audits/visual-diff-locate.mjs——audits 出库归档（裁决 3）时活工具件随迁 scripts/ 根（仍受锁）；票面历史叙述中 scripts/audits/ 路径=档案区 E:/zcode_md/synapse-archive/scripts-audits/ 同名件

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
