# 交接书 v127 —— 对齐批单元四 B 半场：词表入 quality+ADR 回写（2026-10-04）

> 前承 v126（单元四 A 收口）。本档=同日续场：单元四 B 票面四项中①④落毕
> （笔 1 词表批+笔 2 ADR 批），②清点毕（清除挂③同场），③基线再生成留下场
> （连续场纪律）。

## §0 本场消耗与开工记录

用户指令=「继续开工」（默认序执行口径=v126 §5：开工序已在交接书=直接
开工不另问）。技能清点：ai-dev-org=用（分级烤验：笔 1 涉脚本批→双审
k1+d1；笔 2 纯文档小批→k1 单审）；verification-before-completion=用
（verify 真退出码亲验——后台 run 通知承载 EXIT=0）；test-driven-
development=不用其形用其神（机检脚本扩段的先红=注入变异红证四支，
cp 备份法）；systematic-debugging=不用（CI 红归因非排障场）；其余=
不用（纯治理面+文档批）。配置=主控单岗（GLM5.3 宿主）；k1/d1 绑定
$max（四子代理派发）。

## §1 基线终态（对不上禁提交）

- 仓库=51d8c57b613（笔 2 ADR 回写 docs）已推送；工作树清洁（账本=本地件
  不入库）；locks 353 同步（manifest 随笔 1 提交）。
- **CI 状态（下场开场必读）**：0f676a81519 的 run 37200539003=failure、
  51d8c57b613 的 run 37201115230 预判同因 failure——**红因≠代码面**（六道
  关卡均 success：lint/typecheck/quality/tickets/unit/build+e2e 全绿，
  词表批+文档批 CI 实跑验证达成）；红=尾注闸 step：笔 1/笔 2 的 commit
  message **正文里写了「尾注评估=不带」的说明文字，裸字符串本身被范围闸
  grep 命中当作携带尾注**，diff（scripts/check-quality.mjs+docs）不在
  test-refactor 战役白名单 → 红。修复=下场任一新提交（干净 message）push
  后 CI 自然绿；两红 run 保留为教训链记录（v126 fe1e96d0b87 同款处置
  先例）。
- 06260db61c1 run 37198635776 红=v126 已预告的锁同步项（补丁已修复，
  勿重复排查）。

## §2 笔 1：负锚词表入 quality（commit 0f676a81519，4 文件 +85/−7）

**交付面**：check-quality.mjs 第 10 段=INV-NEW-1 负锚词表（五项=upsert-node/
addPaperNode/addThemeNode/lineage-add-node/LineageAddNodeDialog——W6 口径；
\b 精确 token+已知边界声明〔词符紧贴变体不在锚面/派生名由契约机检+评审
承载/加词禁正则元字符〕；命中文件逐行定位报行号）+10b 段=defense-lifecycle
登记表行格数校验（竖线恒=6+fail-closed 双哨+边界申报四条——v126 §5 机检
候选落地）+srcFiles 空集全局哨兵+头注清单补录（段 8/10/10b）。defense-
lifecycle.md ㉔ 词表行（退出条件=复合条件主句化：src 持续零命中∧D 批三
DDL∧A1b/A3 收净后主控重评撤段；双评审触发器并录）+㉕ 格数校验行+头注
23→25。invariants.md INV-NEW-1 状态部分→已锚定（锚定面=契约+词表；
A1b/A3 遗留面=㉔ 撤段时点条件非现行锚定缺口）。

**门链**：主控亲执（涉脚本批→全对抗位）→门一双审 k1 首审 **B0W3N5 有条件
放行**+第二席位 **派发失误**（subagent_type 误填 k1 位=两审同源 kimi-third，
B0W2N9——纪律偏差如实记档）→**补派 d1 异构位**（deepseek $max）**B0W0N8
放行**→RR1 回炉（行号定位+已知边界声明+㉕ 登记+catch 短路+trimStart+退出
条件改写+连字符变异补证）→N3 srcFiles 哨兵/N7 INV 缝合随手收。

