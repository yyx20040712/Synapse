# F-PROC-01 实现者报告（b28——制度批）

## 实现摘要

- 开工技能清点：TDD 红绿=不适用（纯文档批，简报④明示豁免——零新用例面）；
  verification-before-completion=用（verify 真退出码落盘）；systematic-debugging=
  不用（无缺陷排查面）；git-advanced-workflows 等=不用（简报①禁 git 写操作）。
- 落点表 **11 行全数落笔**（#2 含 (a)(b) 两子改），零 src/零 tests/零受锁脚本
  触碰（locks:check 382 绿=六文件均不在受锁面）。
- 票面六子任务 ↔ 落点映射（简报④）：①ADR 回写 DoD 项=#1；②事故档回流段=#3；
  ③治理指标扩三=#2a；④冻结规矩+M2 增句=#2b+#4；⑤直调账本补记=#6；
  ⑥裁决 14 入册=#5；b27 移交三项裁量=#7（INV-27 落规约不拆）+#8（audit0）
  +#9/#10/#11（survey ③ 余项显式化）。
- 基线数取简报值（37.2%/7/13）非票面值（38%/约 10）——简报为准（GEOM 战役后
  实测更新），三数本实现者落笔前已独立复测吻合（见计数实测表）。
- 每处编辑后 grep 中文可读验证全过；verify mojibake 关卡绿。

## 文件清单（落点表实际涉及 6 文件、11 行编辑；简报写「9 文件」——见疑虑 1）

| 文件 | 编辑 | 内容 |
| --- | --- | --- |
| `AGENTS.md` | #1 | DoD 清单末项后追加「本票触及的 ADR/架构段落已回写」checkbox 行（裁决 9） |
| `docs/methodology.md` | #2a | §4 引言 blockquote 治理五指标→八指标：原五数保留+三新数（reader 占 src 比 37.2%=11,514/30,974 行含 CSS；COMPOSITION_ROOT_ALLOW 7；模块级单例 13=zustand 11+toast-store+annotation-undo，INV-70 附件单源随其滚动）+口径句（单源=本段/分母含 CSS/滚动载体两形态通用） |
| `docs/methodology.md` | #2b | 紧随新增独立 blockquote：COMPOSITION_ROOT_ALLOW 冻结规矩（新增例外=用户级裁决） |
| `docs/methodology.md` | #3 | 再新增独立 blockquote：交接书固定段·事故档回流行（裁决 9——修复三周断链） |
| `docs/methodology.md` | #4 | P10 段末增段：M2 制度预防（工单规约增句——并存理由+退役触发线） |
| `docs/methodology.md` | #5 | §4.4 顺序铁律后同缩进追加：health-scan 与 verify 并行不并入（2026-09-18 裁决 14 落档） |
| `docs/methodology.md` | #6 | §4.5 成本账本行后追加条：直调类派发账本补记规则（F-ALIGN-01 核查落法） |
| `docs/methodology.md` | #7 | §2 末「预登记要克制」后追加条：登记册形态规约（survey D-2 处置；INV-27 历史红线不回拆） |
| `docs/audits/audit0-findings.md` | #8 | :1 标题保留原文，其后插职能注记 blockquote（「唯一登记处」声明失真勘正——survey ⑤） |
| `docs/adr/0013-backup-restore-posture.md` | #9 | 「## 后果」段后文件末尾新增「## 复审状态（2026-09-19 F-PROC-01 巡检注记）」 |
| `docs/adr/0015-ai-ingest-and-sidecar-protocol.md` | #10 | 文末「## 修订记录」段内追加复审巡检一条（D utilityProcess P8+ 候选） |
| `docs/audits/weak-anchor-register.md` | #11 | W-10 行后表格追加 W-11（INV-56 已知还原项独立登记，b27 移交） |

## 计数实测表（全部机器输出，落笔前实测）

**三基线复测（#2a 落笔依据）：**

