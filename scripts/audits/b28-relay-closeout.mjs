// b28-relay-closeout: relay.md 批次日志追加+勾选+板头复位（tmp+rename 原子写）
// 逐行前缀替换（无正则自伤——b26 教训①）；批次日志插入锚=「## 批次日志」段头后（倒序最新在上）。
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const RELAY = 'docs/handoff/relay.md';
const NOW = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

const LOG = `### batch 28 — 2026-09-19（执行者会话：第六波 F-PROC-01 制度批单票，完成）
- claim: claim-1789808431856-b28｜认领 2026-09-19T09:00:31Z｜收口 ${NOW}｜勾选 33→34。
- 开场三态：B 态变体——唯一脏面=调度员 last_dispatch 原子写（03:19:21Z 本批发布笔，随本批收口提交）；HEAD=batch 27 提交 4bf093b96e 正确。本批系用户直接指令开批（板头「手动会话直接按本板清单领批=有效开工授权」径，两径同规）。
- 技能清点：batch-relay（用——认领收口）、ai-dev-org（用——组织主干/门审矩阵/ORG-12 审包/health-scan/账本补记/烤验表=文档制度批轻量双审+门二实证并集）；TDD=纯文档批无新用例面（b27 同口径——验证=verify 零漂移+计数实测）；verification-before-completion（用——三轮 verify 变量法亲验）；systematic-debugging 不加载（制度批无排障面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor 未绑定形态（2026-09-19 用户裁决随宿主模型——账本记 session:host-tier+E3 欠账；b27 model-not-found 未再现=未绑定化生效实证）；门一=ops-gate1-k2 绑定（kimi k3 $max，zipoo——用户指令 k1 周额度封顶禁派，k2 第四票连续正常承载）；门二=ops-adjudicator 绑定（deepseek-flash $max）——门审对实现面（宿主 GLM5.3）均异构成立。
- **交付（制度批 11 行落点/6 文件 +55/−5 终态口径——门二 P2-2）**：①AGENTS DoD 增「本票触及的 ADR/架构段落已回写」checkbox（裁决 9）；②methodology 治理五指标→**八指标**（+reader 占 src 比 37.2%/COMPOSITION_ROOT_ALLOW 7/单例清单 13 三数，口径单源=该段）；③COMPOSITION_ROOT_ALLOW 冻结规矩（新例外=用户级裁决）+P11 句收紧互指（单源=§4）；④P10 增 M2 制度预防句（平行新实现路线须声明并存理由+退役触发线）；⑤methodology §4.5 直调类派发账本补记规则（F-ALIGN-01 断流 9 天根因落法——findings 对象形即时补记）；⑥裁决 14（health-scan 并行不并入 verify）入 §4.4；⑦登记册形态规约（≈400 字级 ADR 化；存量 INV-27 ~900 字历史叙述红线不回拆——b27 移交裁量③落档）；⑧交接书固定段：事故档回流行（两形态通用句——修复三周断链）；⑨audit0-findings 头部职能注记（「唯一登记处」声明失真勘正，标题原文保留——移交②）；⑩ADR-0013 复审状态段+ADR-0015 P8+ 候选复审巡检注记（移交①——survey ③ 余项显式化）；⑪weak-anchor W-11 新增（P7E-04 还原项登记，触发线=下次合法触碰 ipc-deps.ts）。受锁面：check-quality.mjs/tests/shared 零触碰（制度句单源 methodology——P3）。
- **门审（回炉 0）**：门一 k2 **PASS_WITH_WARNINGS B0/W5/N5**——票面+移交全落地/受锁零触碰/数字全符/报告诚实；W1 裁决 9 日期失准（09-19→09-17 裁出日）/W2 回流句 §4 节号与 P9 §5 冲突/W3 汇出主体门二 vs 主控互斥（既存缺陷被新句放大）/W4 align01 引用无前缀（门一四处候选漏测 docs/reports/ 前缀——主控实测存在补全）/W5 冻结规矩与 P11 双源——**七处修缮（W1×2/W2+N2/W3/W4/W5/N1）主控三分法处置后复跑 verify EXIT=0**；N3 收口三数兑现义务/N4 .log 命名纪律沿 b24~b27 惯例 add -f（P2-1 留痕）/N5 措辞级不动。门二 **GO_WITH_CONDITIONS P0=0/P1=4/P2=3/N=5 回炉 0**——七处修缮终态实物逐条核验通过+双 verify log 逐位一致+锁链 381→382 对账+**规则 3 碰撞预判绿**（methodology 零命中+F-DOCGOV-01 同 file 锚已绿双证——翻票后 open 2/locks 383 预判逐位兑现）；P1 四条件收口全兑现（P1-1 flip 探针五规格/dry 跑/即写即锁 383、P1-2 终跑读数对账、P1-3 staging 显式列件含 add -f、P1-4 三数+锁链+勾选本段兑现）；P2-2 计数口径=+55/−5 终态（impl 报告 +51/−3 系实现时点，两数各自正确）；P2-1 .log 惯例留痕（本句即档——建议后续微票二择一改纪律句或惯例化）；registry 立案数字 38%/约 10 与终态册 37.2%/13 并存=预裁「以册实测为准」口径注记。**门一/门二报告均主控代落档（ops 岗物理工具面无写通道——回执内联逐字落盘零改写，本票新形态申报）**。
- **机检终态**：实现者首轮 verify EXIT=0（零漂移）→修缮后 postfix verify EXIT=0（顺序铁律）→翻票 FLIP_EXIT=0（FLIP_MOVED=1/open 2）→locks 383（382→383 flip 探针即时登记）→**closeout verify EXIT=0**（open 2+locks 383+Test Files 167/Tests 1724+指纹门 183·1768·5368·skip14 恒等+产物 index-DW6Z3WXp.js 1,388.14 kB 同名同尺寸=零 src 直证）；e2e 不跑（纯文档批——b27 门二 N-4 同口径）；**health-scan RED×0 WARN×1**（cfg 漂移=org-config 09-19 三岗未绑定化裁决衍生登记面非本批引入——账本末行 cfg_hash 仍旧值，回显计数 W-1 义务兑现）；账本 87→90 行=executor+gate1 k2+adjudicator 三行补记（findings 对象形，仓外临时 .cjs 用毕即删）。
- 教训三条：①**主控简报总则计数笔误第二现**（「9 文件」vs 表体 6 文件——b26「14 用例」同族；总则行与表体冲突时表体是唯一权威，简报总则数字落笔前与表体对账）；②**ops 岗写通道缺失=报告回执内联+主控代落档**（k2/adjudicator 物理工具面 Read-only——派发简报预置回退条款「全文随回复内联」+落档零改写声明，避免证据灭失）；③**门一指针存在性核验的候选枚举陷阱**（W4：四处自测候选恰漏 docs/reports/ 正确前缀——指针核验优先按被引文件目录惯例枚举而非文件名穷举，门二 P2-3）。
- Rulings 待用户：无新增（票内自裁含 INV-27 不拆+形态规约落册/audit0 标题保留+注记勘正/W-11 触发线形态/ADR 复审注记同型修订记录段/check-quality 零触碰单源裁量均经门一裁+门二逐条复核闭合；移交三项裁量全部落档）。**第六波余一项：F-STOR-01（存储批：audits 出库归档+manifest 同步 [locked-change]+AGENTS 三桶口径①修订呈批+本机 52M 清理——含 P2-1 后续微票建议裁量位）。**
- 无进展计数：归零（33→34 有进展）。

`;

