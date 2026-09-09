[routing]: run=20260909020141-e2qr source=deepseek model=deepseek-v4-flash role=auditor-readonly@de7c6402 cfg=add15c606e1b switches=0 usage=in=4515,out=11258 latency=130206ms (by ds-call-v2 链)

# 审查包 B 终审意见（对抗式只读审核）

## 阻断项（B）

**B1 — check-constitution-budget.mjs：悬垂 BEGIN 可绕过检测**
定位：`const re = /<!--\s*ORG-SEG:BEGIN…-->([\s\S]*?)<!--\s*ORG-SEG:END\s*-->/g` 后仅凭 `segs.length` 判多段。
问题：若 AGENTS.md 为「合法完整段 A + 段 B 有 BEGIN 无 END」，`matchAll` 只匹配段 A，`segs.length === 1`，脚本 PASS。文件头注释声明的「BEGIN 无 END → exit 1」实际不成立。
修正案：应统计全文全部 `ORG-SEG:BEGIN` 与 `ORG-SEG:END` 标记 token 数并配对校验，任何 BEGIN 无配对的 END 即 FAIL；不应只依赖正则匹配产出的段数。

**B2 — skill-gc.mjs frontmatter 解析为脆弱单行处理**
定位：`classify()` 中 name/description 均用 `/^…:\s*(.+?)\s*$/m` 单行提取。
问题：YAML 合法写法（`description: |` 折叠块、`description:` 换行后的缩进行、序列项）会让 description 被截成首行残留（如 `|`），或匹配为空/为 null。后果：合法 active 技能被打为 invalid，在 `--apply --delete-invalid` 下会被整目录移入归档，存在误删风险。
修正案：应至少识别 `|`/`>`/列表体并对多行 description 做延续行合并；无法可靠解析的 frontmatter 只应报告、不得进入可自动删除的 invalid 集合。

## 应修项（W）

**W1 — skill-gc.mjs body 阈值单位错误**
定位：`body.length < 2000`（UTF-16 码元数），但注释与输出声称 `<2000B`；descB/bodyB 统计用的是 `Buffer.byteLength`。
问题：中文正文每字 UTF-16 占 1 码元、UTF-8 占 3 字节，脚本实际放行远超 2000B 的正文，使 redirect 判据的字节限制失去设计含义，扩大误伤面。
修正案：判据统一改用 `Buffer.byteLength(body,'utf8')`。

**W2 — redirect 判据与注释/语义不自洽**
定位：`descRetired` 只测 `已退役|retired`，未测 `重定向|redirect to`；同时注释宣称 description 含退役标记即判 redirect。
问题：description 为「重定向到新技能的说明页」的退役页不会判 redirect，泄漏为 active；反方向，负责描述「退役流程」的 active 技能 description 含「退役」会被误判候选删除。
修正案：description 命中的词表与文件注释统一；对语义二义命中，输出为「疑似」而不直接纳入可删集合，供人审确认。

**W3 — 归档回滚完整性有裂缝**
定位：`--apply` 块先 `renameSync` 全部目标，后 `writeFileSync` 写 GC-MANIFEST.json。
问题：若 manifest 写入失败（权限/磁盘），已移动目录无清单记录，回滚只能靠人工记忆，与「可整目录移回回滚」承诺不符。
修正案：应把清单写入视为归档事务的一部分——先写或边写边移动，且对 manifest 写失败单独输出「已移动但无清单」的显式告警与手工回滚路径。

**W4 — 插件缓存边界是注释承诺而非代码约束**
定位：文件头安全声明「插件缓存目录…不扫描不动」，但实现只扫 `ROOT`，从未检测该目录。
问题：真实边界成立的前提是插件缓存永远不会出现在 `ROOT` 或其扫描范围；但报告输出「常驻 description 总量」若插件技能经其它机制安装/链接进技能根，总量口径会失真。当前实现未扫只是「恰好没碰」，不构成范围证明。
修正案：应在输出中显式声明「本次统计不含插件系统管理目录，若插件技能驻留于技能根则该数不完整」，或探测插件目录存在时打印提示。

**W5 — registry.json 缺文件行为无可验证消费端**
定位：`path_note` 声明「缺文件=装载失败 exit 3」。
问题：本包未附 loader 消费代码，exit 3 只是协议约定；无法确认 `base:"skill_root"` 在装载端实际被解析为技能根且无路径逃逸。
修正案：下一批 C 包应附 registry 消费端实现或最小加载测试证据，否则该口径仅能作为待验证契约记录。

**W6 — 角色档案与 references/06/07 一致性无法核验**
定位：六份角色档案（系统提示+DoD）整体。
问题：送审材料未附 references/06/07，本次审点第④项「口径一致性」缺对照物，不能作实质判断；只能确认 gate1 已免审、其余各档内部未见明显互斥。
修正案：references/06/07 的实际文本应随下一送审批次同包提供。

**W7 — drafter DoD 内部约束存在张力**
定位：drafter.dod「无占位符（不留需再澄清一轮的空段）」与「缺失信息显式列为待澄清」并列。
问题：若不澄清两者优先级，「待澄清」本身是否算空段交由实现者自行解释，DoD 判定将不稳定。
修正案：应定义「待澄清条目在后继轮次必须被设计书覆盖，否则不得作为首轮交付占位」之类的边界。

## 总评与放行意见

修订版在入口双开关、BOM 剥离、单日清单合并上明显改善；但 B1 使预算守卫存在可绕过的未闭合段盲区，B2 涉及自动归档删除面且解析脆弱，两处均属阻断级缺陷。本次不放行，待上述 B 项修正并回附对应机检用例（尤其「完整段+悬垂 BEGIN=FAIL」与「多行 description 技能仍归 active」）后复查。