**实证**：四支变异红证（addPaperNode 标识符词/㉔ 删竖线 6→5/upsert-node
连字符词通道字符串形态〔行号 73 输出实证〕/移除「## 登记表」标题零行哨兵）
+词表 src ts/tsx 与非 ts 双面零命中+单元一删除面符号对账闭合（五项穷尽
有独立回潮威胁面；schema/类型/prop 族=无通道宿主死符号面）+tests 面 19 处
命中定性=历史注记（W6 扫描面排除 tests 与历史档原则自洽）+verify 全链绿
×2（&& 链末步 build 到达）+locks 353。尾注评估=零 tests 触碰+契约面不变。

## §3 笔 2：ADR-0014 v1.5+architecture §6 回写（51d8c57b613，2 文件 +31）

ADR-0014 修订记录 v1.5（沿 v1.1~v1.4 体例）：paper_id 可空语义应用层全域
退役——节点唯一来源两路（INV-NEW-1）；通道拆分换名零增减（现数=api-
surface-closure 通道 pin 承载——实测 pin=61，历史=56→61→60→61）；DDL 现文
=004/006/007/010/012/**013**/014（013 边 via 路点列补录——门一 N4 实测
修正）。architecture.md §6 追加 F-ALIGN-01 批次段（体例沿前段同型）。
门链=主控亲执→k1 小批单审 **B0W1N4 有条件放行**→W1 裁决销项（㉓ 实覆盖
三 DDL 含 papers.folder_id NOT NULL——§6 指针正确，审包事实节漏列所致）
→N3 呈裁表述修正（三呈裁=D3/D4/D6，D1/D2 属首轮）+N4 实修→N1 拆分术语/
N2 pin 路径裁量不改。两文件均不在受锁面（manifest 353 不含）——零受锁
触碰。verify 后台 EXIT=0（通知承载真退出码）+中文可读验证（FFFD 零命中）。

## §4 挂账与下场首办

- **③基线再生成+②stale 清除（同场连续执行——本场已备好弹药）**：
  npm run test-surface:baseline+全量 diff 审计（信任根操作整场禁断档）；
  完成后同场执行 stale 条目清除（当前实况=entries 502/hits 345/stale 157
  ——check 官方口径；本场自算 342/160 有 3 条键归一化微差，**删除必须用
  check 同源口径**）。清点结论已备：死因三分类=整文件退役 6 条/case 改名
  或措辞复用 72 条/完全消亡 82 条；主体=F-LGRAPH-01（142 条级）+
  F-FOLDER-01+feedback 批历史豁免。清除=exemptions 受锁变更+[locked-change]
  +check 绿。②③毕=对齐批收官（含 v124 立案的工具条几何遮挡 B 批票另行）。
- **A 批余项**（A1b/A2/A3）：需用户明确指令（v124 口径）。
- 通道 pin=61（F-UIRES-01 批 B +papers/delete）——若下场动通道面须意识化
  更新 pin。

## §5 新会话开工序

1. CI 首查：51d8c57b613 的 run 37201115230 若红=§1 预告项（尾注闸非代码
   面），以新 push run 绿为准；随首笔提交恢复。
2. ③基线再生成+②清除同场启动（预留完整一场）。
3. 视指令穿插 A 批余项。

## §6 操作条款新增（承 v125/v126 §5 全项外）

- **commit message 禁提尾注裸串**：正文说明「评估=不带某尾注」时，裸字符串
  （方括号形态）会被 CI 尾注闸 grep 命中当作携带（本场两 run 红实录——
  六道关卡全绿仅尾注闸 step 红）。写法=「test-refactor 尾注评估=零 tests
  触碰故不带」等无方括号表述；文件内容不受限（闸只查消息面）。
- **门一派发 subagent_type 亲验**：双审派发时核对第二席位=ops-gate1-d1
  （本场误填 k1 致同源化，补派修复消耗一轮+如实记档）。
- **自写对账脚本口径声明**：与 check 同名口径的旁路计算若差 1~3 条（键
  归一化），结论方向可用但**删除/修改类操作禁用旁路口径**（须同源工具）。
- **审包事实节完整性=门审可裁性前提**：事实节漏列（如 ㉓ 三 DDL 只列其一）
  会产生「包内不可裁决」的伪 Warning——审包事实节须全量列被引对象的
  关键事实。账本（本地件）623→625。
