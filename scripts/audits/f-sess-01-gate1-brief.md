# F-SESS-01 门一审包（对抗深审）

## 输入件

- diff 包：`scripts/audits/f-sess-01-gate1-diff.patch`（467 行；含源两件+测试两件+locks manifest+relay.md 认领行+实现报告全文；raw 证据件 7 件按 ORG-12 工件面剔除——可按路径自 Read 抽查，禁跑）
- 票面：tickets/registry.ts:285（F-SESS-01 行）+源文件头注态空间表（diff 内含头注扩格后全文）
- 实现者报告：`scripts/audits/f-sess-01-impl.report.md`（diff 包尾附全文）
- 证据日志：`scripts/audits/f-sess-01-{first-red,m1-mutation,m2-mutation,verify,e2e-app,e2e-all,e2e-first-green}.raw.txt`

## 缺陷与修法（主控裁决口径——可攻击，推翻需更强依据）

缺陷：corpus.export.service 工厂闭包 `session` 单飞锁只在 done（advance）/failed（failSession）释放；renderer reload/崩溃（main 存活）时 corpusItem 永不回传→streaming 永挂→EXPORT_BUSY 永不释放；且原 advance 无终局守卫——悬挂推进可终写 manifest。

修法三件：A=advance 入口守卫 `if (session !== s) return`；B=接口新增 `abortActiveSession(reason): Promise<boolean>`（复用 failSession）；C=bootstrap webContents `did-start-navigation`（isMainFrame 过滤）+`render-process-gone` 两事件接线（经 container liveProxy）。错误码复用 IO_ERROR（reject 消费方=已死 renderer；新码需 ADR 不做）。

态空间表扩格：迁移表 abort 行+interrupted 行补句+跨格序列七→八行（renderer 重载 streaming 中行）。

## 主控预裁项（可攻击）

1. 自裁① failSession 内部顺序：`session = null`（终局标记）前移至 `await rm` 之前。主控复推采纳：deferOutcome 排队的 setImmediate 在 check 阶段执行，rm 走线程池+poll 回路——终局标记不同步落盘则 advance 守卫在 t3 竞态窗失活（M1 红证反证 run 到达 advance）。原「先清理后释放」防的窗（清理期新会话 tmp 误删）量级论证：新会话 cleanRebuild 自清残留+finalizing 终写远晚于单文件 rm 完成。
2. 自裁② 新 e2e test 不带 test.skip 依赖守卫（always-active 宪法口径；旧 test 原子未动——skipSites 15 保持）。首版带守卫曾触发指纹门 SKIPSITE_ADDED 红（15→16）后删。
3. 自裁⑥ 4 新单测置于既有 guardedDescribe('SR2-AI-03')（done 票，运行时恒激活）——主控裁：实质 always-active，形式复用 Harness 配方最小。
4. 错误码 IO_ERROR 复用（见上）。
5. e2e streaming 实证=轮询两篇任一 `figures/<id>/page-1.png` 存在（figure 回传即落盘）——篇序不写死防 flake。

## 工单 A~E（对抗深审）

- A 母本符合度：票面（registry:285）vs 实现——修法方向「session 生命周期与 renderer 存活解耦」/态空间表/验收（悬挂态可恢复+e2e corpus-export 全链不破）逐项。
- B 宪法红线：状态机前置（态空间+跨格序列交审）/受锁链（tests/** unlock→改→generate→apply）/变异还原安全（cp 备份法）/安全禁令（无新增面）/≤500 行/UTF-8。
- C 代码与测试质量：**本票强制审项=挂载/事件消费类「事件时间线逐帧推演」**——重点格：①t3 竞态窗（complete 排队 setImmediate vs abort 同步段 vs rm 线程池三者的相位序）逐帧推演是否如实现者/主控所论；②abort 后迟到 corpusItem/二次 abort/并发新会话的防御闭环；③did-start-navigation 首载/SPA 内路由/子帧过滤三面；④advance 守卫对既有 failSession 路径（写盘失败窗）的行为影响。
- D 报告诚实性：自裁 6 条逐条对 diff 核实；数字（指纹门 183/1762/5350/15、vitest 166/1717、e2e 43/45、locks 334）对证据 raw 抽查。
- E 接缝与后续单：相邻声明核对（bootstrap 头注/export.service.ts corpusSet 守卫注释/INV-17/18 语义/F-EXPORT-01 拆件票面对本改动的承袭关系）——发现两处声明互斥即停报。

## 输出

[B|W|N] 逐条+file:line 证据+统计+总评（PASS/FAIL/PASS_WITH_WARNINGS）；全文自存 `scripts/audits/f-sess-01-gate1-report.md` 后回复精简版。
