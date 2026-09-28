# F-TESTREF-W2 票面归档（F-GOV-01）

- id: F-TESTREF-W2
- file: playwright.config.ts
- area: infra
- owner: strong
- status: done

## summary 原文

测试优化战役 W2=探针 spec 移出默认门（W1C 同火收口 2026-09-18）：playwright.config.ts projects 拆分 app（testIgnore=/z-.*-probe\\.spec\\.ts$/）+probe（testMatch 同式）——@probe 标签形态弃用（动 test() 标题即动 C 面）故 spec 文件零改动；package.json test:e2e→--project=app（默认门 42 用例不含探针）+新增 test:e2e:all（--project=app --project=probe 一键全跑，反模式防 flake 复发无捕获面）；CI ci.yml:74 裸 npx playwright test 无过滤=全 project 仍含探针（行为不变亲验）；forbidOnly 顶层声明两 project 承袭；三通道真跑全绿=app 42 passed（1.9m）/all 44 passed（2.1m）/迁移前全量 44 passed 双 EXIT=0 落档（w1c-e2e-{appgate,allgate,full}.log）；门二 P2-2 留痕=charter:294/DEV-SETUP:69/裁决书:117 的 test:e2e 全量语义失准回写归 W4 收官票统一处理；[test-refactor][locked-change]；2026-09-28 F-CONSOL-03 勘正：file 原指探针件已移仓外归档（E:/zcode_md/synapse-archive/scripts-audits/F-CONSOL-03/probes/），改指本票实际主改面 playwright.config.ts

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
