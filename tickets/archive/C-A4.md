# C-A4 票面归档（F-GOV-01）

- id: C-A4
- file: .github/workflows/ci.yml
- area: infra
- owner: strong
- status: done

## summary 原文

CI 口径对齐——指纹门入 CI+DoD 措辞勘正（外部审视 S-4；真相源=design-final §4 D-GOV-7/8/9）：行为层=①ci.yml verify job 增步 node scripts/check-test-surface.mjs check（**fail-fast**——指纹门是闸门非告示；**现状输出已含逐 case 差异**[MISSING_CASE/SKIP_ADDED 明细——实测先例删基线重跑列 19 MISSING_CASE 清单]→零脚本改动零隐性扩面[审 W12 闭合]）；插位=test --coverage 后 build 前；②AGENTS.md DoD 行勘正终态文=「npm run verify 全绿（quality+tickets+locks+lint+typecheck+test+build——**verify⊇CI：另含指纹门**；model-names=收口手动关卡未串 verify/CI）」（原「与 CI 同口径」失准——model-names 不属 verify 亦不属 CI，超集表述须排除[审 N13]）；③model-names 不串 CI（D-GOV-9：src 零代号=收口纪律多轮实证，CI 化边际值低；代号逃逸事故出现再入）；接口层=ci.yml 单步+AGENTS.md 单行；baseline json 已随仓提交 CI 零额外产物；架构层=受锁面=[ci.yml+AGENTS.md]——[locked-change] 单尾注；范围闸白名单已含 workflows 自洽；本地绿 CI 红=行尾/路径环境差优先排查（排障注记入票）；生命周期=**首推实跑=验收**（CI 增步真实执行）+DoD 行注明「verify/CI 关系变更须同票勘正」；文化层=「措辞即契约」先例（文档自申报与机检现实不符=治理债）+model-names 取舍理由留档不悬置；收口 2026-09-28：**C2 终验收锚兑现=CI run 36372251379 首绿**（绿头=318cd79c521 F-CI-01 修复笔——本票指纹门步在该 run 真实执行绿+lock-change-guard 绿；注记：c484f330578 自身首推三连红系 F-CI-01 域 npm ci 环境断因[305ea4ebf8c/ab485272acc 先于本票的 run 同步红=非本票 diff 所致，根因与处置见 F-CI-01 票面]）；C1-C5 全兑现（C1 双审两席纯内联零 Read/C2 本 run/C3 W1 表述修正建议随记本票——DoD「另含指纹门」子句两侧收敛+方向附核，主登记位=交接书 §3 触发点 F-GOV-01 立案核或微票/C4 证据仓外 C-A4 档/C5 门链四审档在档）；实现笔=c484f330578[locked-change]三件 6+/3−；翻票笔=registry 单笔

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
