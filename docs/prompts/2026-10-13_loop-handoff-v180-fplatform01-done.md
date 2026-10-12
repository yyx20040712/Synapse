# 交接书 v180 —— F-PLATFORM-01 平台移植批收官·推送就绪态（2026-10-13）

> 前承 v179 修订三（§1 开工序=F-PLATFORM-01 平台批→全量绿→ssl 重置→立即推送→U4）。
> 本档=**平台批收官全链单源**（根因改判+三屋全链+批毕动作三步毕其二）。
> **下场开工序=§1。**

## §0 本场总账（runId=20261012-fplatform01；账本 8 行在档）

| 段 | 交付 | 终态 |
| --- | --- | --- |
| 开工 | node24.20.0 重新补齐（~/tools/node24——交接书 v179 所称环境已失，系统 node18 不满足 engines+quality 版本守卫）+技能清点/配置自查入账 | session-open 行 |
| 根因改判 | 票面「字体度量漂移」假设**证伪**：playwright 探针实测卡 128×72 恒定、真根因=month-frame border 1.6px 在 Linux Chromium（DPR=1）落定 1px（Windows 保 1.6px）→框高 104 vs 105.2→rowsFromFrame innerH 70.8<72→行集 0→网格通道全集空→detour/band 全灭→overlap 兜底；**证伪实验=注入 border 2px→route overlap→band**（探针档） | ruling 行 |
| 实现（ops-executor） | 4 文件：file-store（win32.isAbsolute 联合判定+脱敏三形态 replaceAll）+detour.ts（BORDER_SUBPIX_TOL=1.3 容差）+zcode-link 测试 join 参数化+lineage-routing 新用例（双断言）；TDD 红→绿+变异红证三组 | impl 行 |
| 门一（k3+d1 双席） | k3=FAIL（B1=锁面证据缺——流程补件）+d1=PWC（B0）；**共识=代码本体零阻断**；处置=N1 注释收窄+N3 断言2 字面红证（主控亲笔+取证），B/W 全核销，N2 核销（130=框间节距非框内行距——席读岔注释） | gate1-audit+ruling 行 |
| 门二 | probe 独立复跑**十项全 GREEN**（P1-P7+A1-A3）+主控亲验（e2e 全量 **105/105 Linux 首次全绿** 1.4h+verify EXIT=0 八步）→裁决部 **GO_WITH_CONDITIONS（B0/W3/N2）**——独立复算全过（最强交叉和 3169vitest+105e2e=3274 指纹门）；根因改判+超票面 src 处置**组织合规双成立** | probe+adjudication+ruling 行 |
| 收口 | 指纹门：zcode-link 用例改写经豁免通道登记（reason+rulingLink）→基线再生成吸收（**326·3274·10787**·skipSites 10，豁免清扫 1→0）；locks manifest node 复刻同步（417 绿）；终 verify EXIT=0；提交 **ea4bb77f**（7 文件=[locked-change]）；C1=**F-WINGUARD-01 立票**（盘相对敞口）+C2=票面回写毕；**git ssl 重置毕**（http.sslBackend/sslCAInfo Windows 路径覆盖删除）+旧代理 7890 覆盖删除（直连实测通） | ruling 行 |

成本=本场 subagent ≈3.87M tokens（executor 3.37M+probe 352k+k3 38k+d1 68k+adjudicator 31k）+主控 host。

## §1 下场开工序（单源）

1. **推送执行（唯一阻断项——用户面）**：本机无 GitHub 凭据（gh/token/ssh 全缺，
   Windows 凭据未随迁）。**待用户配凭据**（PAT 或 ssh key）后：`git push origin main`
   ——快进关系已核（merge-base=origin/main=d2be052e，67 笔待推），范围闸 0 雷+
   lock-change-guard 绿（CI 实际口径=范围级任一笔带尾注——ea4bb77f 触发面）本地
   重放毕。推送毕 CI 自动跑（windows-latest 面——本批 Windows 行为不变性三源手算
   在档，预期绿）。
