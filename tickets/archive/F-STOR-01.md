# F-STOR-01 票面归档（F-GOV-01）

- id: F-STOR-01
- file: scripts/audits/
- area: infra
- owner: strong
- status: done

## summary 原文

存储批（裁决 3）：audits 历史件出库归档——移仓外档案区→git rm --cached→.gitignore 止血→locks manifest 同步（92 条 audits 锁项 unlock→移→regenerate→apply 单链 [locked-change]，manifest 与提交原子同步——宪法「即时 apply」条款）；AGENTS 三桶口径①条随批修订呈批（证据件从「随收口入库」改「仓外档案区登记制」——制度呈批面）；本机 52M 清理（dist_new 删+local-state-backup 外移）；.git 6.7G 认列沉没成本不动；排期=梯队五；**DIR 形态票**（file=scripts/audits/——F-AUDIT-01 先例；翻 done 时须同步 check-tickets DIR_FILE_EXEMPT 清单 [locked-change]）【毕 2026-09-19 batch 29 三屋全链】：audits 3639 件/1.86G 整体出库 E:/zcode_md/synapse-archive/scripts-audits/（robocopy /MOVE 0 失败，du 源↔目标恒等 1900544KB；git 跟踪 2871 件 rm --cached 同笔提交）；仓内目录留驻=README 指针件（两张 DIR 锚存在性）+.gitignore scripts/audits/* 全拦止血；**锁项实测 141 件（勘正立案时点估数 92——裁决书 :134 口径）**，manifest 385→245（=385−141+1 工具件随迁新径）；visual-diff-locate.mjs 活工具件随迁 scripts/ 根（F-TOOL-01 锚随迁另注）；local-state-backup 45M 外移毕；dist_new 删除欠账（宿主文件锁残留 app.asar 单文件——探针 b29-find-lock-probe.ps1 在档）；AGENTS ①条呈批稿=docs/design/2026-09-19_f-stor01-bucket1-revision-proposal.md（待用户裁决）【用户 2026-09-19 裁=批准 a——v2 仓外档案区登记制条文已落宪 AGENTS.md（batch 29 增补一）】；衍生面欠账五条在呈批稿 §五（visual-diff 头注/meta.tool 旧径文本刷新+同族 4 处路径锚+check-tickets:163 注释两票→三票——均后续小票顺带）；门一 k2 PASS_WITH_WARNINGS B0/W1/N7→门二 GO_WITH_CONDITIONS P0=0/P1=2/P2=5/N=5 条件全兑现；verify 四档链（基线 385→终态 245 恒等式+指纹门 183·1768·5368·skip14 零漂移+build 产物同名同尺寸）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
