# F-TESTREF-W4 票面归档（F-GOV-01）

- id: F-TESTREF-W4
- file: docs/audits/flake-ledger.json
- area: infra
- owner: strong
- status: done

## summary 原文

测试优化战役 W4=不确定面机件化（战役收官票，2026-09-18 收口）：flake 台账 docs/audits/flake-ledger.json 八线历史收录（P7-A 七现/F-R2e 2/z-r2e 2/tag-lifecycle 2/F-ARCH4-M1 1 观察中/F-G11 1 观察中/settings.png 1 观察中/corpus-export 3 未立票——数据源=charter §1.4 审计快照+各线史料档）+stableRel 下沉 tests/e2e/stable-rel.ts 共享助手（reader-text 消费替换，变异红证=streak 2→999 e2e 稳态用例红 w4-mutation-stable-rel.log）+INV-63（测试面单调性——指纹门 C_after ⊇ C_before 机检锚定）/INV-64（e2e 禁截图比对——check-quality 第 9 段 toHaveScreenshot 负锚，注入红证 w4-inv64-anchor-red.log）入册 docs/invariants.md；战役收口段（W5）兑现=coverage 三档亲跑 EXIT 0（全局 86.6 lines≥70/repos 85/renderer 60）+e2e 双通道亲跑（默认门 42/42+一键全跑 44/44 双 EXIT=0 落档 w4-e2e-{appgate,allgate}.log）+战役净删总账（tests 域已提交 +1622/-1618+W4 终态 +81/-56：迁移三票净删 -737、W3 契约测试纯增 +741、W4 净 +25——含门审后 W 级处置 +3 行头注/指针对齐）+基线重冻结（179→183 文件/1623→1757 用例/4979→5334 断言，共有面排除行号逐字节全同 w4-baseline-refreeze-audit.md）；搭车两项落=调色板断言字面量五色 pin（W3 门二 P2-3）+test:e2e 语义三处回写（charter:294/DEV-SETUP/裁决书:117，W2 门二 P2-2）；S1 触发检查=零存量命中不触发（w4-s1-probe.txt）；[test-refactor][locked-change]

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