2. **U4 实施批**（平台批毕即开——席位沿 k3 默认席）：aiTasksStore（任务+取消+
   审计行统一 store）+TaskCard 消息区与 Composer 间扩入+E2-E3 随单元落；派发
   简报显式枚举服务组/测试组清单对账票面（v178 教训沿承）。**已知噪声清单随简报
   项已退役**（8 红清零——本批）。**新增高优先参考=F-WINGUARD-01**（低优先——
   Windows 主用场回归时顺手）。
3. **repos 299/300 压线双件拆件方案前置**（v178 沿承——U3 零 repo 接触，预警仍活；
   U4 有 repo 面，简报须含拆件预案）。
4. DB-2 UI 批毕→DB-3 导出快照批（沿承 v176 §1-3）。

## §2 沿承挂账（v179 §2 全沿承+本场增删）

- 沿承面不变：v178 四条+中场档九条+v179 ⑤′（**本批清偿——已转闭**）/⑥′ ps1 缺位
  （locks node 复刻口径本批二用——sync-locks.mjs 重建式在账本）/⑦′ EdgeHandles
  同名异义注记。
- **新增 W2 沿承（裁决部）**：e2e 全量单源问题——后续批次建议全量 e2e 纳入 probe
  复跑面或留机器日志指针（本批可接受：5 目标红双源覆盖）。
- **新增 N1 沿承（裁决部）**：幻影带恰界 innerH=214.7 FP 测度零失配（常量 TOL 方案
  固有，不构成缺陷——登记备查）。
- **新增 F-WINGUARD-01**（本批 C1 落点）：盘相对路径 Windows 面理论敞口——低优先。

## §3 待用户面

1. **GitHub 凭据配置**（§1-1 阻断项——PAT/ssh 任一，配毕告知即推）。
2. Kimi 默认席位=k3（v177 §3-1 修订五沿承；翻案即回 k1）。
3. F-UIRES-04 C/D 呈裁+设计定稿 §7 新呈裁 3 条复核窗口（v178 沿承——非即刻）。

## §4 基线与治理（Linux 口径）

- HEAD=ea4bb77f（平台批单笔 [locked-change]，7 文件）+本档 docs 笔。
- verify（Linux）：EXIT=0 八步全绿；test 步 **3169**（3168+1 新增——3 平台红清零）。
- e2e（Linux）：**全量 105/105 首次全绿**（v179 基线 100+5 平台红）；两几何 spec
  主控+probe 双源 14/14。
- 指纹门基线：**326·3274·10787·skipSites 10·豁免 0**（再生成吸收 zcode-link 用例
  改写+R6 追认链用例+新用例；removed 2=旧快照孤儿）。
- locks **417**；registry：F-PLATFORM-01 翻 done（根因改判回写在票面）+F-WINGUARD-01
  立票 open；architecture/ADR 无触及如实申报（路由容差=常量级行为面微调，不构成
  架构面变更——A/B 段无对应实体；如后续审判定需注记，指针=本档 §0 根因行）。
- 勘误在册：账本 impl 行时间戳 00:35 为笔误提前（实际 ~00:04）——裁决行已勘误。
- 远端：origin/main=d2be052e（推送前态）；repo-local git 配置变更=http.sslBackend/
  sslCAInfo/http.proxy/https.proxy 四项 Windows 遗留覆盖删除（.git/config 不随
  clone 走——新机无复现面）。

## §5 证据档指针（仓外档案区 /home/agent/synapse-archive/scripts-audits/20261012-fplatform01/）

- gate1-audit-pack.md（双席共用自包含审包）/gate2-probe-pack.md（实证矩阵）。
- 原始日志（/tmp 易失，数字已录入账本）：verify-final/verify-close.log（EXIT=0 两证）。
- 账本：runId=20261012-fplatform01 全 8 行（session-open/ruling 根因改判/impl/
  gate1-audit/ruling 处置/probe/adjudication/ruling 条件核销——batch-close 行随
  本档补记）。
- 探针工具件（z-platform-probe.spec.ts 临时件）已删；诊断数据全录本档 §0+账本。