const lines = readFileSync(RELAY, 'utf8').split('\n');
let st = false, cl = false, hb = false, cd = false, npc = false, bc = false, tick = false, ins = false;
const out = lines.map((line) => {
  if (line === '- status: RUNNING' && !st) { st = true; return '- status: READY'; }
  if (line.startsWith('- claim: ') && !cl) { cl = true; return '- claim: -'; }
  if (line.startsWith('- heartbeat_utc: ') && !hb) { hb = true; return `- heartbeat_utc: ${NOW}`; }
  if (line.startsWith('- checked_done: ') && !cd) { cd = true; return '- checked_done: 34'; }
  if (line.startsWith('- no_progress_count: ') && !npc) { npc = true; return '- no_progress_count: 0'; }
  if (line.startsWith('- batch_count: ') && !bc) { bc = true; return '- batch_count: 1'; }
  if (line.startsWith('- [ ] F-PROC-01') && !tick) { tick = true; return line.replace('- [ ] F-PROC-01', '- [x] F-PROC-01'); }
  if (line === '## 批次日志（追加，勿改写）' && !ins) { ins = true; return line + '\n\n' + LOG.trimEnd(); }
  return line;
}).join('\n');

if (!st || !cl || !hb || !cd || !npc || !bc || !tick || !ins) {
  throw new Error(`guard failed: st=${st} cl=${cl} hb=${hb} cd=${cd} npc=${npc} bc=${bc} tick=${tick} ins=${ins}`);
}

writeFileSync(`${RELAY}.tmp`, out);
renameSync(`${RELAY}.tmp`, RELAY);

const back = readFileSync(RELAY, 'utf8');
const ok = back.includes('- status: READY') && back.includes('- claim: -') && back.includes('### batch 28') && back.includes('- [x] F-PROC-01');
if (!ok) throw new Error('closeout verify failed');
console.log('RELAY_CLOSEOUT_OK ts=' + NOW);
