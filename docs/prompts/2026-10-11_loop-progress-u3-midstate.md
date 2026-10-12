# U3 批中场进度档 —— 会话中断快照（2026-10-11，用户令「本会话不再开工」）

> 性质：**非收官交接书**（取代制系列之外的中场状态档）。撰写动因=用户考虑开发沙箱隔离与
> 迁移，需要一份随仓库走的完整进度快照。下一会话恢复点=§3。
> 本档本身=未跟踪文件，迁移时随工作区未提交面一并带走（见 §2）。

## §1 本场走到哪（runId=20261010-dbcamp-db2i，承接 v178 §1）

| 环节 | 状态 | 产出/数字 |
| --- | --- | --- |
| 开工序（技能清点+配置自查+事实核+主控预裁十条） | ✅ | 账本 session-open 行；预裁十条全文=任务书 §三（仓外 brief-u3.md 段1） |
| 六段简报+派发 | ✅ | 21 件触碰面显式枚举（v178 教训落实——本轮零「清单漏列」回炉） |
| executor r0 | ✅ | 21 件全交付；verify EXIT=0 亲验；四数字=296 文件/3161 用例/E1 3:3/locks 416；e2e 全量 105=102+3 零回归 |
| 门一 r0 双席 | ✅ | **k3（kimi-main 源A 默认席）B0/W6/N6=PWC**；**d1（deepseek 异构）B0/W0/N11=PASS**；四拷问点双席全过 |
| 主控处置三分法 | ✅ | 回炉 R1-R4（全测试面强化）+亲裁三条（placeholder→value 变形接受在册/check-quality COMPOSITION_ROOT_ALLOW +5 接受在册/审包段0 计数勘误）+挂账若干（账本 ruling 行） |
| executor r1′ 回炉 | ✅ | R1-R4 全落+变异红证 8 处原始摘录（W5 半幅补档）；四数字=**297 文件/3166 用例/E1 3:3/locks 417**；verify EXIT=0 亲验；e2e 105 零回归 |
| 主控亲验（d1-N1 抽查） | ✅ | 18/19/20 三测试的 mock 复位面亲查：settings-page-enter 只 reset settings 两方法/corpus-export 用 clearAllMocks（clear 不清实现）/r3 无复位/vitest.config 无 restoreMocks——缺省桩实现天然永活，免疫假设成立**不依赖** vitest reset 语义 |
| **门一 delta 复审（k3+d1）** | ⏸ **已取消** | 用户暂停时刚派发即取消；delta 审包已冻结（仓外 gate1-delta-pack.md 803 行）——恢复时直接重派双席 |
| 门二（probe 实证+adjudicator 终裁） | 未开始 | — |
| 收口（verify 亲验/指纹门基线 regen/locks/提交/交接书 v179） | 未开始 | — |

## §2 工作区状态（迁移核心风险面——未提交！）

**当前 HEAD=59e0e63b1e2（v178 docs 笔），其上叠加两层未提交工作区变更（r0+r1′）。
本场未到收口，按纪律不提交——迁移时严禁 `git checkout/stash drop` 等清工作区操作，
必须整目录搬迁或先快照备份。**

未提交面=**22 文件**（9 修改+13 新文件，`git diff --stat`=210 insertions/84 deletions）：

- 修改 9 件：locks/manifest.json（417 件 regen 同步）/scripts/check-quality.mjs（allow +5）/
  scripts/test-surface.exemptions.json（2 条过渡豁免）/src 三件（LineagePage 249→200、
  OutlineAside 189→210、SettingsPage 210→232）/tests 三件（outline-aside.test、
  reader-toolbar-icons.test、utils/api-client-mock.ts +23）
- 新 13 件：src/renderer/features/ai/ 目录 7 件（AiSessionPanel 88+data-anchor 行/
  MessageList 36/MessageItem 55/ComposerDisabled 40/aiSessionStore 114/PaperAiPanel 31/
  LineageAiPanel 23）+src/renderer/features/lineage/LineageAsideHost.tsx 153+tests 5 件
  （e2e/ai-seed.ts 158/e2e/seed-ai-domain.mjs 114/e2e/ai-sessions-panel.spec.ts 105/
  unit/renderer/ai-session-store.test.ts 9 用例/unit/renderer/ai-session-panel.test.tsx 91）

locks 状态：受锁新件已 generate+apply（manifest=417 与工作区同步，`locks:check` 绿）。
指纹门：exemptions 2 条过渡豁免在档（reason+rulingLink 齐——**收口 regen 后应归零**，这是收口验收项）。

## §3 恢复指令（下一会话开工序）

1. **门一 delta 复审**：双席（k3+d1）重派——审包=仓外档案区 `gate1-delta-pack.md`（803 行
   冻结快照，含回炉单+r1′ 报告+5 件 delta 面当前版全文）；对照基准=r0 主审包 `gate1-pack.md`
   （1814 行）。审计目标五条（符合性/真锁性消解核验/always-active/data-anchor 最小性/
   红证自洽）在 delta 包段 0。