| 指标 | 简报基线 | 实测命令 | 实测值 | 判定 |
| --- | --- | --- | --- | --- |
| reader 占 src 比 | 37.2% | `find src/renderer/features/reader -name "*.ts\|*.tsx\|*.css" -exec cat {} + \| wc -l` 等 | reader=11,514 行（69 文件）；src 全域=30,974 行；11514/30974=37.2% | 符 |
| COMPOSITION_ROOT_ALLOW | 7 | `sed -n '93,101p' scripts/check-quality.mjs \| grep -c "\['src/"` | 7 | 符 |
| 模块级单例清单数 | 13 | `docs/invariants.md:86` INV-70 附件清单原文核对 | 13=zustand store 11+toast-store+annotation-undo | 符 |

**编辑行数（git diff --numstat，仅本实现者六文件）：**

| 文件 | +行 | −行 |
| --- | --- | --- |
| AGENTS.md | 1 | 0 |
| docs/methodology.md | 33 | 3 |
| docs/adr/0013-backup-restore-posture.md | 6 | 0 |
| docs/adr/0015-ai-ingest-and-sidecar-protocol.md | 4 | 0 |
| docs/audits/audit0-findings.md | 6 | 0 |
| docs/audits/weak-anchor-register.md | 1 | 0 |
| **合计** | **51** | **3** |

methodology.md 改后 370 行（≤500 合规）。

**verify 基线对照（b27 终态 → 本批后）：**

| 项 | 基线 | 实测 | 判定 |
| --- | --- | --- | --- |
| verify 退出码 | 0 | **exit=0**（`set -o pipefail` 管道保真，落盘 b28-proc01-verify-final.log 尾行） | 零漂移 |
| Test Files | 167 | 167 passed (167) | 零漂移 |
| Tests | 1724 | 1724 passed | 零漂移 |
| 指纹门 | 183·1768·5368·skip14 | files 183/183｜cases 1768/1768｜assertions 5368/5368｜skipSites 14/14 | 零漂移 |
| locks | 382 | 382 个受锁文件与 manifest 一致 | 零漂移 |

## 自裁申报（超简报面决定，全部待门审裁）

1. **换行重排（格式级）**：落点表各条内容为逻辑串，按 methodology.md 既有
   ~78 列折行风格落盘；内容零增删。
2. **句读补全**：#2b/#3/#5/#8/#9/#10 六处段尾补句号「。」（简报原文无句号），
   与全册句读惯例一致，语义零变化。
3. **verify 退出码取法**：协调指令 `npm run verify 2>&1 | tee …; echo exit=$?`
   在 bash 下捕获的是 tee 退出码（恒 0）——改以 `set -o pipefail` 前缀执行同
   管道，使 exit= 反映 npm 真退出码（严于指令字面，非放宽；与简报④
   `npm run verify; echo exit=$?` 原意一致）。
4. **过程失误即时自纠（留痕）**：编辑 #2b 一步误将「### 4.1」标题行临时带上
   `> ` 前缀（标题会变 blockquote 行），随即下一笔 Edit 修正；Read :156-172
   复核结构无损、verify 绿佐证。

## 疑虑

1. **简报内部计数不一致**：总则「共 9 文件恰 10 处编辑」+报告契约「恰 9 文件
   逐件列」vs 落点表实际 11 行编辑、6 个不同文件（表尾注「表 11 行=10 处
   methodology/文档编辑+AGENTS 1 处；#2 含 (a)(b) 两子改」自洽于 11 行）。
   以表体为准全数执行，未为凑文件数扩面；请主控核对「9」是否另有未列出
   的落点（若有漏发行属简报缺行，非实现者可自裁面）。
2. **工作树预存改动（非本实现者，门审 diff 归因需剔除）**：
   `docs/handoff/relay.md`（+61 行）、`locks/manifest.json`（b28-claim 骨架
   入锁）、未跟踪 `scripts/audits/b28-claim.mjs` 与本简报件——均系主控派发面。
3. **verify 日志入库形态**：`b28-proc01-verify-final.log` 被根 .gitignore
   `*.log`（:13）拦；b27 先例（b27-docgov01-verify-final.log）为 tracked。
   收口入库需 `git add -f` 或按 methodology §4.1 证据纪律改 `.raw.txt` 后缀
   ——主控收口裁量（本实现者禁 git add，不动）。
