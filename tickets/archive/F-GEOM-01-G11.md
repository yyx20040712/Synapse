# F-GEOM-01-G11 票面归档（F-GOV-01）

- id: F-GEOM-01-G11
- file: docs/reports/2026-09-18_f-geom01-campaign-closeout.md
- area: infra
- owner: strong
- status: done

## summary 原文

战役收官票（设计书 §3.5/§5.1——F-TESTREF-W4 同款收官义务；11/11）：①头注重写扫尾（迁移后 reader 头注「改到哪写到哪」±50 行——selection-evaluate:54 stale 自述消除归 G2，本票全域扫尾）；②净删/交互点记账报告落本 file（git diff --stat 按域分组实测——逐项清单 §3.5 对账+跨族交互点 5→4+1 闭合 §2.6 表——LOC 辅助指标声明承袭）；③验收门全跑=e2e 一键全跑 test:e2e:all 45 全绿+默认门 43+锚定回归网+指纹门；④INV 终册收口（§5.4：INV-68 新增[G3 落]/INV-58 修订[G2 落]核验+INV-47 不修订确认+INV-37/INV-60 相容确认注记）；⑤指纹门基线重冻结（C_after ⊇ C_before 审计+scripts/test-surface.baseline.json+豁免清单全量 diff 审计——战役毕宪法义务）；F-GEOM-01 母票随本票翻 done（registry+relay 父行同步）；骨架=票面载体（标题日期=立案日）；[locked-change]（invariants/baseline/豁免清单受锁）【done 2026-09-19 batch 23：五义务全落——头注扫尾（PdfPageCanvas 两处+oneway 谓词注）+记账报告真身（净删双口径净+4/交互点 5→4+1/对账债三项销）+INV 终册（11 处路径刷新+口径小节+相容三注记）+基线同值冻结 187/1789/5411+e2e 验收 45/45+43/43 双绿+锚定网 18 件/211 用例+指纹门零漂移；门一 FAIL B1（INV-47 第 11 处漏刷）→回炉 #1 四件兑现→门二 GWC P0=0/P1=3/P2=4/N=4 回炉 0；构建恒等链第八票 sha256 三件 64 位全同】

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
