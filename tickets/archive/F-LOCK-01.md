# F-LOCK-01 票面归档（F-GOV-01）

- id: F-LOCK-01
- file: scripts/unlock-protected.ps1
- area: infra
- owner: strong
- status: done

## summary 原文

unlock/lock 脚本受锁集合不对称修复（F-LINT-03 实现者异常项——v57 §2-2 立案候选）：unlock 收集面漏 scripts/dup-constants.baseline.json（lock 与 check-locks.mjs 均含）——集合三处独立定义漂移实录（两次 chmod +w 绕行）;**收口 2026-09-10 三屋全链**：新件 get-protected-files.ps1（25 行 BOM+LF）驻单一 Get-ProtectedFiles（集合含 baseline.json 逐字迁移）+lock/unlock dot-source（57→42/26→14 行）+check-locks.mjs:25 注释改指共享件（门一 N3——头注互指双向闭合）;红证三支=prered（apply 311→unlock 310 差 1 实锤+baseline True 缺陷）/postred（unlock 312→False→apply→True→check 312 过）/mutation（共享件条目改名→unlock 311+True=单点生效证明→还原复绿）;门一 Kimi kimi-main 三轮（R1 B0/W2/N5 放行附条件→回炉 W1 死变量+N3[实现者子代理本环境不可续命——主控亲改两行,先例 F-CSS-03]+W2=审包 verify-tail 拼装乱序所致主控行号连续序当庭出示→R2 独立无 R1 记忆提三新破坏→R3 三件现状出示五项全销项无阻断+3 非阻断观察备案[mjs walk 排除面=R1 已审存量/排序口径差异=Map 比对非序敏感/解锁步静默 catch=存量语义可控]）;门二统一档[Agent 工具无 model 参数环境限制,同源欠账如实记]PASS 无条件（四清单+机器面亲跑:check-locks 312 一致/manifest 312 含新件+baseline 双在册/翻 done 推演不红/BOM 无 CR 无 FFFD 独立复算）;locks 311→312（新件入 scripts walk 面 delta 可解释）;verify 160 文件/1562 用例 exit=0 亲验两跑（回炉前后）;证据群 f-lock01-*.raw.txt+gate1 三轮回执与 prompt+diff 切片+gate2 全入库

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
