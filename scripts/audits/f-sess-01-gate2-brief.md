# F-SESS-01 门二终审简报（主控呈）

## 票面与实现概要

- 票：F-SESS-01（tickets/registry.ts:285）——导出会话悬挂修复：streaming 中 renderer reload→单飞锁永不释放；修法方向=session 生命周期与 renderer 存活解耦；票面含态空间表；验收=悬挂态可恢复+e2e corpus-export 全链不破。
- 实现（ops-executor，GLM5.3flash $max 档）：A=advance 终局守卫；B=abortActiveSession（复用 failSession）；C=bootstrap webContents 双事件接线（did-start-navigation isMainFrame+render-process-gone）。自裁 6 条（关键=①failSession 终局标记同步前移——setImmediate check 相位 vs rm 线程池回路的相位论证；②新 e2e 不带 skip 守卫 always-active）。
- diff 面：corpus.export.service.ts 422→445/bootstrap.ts +15/tests/unit corpus.export.test.ts 443→519（+4 用例）/tests/e2e corpus-export.spec.ts 147→221（+1 用例）/locks manifest 同步/invariants.md **INV-65 登记（门一 W1 处置后落，不在实现者 diff 内——见下）**。

## 处置核对清单（门一 findings+主控裁决 vs 终态实物）

- W1（INV 登记缺口）→ **已处置**：INV-65 入册 docs/invariants.md（尾号 64→65，含安全前提「renderer 无 in-page 导航——引入 hash/history 路由即触发复审」——门一 C③攻击面的登记闭合）；受锁链 unlock→改→generate→apply；处置后主控亲跑 verify EXIT=0（scripts/audits/f-sess-01-verify-final.raw.txt 尾行 VERIFY_EXIT=0——真退出码在文件内）。
- W2（M1/M2 还原 diff 空标记未归档 raw）→ **留痕处置不回炉**：还原正确性由终态 verify/e2e 全绿传递闭合；教训入批次日志（变异还原的 diff 空输出应 `>> log` 随跑随录——与 batch 6 教训①同族）。
- N1-N9 → 记录级：N1（悬挂 finishPaper 落 fulltext 残留=cleanRebuild 自清语义一致）/N2（finalizing rename 微窗=产出完整+重跑自愈）/N3（waitForTimeout 裕量充足）/N4（两格不可达或同码路径）/N5（render-process-gone 红证欠账已入 INV-65 登记面）/N6（改序红证由 M1 旁证）/N7（relay.md staging 显式列文件处置——本票提交主控执行）/N8（首载监听时点=必 idle 空转）/N9（课题切换语义前后一致）——均不改代码。
- 门一预裁 5 项全维持（门一报告 C①/D 段+预裁攻击结论段）。

## 机检终态（供④核对）

- 主控终态 verify：EXIT=0（f-sess-01-verify-final.raw.txt，含 INV 登记面后重锁态——指纹门/vitest/locks/lint/typecheck/build 全链）。
- 主控终态 e2e 双通道：f-sess-01-e2e-{app,all}-final.raw.txt（本简报落盘时在跑——门二请 Read 该两件核对 E2E_APP_EXIT/E2E_ALL_EXIT 标记与 passed 数 43/45；若文件尾部无标记=仍在跑，按实现侧首证 f-sess-01-e2e-{app,all}.raw.txt（E2E_APP_EXIT=0/E2E_ALL_EXIT=0，43/45 passed）核对并在报告注明终态件时序）。
- 实现侧证据：first-red（FIRST_RED_EXIT=1，4 failed）/M1（M1_EXIT=1 恰 t3 红）/M2（M2_EXIT=1 新 e2e 超时红+旧 test 绿）/定向 16/16。
- 数字：指纹门 183 文件/1757→1762 用例/5334→5350 断言/skipSites 15（纯增 +5=4 单测+1 e2e）；vitest 166 文件/1713→1717；locks 334；tickets 195/open 15（F-SESS-01 尚未翻——门二后主控翻）。

## 宪法红线终审清单（供③）

状态机前置（态空间+跨格八行随 diff）/受锁链三段（tests 两件+invariants+manifest 同步）/变异还原安全（cp 备份法，W2 留痕）/安全禁令（无新 IPC/preload/host——abortActiveSession 仅 main 内消费，api-surface 契约测试 21 用例绿）/≤500 行（445/273/519/221 中超 500 仅测试件=lint 绿 CI 口径）/UTF-8/新测试 always-active（自裁②+guardedDescribe done 恒激活——门一预裁③维持）。

## 成本账本行（供⑤——主控从派发回执汇出）

- 实现者 ops-executor：GLM5.3（绑定档案 account:bigmodel-individual-coding-plan/GLM-5.3$max）｜subagent_tokens 4,613,474｜tool_uses 71｜duration ≈20.3m｜outcome=done。
- 门一 ops-gate1-k1（源A）：两次 Provider authentication failed——换源 k2（备源承载，k3 $max 档自证）｜tokens 2,805,834｜tool_uses 32｜≈11.5m。
- 门二（本岗）：回执自报。
- 主控：GLM5.3 max（本会话）。

## 输出契约

四清单+一逐项；P0/P1/P2 分级（P0=阻断须回炉；P1=收口前必须处置；P2=留痕可收口）；全文自存 scripts/audits/f-sess-01-gate2-report.md（工具面只读则回复全文由主控代落盘）；回复精简版。
