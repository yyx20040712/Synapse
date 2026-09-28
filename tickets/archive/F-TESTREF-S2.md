# F-TESTREF-S2 票面归档（F-GOV-01）

- id: F-TESTREF-S2
- file: scripts/check-test-surface.mjs
- area: infra
- owner: strong
- status: done

## summary 原文

基线再生成机检对账（T3-P2 门一 k1 终裁 N1 建议 2026-09-27 立票——同票豁免台账轴两番人肉计数失守实证[实现者首批漏登 2 条 B1+主控呈报算术两笔 off-by-one]，违「同类缺陷二次触发即重构」）：test-surface:baseline 再生成脚本自带机检——输出 C_old−C_new 退役用例清单并要求与豁免 delta 精确匹配（不匹配即拒再生成 exit 非 0），把「再生成前豁免清单与删除面逐条对账」从人肉步升机检（现状=再生成时点机器零保护、台账完备性纯靠人肉——T3-P2 首批漏登正是此缺口，由门一对抗链兜住但每次消耗审查带宽）；触发条件=下次任意票再生成基线前搭车或单独小票；【毕 2026-09-27 三屋全链（回炉 2 封顶+主控加固批；设计=主控六段简报状态机四态×两轴）】实现=ops-executor（session:host-tier，units 3：主件 513 行[ESLint 语义 402/500 余量 98]+新测试 tests/unit/tools/check-test-surface.test.ts 426 行 14 用例 CLI 探针法[mkdtemp fixture 真子进程真基线零触碰]——baseline 写盘前轴一=judge(old,cur) failures 拒写 exit 4[漏登拦截]+轴二=台账−exemptionsSnapshot 身份键多重集差零命中拒写[多登拦截；快照 structuredClone 随盘落 version 1 向后兼容+迁移首启轴二跳过+豁免快照损坏=snapshotCorrupt 轴一照跑轴二跳 clean 重写修复]+retiringFaces 审计报告 RETIRING/ADDED/REMOVED 逐条打印+die(4) 文案分桶[FILE_MISSING/TICKETS_MISSING/ONLY_FORBIDDEN 无豁免通道类指人工删基线重跑]）；门链=主控审出行为矛盾 1（新文件豁免命中零记录致轴二拦死合规路径）→回炉 1 recordFace 三处+用例 9→门一 k1 PASS_W（B0/W3/N7）+d1 PASS_W（B0/W4/N3——快照 null 元素 TypeError 真缺陷/身份键含元数据致注释性修订死路）→回炉 2（快照两级校验/身份键放宽 file+匹配键/die 分桶/用例 10-14）→复审双 PASS_W→主控加固批（TICKETS_MISSING 补 hardKinds 亲核证实/snapshotCorrupt 轴一照跑重构/靶向变异 M4-M7 全红证/隔离注释）→probe 8/8（verify 独立复验 172/1874 EXIT=0+变异 M6/M7 复现+加固行为亲测 exit 4 拒写基线逐字节不变+check 隔离 exit 0）+裁决部 GO_WITH_CONDITIONS（C1 行数失实更正[实现者 500 贴线=加固前旧值，物理 513/语义 402/余量 98——计数实测红线教训+1]/C2 收口清单/C3 账本补登/C4 下轮再生成首战核对挂 P5）；终验=verify 真退出码 0（172 件/1874 用例=1860+14）+locks 253→254+指纹门基线未再生成（纯增量 NEW delta 绿，192/1911/5820/skip15 不变）+豁免 110 零新增；主控域事故在档=M7 变异 node -e 多行 argv 吞参两实录（改文件法）；证据=仓外 f-testref-s2/（executor-report+probe-report+batch-record+diff/日志族）；移交=FILE 级豁免通道另立案候选/主件拆件降级建议/S2 首战=P5 基线再生成（迁移首启→快照落盘→次轮轴二全效）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