2. delta 双 PASS → 门二派发：probe 实证（建议矩阵：verify 全量四数字复跑+E1+e2e 全量零回归
   +指纹门现状+变异复证字节级还原+零蔓延+locks 一致+renderer 消费单源抽查〔禁 repo 行型〕）
   +adjudicator 终裁（GO/GO_WITH_CONDITIONS/NO-GO）。
3. 裁决通过 → 收口（顺序敏感）：
   ①verify 亲验（**重定向文件+独立 echo $?**——管道 tail 吞退出码是 v178 教训②）；
   ②指纹门基线 regen（unlock→regen→apply→verify 再验——**验证 2 条过渡豁免 hits 归零**）；
   ③`git status` 未跟踪面清点（本档+新件全部入列）；④提交（[locked-change][test-refactor]
   尾注——22 文件+本档）；⑤交接书 v179；⑥账本 batch-close 行。
4. 恢复前置事实核（如树已迁移，先 `git status` 对照 §2 清单逐件核对+`npm run locks:check`+
   `npm run verify` 复跑确认迁移无损——**预期 verify EXIT=0/297 文件/3166 用例/locks 417**）。

## §4 已裁事项（下会话勿重复裁决——账本 ruling 行在档）

- 回炉 R1-R4 内容与处置理由（账本 2026-10-11T03:00 ruling 行）。
- placeholder→`disabled+readOnly+value` 变形=**接受**（quality 门属性名撞词既有摩擦/视觉同形/
  字面锚「对话能力将在后续版本接入」不动/申报透明）。
- check-quality COMPOSITION_ROOT_ALLOW +5=**接受**（三薄集成+两薄包装必然跨 feature——
  机制面先例；k3-N2/d1-N6 双席同判正当）。
- 种子函数签名按 020 DDL 实照（与设计 §5.0 字面冲突以实照为准——v176 先例）。
- 幂等护栏=loading/ready 锁、notFound/error 可重派（「重挂即重试」补偿语义）。
- 主图（'__main__'=collections 恒在行）不特判——lineage 锚全域合法。

## §5 开放挂账（v178 §2 四条沿承+本场新增，均非阻断）

- v178 沿承四条：①U1 冻结锚 lineage/global 补强 ②schemas.ts 555 行余量观察 ③closure
  describe 组名去数字 churn 机制 ④服务层 limit 硬化不齐+空 patch undefined 键缝。
- 本场新增（门一登记，U4+ 承接）：⑤LineageAiPanel 锚绑定无单测+MessageItem 非空渲染零测试
  （U4 消息卡场景自然覆盖）⑥seed 子进程 'exit' vs 'close'（E5 大载荷场景前改）
  ⑦lineage/settings 侧栏页签 APG 完备性（aria-controls/tabpanel——无障碍票族级）
  ⑧api-client-mock 缺省桩 vitest 升级票连带复查 ⑨playwright 1.62.1 无 getByDisplayValue
  （U4-U6 按值定位需 toHaveValue 绕行）。
- **repos 299/300 压线双件拆件方案前置**（v178 §1-3 沿承——任何触 ai-sessions.repo/
  ai-tasks.repo 的票立案前先出拆件方案；U3 零 repo 接触，预警仍活）。

## §6 基线与治理（中断时点）

- verify（工作区树）：EXIT=0 / **297 文件/3166 用例**（=295+2 文件/3154+12 用例——store 9+
  panel 2+outline-aside 1）/ E1 3:3 / e2e 全量 105（102+3）/ locks **417**（412+5 新测试件）/
  通道 75 恒定（本批零通道变更）/ user_version 20 / 指纹门豁免 2 条过渡态。
- 账本：本场 runId 6 行（session-open/impl r0/gate1-audit k3/gate1-audit d1/ruling/impl r1′）——
  delta 取消未记账（零 token 消耗的取消，无需记）。
- 成本：executor 两轮 ≈27.1M（r0 20.16M+r1′ 6.95M）+k3 114k+d1 158k+主控 host-max。
- 席位：门一 Kimi 席=ops-gate1-k3（kimi-main 源A 默认席，v177 §3-1 修订五沿承）+d1 异构。

## §7 证据档清单（仓外档案区——**迁移时须单独搬迁，不随 git 走**）

`E:/zcode_md/synapse-archive/scripts-audits/20261010-dbcamp-db2i/`（7 件）：
brief-u3.md（六段简报）｜gate1-pack.md（r0 主审包 1814 行）｜gate1-delta-pack.md（delta
审包 803 行）｜append-ledger-{open,impl,gate1,rework1}.mjs（账本脚本 4 件）。
迁移丢档后果：delta 复审与门二的对照基准失源——须在迁移清单内显式包含本目录
（或迁移后按本档 §1/§2 重建最小对照面）。
