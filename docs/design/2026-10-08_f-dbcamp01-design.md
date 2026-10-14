# F-DBCAMP-01 DB 战役·设计书 v1.3（DB-3 落纸终裁稿）

> 版本沿革：v1.0 拟定（ops-drafter）→auditor 首轮（B4/W16/N8 返工）→v1.1
> 回炉轮 1→auditor 二轮（B1/W8/N8 返工收窄；首轮 28 条处置=22 闭合/6 转移/
> 0 未闭合）→v1.2 末轮回炉稿（回炉 2/2 用尽——余项主控终裁承接）→
> **v1.3 DB-3 落纸终裁稿（2026-10-14 主控亲笔——§12 四问主裁「丙→甲复合」
> 甲授权：删事件日志+六项落纸条件一并处置；§13）**。
> runId=20261008-dbcamp-open。用户四裁决（2026-10-07 夜逐字，账本 ruling 行）
> 为硬约束。

## 1 背景与目标

产品定义、四裁决逐字引录、主控预裁同 v1.0/v1.1 §1（不改，援引——本稿为
链式修订终版）。v1.2=末轮回炉：B1 护栏机制定稿；W1-W8 闭合；N1-N8 处置。

## 2 语义条款表（增量更新，余同 v1.1）

| 术语 | 口径 |
|---|---|
| snapshot_seq | 每 owner 单调序号，app_meta 持久；接收方高水位拒旧 |
| envelope / payload | manifest=envelope{format_version,snapshot_seq,owner,table_counts,payload_sha256}+payload{data,pdf_refs}；确定性口径=payload 字节恒等（INV-D 修订） |
| 删除护栏 | 三闸全过才执行对账删除：seq>高水位 ∧ 结构校验通过 ∧ 缺席量≤阈值（默认 20% 且 ≤50 行，估算呈裁）〔**v1.3 改写=删事件日志形态——§13.1，本行仅存史**〕 |
| 摘录选择函数 | 前缀摘录=纯结构选取（(updated_at,id) 序），只依赖 (scope,ctx_ver)；FTS 检索=消息相关尾段，不入前缀 |
| app_meta | DB-1 新增键值表：owner_id/snapshot_seq 载体 |
| 冲突相等键 | (updated_at,id) 全等=入站拒收+冲突登记（A7） |

## 3 B1 护栏选型论证

> 〔v1.3 注：本章 a+b+c 三层护栏栈已被 §12 A1 主裁改写为删事件日志
> （§13.1）——B1/B2 由此整体消解；本章仅存论证史，实施以 §13 为准。〕

候选：a 代际序号+拒旧 / b 删除确认阈值 / c 残卷校验 / d 删除显式指令化
（对账仅报告）。定稿=**a+b+c 三层叠加**。d 否决论证：删除自动化是裁决②
聚合语义内生需求（文献删除须传导导师视图），纯报告制把确认成本转嫁导师
端；且人工通道已被 b 层覆盖，d 无增量安全。
闭合矩阵：案例①恢复旧备份→seq 回退<高水位→**整卷拒收**（不删）；案例②
残卷→payload_sha256/table_counts 结构校验拒收；「空而合法」卷→缺席 100%
超阈值→转隔离报告待人工（不清空）；案例③双机均恢复旧→双方 seq 均≤高
水位→互拒，服务端无损。到达序敏感=高水位单调消除。确定性：sha256 计算
于 canonical payload；seq 居 envelope 不入 payload 确定性口径。

## 4 推荐与理由

维持 v1.1 全部路线结论；变更点=B1 三层护栏栈、摘录函数纯化（FTS 出前缀）、
app_meta 落地 owner/seq、迁移重编号（§5.c）。

## 5 详细设计

### 5.a AI 域（W1/W2/W3/W4 闭合）

**摘录选择函数**（W2，二择一定稿）：前缀=骨架+结构摘录（各来源表
(updated_at,id) DESC 限额）+激活记忆——纯函数 f(scope,ctx_ver)，可测契约=
同键两次装配字节相等；FTS MATCH 仅服务**消息相关尾段**（随当前消息现算，
不入前缀、不入缓存键）；空召回=仅发前缀+meta 标注。
**scope 集合↔注入面对照表**（W4；规则=注入面⊆epoch 集合，INV-J）：

| 档 | 注入元素→来源表 |
|---|---|
| paper | 元数据+文件夹名→papers+folders；标签→tags+paper_tags；笔记摘录→notes；标注→annotations；集合名→collections+paper_collections；记忆→ai_memory |
| lineage | 图结构→lineage_graphs/nodes/ref_edges；节点文献+core idea→papers+notes；文件夹名→folders；记忆→ai_memory（annotations/tags **不入** lineage 档——尺度决策声明） |
| global | 静态件（无表）+ai_memory |

**epoch 三缺口闭合**（W1）：①触发器=UPSERT 自愈合（INSERT…ON CONFLICT
DO UPDATE epoch+1，缺行即建）+迁移播种集合全表行+**元测试枚举「集合表↔
触发器↔计数行」三者一致**；②016 重建配**前后对象多重集相等断言**
（sqlite_master 索引/触发器/视图清单对比——foreign_key_check 不覆盖对象
缺失）；epoch 基建归属=020（DB-2，晚于 016 重建，不在重建路径上；016
多重集断言覆盖其时现存对象=FTS 触发器族）；③计数器表无 DB-2 前消费面
（导出不依赖），钉死 020——若前置消费面出现则拆 020a。迁移配测=每集合
表 INSERT/UPDATE/DELETE 各致 epoch 递增断言。
**trigram 门**（W3）：验收判据=固定语料 fixture×查询类集｛单字/二字词/
三字词/英文/混排｝断言命中集；二字中文（<3 字符）零召回风险→**回退=短
查询走应用层 LIKE '%…%' 路径**（单人规模可承受，排序同 (updated_at,id)）；
门不过=启用回退+偏差落档。
其余同 v1.1 §5.a（预算/双层缓存/记忆淘汰/手动触发链/出网 β）；索引清单
为 020 定稿锚（N4）；**估算器校准任务入 DB-2**（代表性语料对照目标
tokenizer，偏差>20% 调系数，N5）。

### 5.b 导出快照（B1/W5/W6/W7 落点）

**两段式 manifest**：envelope+payload（§2）；INV-D 口径修订=payload 字节
恒等。
**接收方流程（五闸）**：①结构校验（JSON 完整/payload_sha256 对账/
table_counts 与实载行数一致/format_version==当前）→②seq>本 owner 高水位
（否则整卷拒收+记录）→③upsert（比较键 (updated_at,id)；**全等=拒收该行+
冲突登记**，A7）→④对账删除：缺席≤阈值（默认 20% 且 ≤50 行，估算）执行，
超阈=隔离报告人工确认→⑤更新高水位。〔v1.3 注：②-⑤已改写=六闸+删除
直执（§13.2）——本流程仅存史。〕
**owner_id 生命周期**（W7 三缺口）：生成=首运行 uuid 写 **app_meta**
（DB-1 落地，不依赖 settings 实测——缺口①闭合）；恢复己备份=app_meta
随库走，身份延续（seq 回退由护栏拒旧兜底）；导入他人快照=只读独立命名
空间展示，**不并库不接管 owner_id**（缺口②）；重装新 uuid→设置页「导入
既有身份」手动认领入口（高级操作+警示文案；缺口③）。
**文件面**：只补不删（N3 声明预期；孤儿 GC=服务端职责，裁决②边界内）。
**版本语义**（N2 明写接受）：format_version=数据格式版，传输通道特性不
混用；读取窗=仅当前版（v1 单导出端，接受错峰不互同步）；升 delta 通道的
体量阈值=待实测锚定，未定不写虚数。
**PK 门可判定化**（W6）：①DB-1 首动作=pk 形态 schema 实测落档（pragma
table_info 输出）；②自增→021 uuid 迁移为 DB-3 前置；③DB-3 收口门=
**双机合并受控演练**（两库同 owner 异行集→断言零覆盖零丢行）。责任方=
DB-1/DB-3 实施者。

### 5.c DDL 迁移面（重编号 016-021）

016 folder_id NOT NULL（12 步规程同 v1.1；INSERT SELECT **显式列清单**
防列漂移，N1；前后对象多重集相等断言）。017 is_starred+partial index。
018 **app_meta 键值表**（owner_id/snapshot_seq 载体）。019 tags 多域
（9-新-7 硬前置、导出冻结绑定不变）。020（DB-2）AI 表族+change_epochs+
UPSERT 触发器。021 预案=uuid 列（W6 条件触发）。**folder 删除路径**
（N8）：app 级拒删非空文件夹（推荐口径，先移文献）；FK 动作清单实测后
定 DDL；配测试（DB-1 审计/DB-4 实现）。回滚=备份恢复，备份演练=DB-1
前置硬门不变。

### 5.d 其余需求面

同 v1.1：②.trash/ 隔离；③019+DB-4 UI 下拉；④017+卡片标志区；⑤5.a
三入口；⑥治理页+受锁脚本。

## 6 测试面影响（增量）

新增：epoch 三一致元测试+逐表 I/U/D 递增断言；016 对象多重集断言；摘录
函数确定性用例（同键字节相等）；trigram 验收集+LIKE 回退用例；**护栏
用例族**（旧 seq 拒收/残卷拒收/超阈隔离报告/阈内删除）；双机合并演练；
owner 生命周期用例（生成/恢复延续/导入不接管/认领入口）；folder 拒删
非空用例。余同 v1.1。

## 7 INV 面（增量）

INV-D 修订=确定性口径限 payload（envelope 除外，显式声明）；**INV-I
新增**=快照高水位拒旧（seq 单调）；**INV-J 新增**=注入面⊆epoch 集合
（来源表必配触发器）；**INV-K 新增**=对账删除双闸（结构校验+阈值）。
余同前。

## 8 实施单元切分（定稿）

DB-1：硬门=备份演练+pk 形态实测+FK/依赖清单；016/017/018/019+folder_id
消费面+repair CLI。DB-2：020+AI 全链；首动作=trigram 门；估算器校准。
DB-3：前置=021 条件落；导出+护栏+对账；收口门=双机演练。DB-4：治理+
folder 删除+TAGS-02 UI。

## 9 呈裁与未决门表（N7 集中管理）

| 项 | 内容 | 推荐 | 门前置 |
|---|---|---|---|
| 9-新-1/2/3/4/6 | 同 v1.1 | 维持 | — |
| 9-新-5（改写） | β 经自建服务端中转，三要素入裁决：①文献摘录/元数据经服务端**转发至第三方模型 API**（出网终点声明）；②服务端离线=AI 全域不可用（单点，文献功能无碍）；③密钥托管=模型 key 存服务端、客户端仅存访问 token。服务端实现=战役外任务书；本仓交付=客户端+协议契约文档（N6） | β+三要素接受 | DB-2 |
| 9-新-7 | TAGS-02 细节补全 | — | DB-1 |
| A1（改写） | 删除传播=恒全量对账+三层护栏（seq 拒旧/结构校验/阈值默认 20% 且 ≤50 行） | 采纳+默认值 | DB-3 |
| A2 | owner=首运行 uuid 落 app_meta | 采纳 | DB-1 |
| A3 | 时钟域=单机，LWW 防御性 | 接受 | DB-3 |
| A4/A5/A6 | 同 v1.1 | 维持 | DB-2/DB-2/DB-1 |
| **A7（新）** | 冲突相等键=入站拒收+冲突登记；同 owner 多机并发写=v1 范围外声明 | 采纳 | DB-3 |
| W6 判据 | pk 实测+双机演练 | 采纳 | DB-1/DB-3 |

## 10 修订记

v1.0 首版。v1.1 二轮（B1-B4/W/N 28 条处置）。v1.2 末轮：B1 三层护栏栈
定稿（seq 高水位+结构校验+删除阈值）；摘录函数纯化 FTS 出前缀；epoch
UPSERT 自愈+三一致元测试+016 对象多重集断言；app_meta 落地身份/序号；
trigram 验收集+LIKE 回退；manifest 两段式+INV-D 口径修订；迁移重编号
016-021；9-新-5 三要素/A1 护栏/A7 相等键；未决项汇单门表。余项=主控
终裁承接。**v1.3（2026-10-14）：DB-3 落纸——A1 改写=删事件日志（用户
四问主裁）；三审六项落纸条件对位闭合；021 号改派（pk 实测推翻 uuid
前置）；R4 空键高水位/R5 库级 token 定夺；A8 传输安全专项（中继云不可
信→E2E）；导出面九表定稿；实施单元 U1-U4 切分（§13）。v1.3 r1（同日，
ops-auditor 对抗审 B2/W7/N7 全处置）：B-1=同库多副本同 seq 第三态封堵
（闸③前置自检 self_reimport+同键异内容 seq_conflict 拒收+同库单写者
声明）；B-2=A8 构造参数面落纸（HKDF 三钥分离/随机 nonce+量级论证/全
字段 MAC+AAD/canonical 序列化规则）；W=①blob 标识密钥化 HMAC ②
deletion_events 剪枝约束+隐私申报 ③021 判定补复合主键/FTS 重建/schema
兼容窗 ④触发器单事务原子性声明 ⑤降级形态闸①显式化 ⑥演练判据断言集
⑦拒收原因码表；N=①skew 接受+同 updated_at=A7 键相等拒收 ②「六项/
七面」勘误注 ③水位细则三则 ④呈裁补两项（密钥丢失代价申报+lineage
归属确认）⑤表清单一行式+deletion_events=协议元数据定位 ⑥事件集不进
  LWW+卷级幂等比较=payload_sha256 ⑦旧护栏零代码实现指认（实现票红线=
  发现残存守卫即删）。**r2（同日二轮，auditor delta 复审有条件放行
  B0/W5/N7 处置）：W1=payload_sha256 定义域闸③现场锚定（canonical
  数据行+deletions 全量+在 MAC 面）；W2=导入日志 schema 落纸（owner/
  seq/payload_sha256/outcome——已见面=仅 applied，失败尝试不并入）；
  W3=逐表身份矩阵（九表→主键→序列化→冲突目标；paper_tags 唯一复合/
  lineage_graph_meta 唯一 KV）+捕获面矩阵（OR REPLACE 全仓零命中实照/
  019 级联链两端同构自愈+recursive_triggers=OFF 前提）；W5=直执落账
  抑制（deletion_log_guard 守卫表+触发器 WHEN+同事务复位）；N1=nonce
  量级勘正 7.6 个数量级（原「十个」误算）；N2=演练改异 owner 双库+
  灾备用例不在 v1 申报；N3=owner/seq 自称值标注+null 降级；N4=AAD/
  MAC 排除 hmac 字段本体；N5=A7 粒度=行级声明；N7=HKDF 常数盐+sync_
  key 256bit CSPRNG 声明。**r3（同日终核轮，auditor 全文逐字核验=
  有条件放行 B0/W2/N9 全处置）：W1=⑤「全等」细分消歧（键等且内容等
  =幂等 no-op 常态跳过/键等且内容异=A7 拒收登记——v1.2 原文按字面
  会误伤每次同步的未变更行）+演练⑨次轮同步零冲突回归锁；W2=payload_
  sha256 摘要域单源声明（数据行+pdf_refs+deletions 三件合一——r2 括注
  漏 pdf_refs 勘正）；N1=闸③内序决策表（applied 同 sha 幂等出口先于
  水位比较/异 sha=seq_conflict/无记录且≤水位=seq_stale）；N2=导入
  日志长期保留+裁剪退化申报；N3=deletion_events 增 UNIQUE(entity,id,
  deleted_at)+INSERT OR IGNORE 去重（与 append-only 拒写防御语义兼容
  论证）+deleted_at 取时勘误=触发器内 DB 时钟 ISO（原「应用层」不可
  达）；N4=级联收敛论断收窄（限条件句+LWW 保留较新副本的永续分歧面
  申报）；N5=重装 owner 重生=旧卷异源可达恢复路径申报接受；N6=「id
  不复用」不变量登记（防复活过滤正确性前提）；N7=「禁 OR REPLACE」
  quality 规则挂卡+guard 开库断言 stop==0；N8=演练 seq_conflict 构造
  法（持钥自签注入）+decrypt_fail/hash_mismatch 细分+struct_invalid
  owner 记 null；N9=PDF blob 传输通道=v2 边界申报。**r4（2026-10-14 U1
  实施批收口，主控亲笔——门一双席 k3-N1/d1-E 必办项）：§13.1 捕获面
  矩阵③勘正——r2-W3 原文两处事实错误：〔甲〕「FK 级联删除=仅 019
  tags.folder_id→collections CASCADE」漏 001/004/012 全部级联面（paper_
  tags/annotations/notes→papers、paper_tags→tags、lineage_nodes→papers、
  lineage_edges→lineage_nodes 双端、lineage_nodes.folder_id→collections）；
  〔乙〕「recursive_triggers=OFF 下级联不触发 DELETE 触发器」被实测推翻
  ——本栈 FK 级联照常点火子表 AFTER DELETE 触发器（探针 probe-cascade-
  deletionlog〔仓外 20261014-db3u1〕+020 头注 T3 实照+R4-1 锁定测试
  三源互证；通用文档语义误植未再探即落纸）。勘正后语义=**级联删除行
  完整落账（超集）**：r3-N4「中间表事件缺失+限条件/LWW folder_id 级联
  链两端不同=永续分歧面」整体消解（级联灭失行与直删行同账，收敛不依赖
  两端级联子集一致）；〔丙〕OR REPLACE 探针实证=隐式删除绕过 DELETE
  触发器（quality 负锚漏账依据实锤）；〔丁〕guard 开库断言口径精确化=
  stop==0 且恰 1 行（空行态 COALESCE 折算盲区——U1 回炉 R1 收紧）。
  落地状态=U1 批 021 迁移+九表触发器族+quality 第 11 段+开库断言全数
  在库；U2/U3 派发简报必须携带本勘正前提（级联超集口径）。**

---

## 13. DB-3 落纸（v1.3 终裁稿——2026-10-14 主控亲笔·甲授权）

> 授权链：§12 四问主裁「丙→甲复合」——DB-3 面按甲方向（授权主控按预裁定
> 方向落纸 v1.3 终裁稿：删事件日志+六项落纸条件一并处置）在 DB-1/DB-2
> 全毕后落纸。R5 取舍=双源复审链输入（本稿→ops-auditor 对抗审→主控终裁
> 闭合）。输入=A1 主裁（删事件日志）+A8（传输安全专项）+U3 终裁 C4 残余
> （R4/R5）+§12-6（A2 设备清单）+§12-7（A3 下行 v2 登记）。

### 13.0 六项落纸条件处置表（三审 §七 对位闭合）

> 三审 verdict 原档随 2026-10-12 迁移失存（WSL2→VMware 档案区未随迁）；
> 权威摘录=账本 20261008-dbcamp-open 行 836（B2/W5/N5 返工——B1=隔离分支
> 无出口且常态触发/B2=seq 护栏只有时限性；W=拒收可见性/阈值口径与威胁
> 模型/seq 分配语义/同 owner 多机矛盾/迁移号台账漂移）。〔勘误注（auditor
> r1-N2）：「六项」原始划分不可考（B2+W5=7 面与六计数不齐），本表按 836
> 行摘录 **7 面逐面处置**——超集覆盖（7⊇6），以面覆盖为准不声称逐行对齐。〕
> 对位处置：

| 三审项 | v1.3 处置 | 落点 |
|---|---|---|
| B1 隔离分支无出口且常态触发 | **整体不存在**——删事件日志替代缺席对账：无缺席推断=无阈值=无隔离报告=无确认队列 | §13.1 |
| B2 seq 护栏时限性（回退机穿越水位→陈旧全集进对账→静默删除） | **结构性消解**——删除只来自显式清单且必过水位闸；回退机旧 envelope seq≤水位=整卷拒收（不进合并）；回退机本地停留旧态=v1 上传单向可接受语义 | §13.1/§13.4 |
| W1 拒收可见性 | 双层可见：拒收记 app_meta 导入日志键（计数+最近指纹）+导入对话框内联原因码（toast） | §13.2 |
| W2 阈值口径与威胁模型 | 阈值机制随 B1 退役（无对账删除面）；威胁模型独立成文=A8 专项 | §13.6 |
| W3 seq 分配语义 | =R4 定夺：分配=导出成功后 owner 本地计数+1（首导=1）；空键语义=高水位 0 | §13.4 |
| W4 同 owner 多机矛盾 | v1 声明=**同库单写者**（同一库文件任意时刻至多一个导出端；多副本并发导出=范围外）；协议第三态封堵=同 (owner,seq) 异内容卷整卷拒收+冲突登记（§13.4——auditor r1-B1）；多机并发写=v1 范围外（A7 沿承）；下行多设备=v2（§12-7 登记） | §13.4 |
| W5 迁移号台账漂移 | 021 号在 v1.2 台账指向 uuid 迁移——pk 实测推翻前置（§13.3），021 号改派删事件日志迁移；台账随本稿对齐 | §13.3 |

### 13.1 A1 删事件日志（A1 主裁形态落纸）

- **表**：`deletion_events`（迁移 021）——`seq INTEGER PRIMARY KEY
  AUTOINCREMENT/entity TEXT NOT NULL/id TEXT NOT NULL/deleted_at TEXT NOT
  NULL`+**UNIQUE(entity,id,deleted_at)**（重发幂等去重面——auditor
  r3-N3）；append-only（防御=拒 UPDATE/DELETE 触发器，RAISE(ABORT)
  ——019 专例先例：非约束冲突不被 OR IGNORE 吞；UNIQUE 冲突=约束冲突
  →触发器 INSERT OR IGNORE 吞=去重机制，两语义兼容）。021 同批建
  **直执守卫表** `deletion_log_guard(stop INTEGER)`（单行，导入直执期
  置 1、事务内复位——见下「直执落账抑制」）。**deleted_at 取时口径**
  （auditor r3-N3 勘误：触发器内无应用层时钟）=DB 时钟 ISO
  （strftime('%Y-%m-%dT%H:%M:%fZ','now')）——与应用层 ISO 域差为
  毫秒级混源，单调性由 seq 保、跨端比较不依赖 deleted_at（声明接受）。
- **落账**：导出面九表（§13.7）各配 AFTER DELETE 触发器追加行（entity=
  表名/id=被删行 id/deleted_at=DB 时钟 ISO——表定义段口径；INSERT OR
  IGNORE 去重）——先例=019
  paper_tags_domain_guard+020 epoch 族触发器；**服务层零侵入**（repo 删除
  路径不改——299 压线双件自然零接触，开工预裁在案）。**单事务原子性**
  （auditor r1-W4）=AFTER DELETE 触发器随删除语句同事务执行（SQLite
  语义）——「行删而事件缺席」崩溃窗口不存在，无需启动期重放机制。
  复合主键表身份约定（auditor r1-W3①）：paper_tags（PK=(paper_id,tag_id)）
  的删除事件 id=`<paper_id>|<tag_id>` 竖线拼接序列化；行级 upsert 冲突
  目标=各表主键（复合表=复合键）。
- **逐表身份矩阵**（auditor r2-W3 补全——表→主键→身份序列化→upsert
  冲突目标）：papers=TEXT uuid id→id→id；collections=TEXT uuid id→id→id；
  tags=TEXT uuid id→id→id；paper_tags=**复合 (paper_id,tag_id)→`pid|tid`
  拼接（两分量恒 uuid，`|` 不现于字母数字集=无碰撞无转义面）→复合键**；
  annotations=TEXT uuid→id→id；notes=TEXT uuid→id→id；lineage_nodes=
  TEXT uuid→id→id；lineage_edges=TEXT uuid id 主键〔UNIQUE(from_node,
  to_node)=唯一约束非主键〕→id→id；lineage_graph_meta=**KV 表 key 主键
  〔非 id 列〕→key 值→key**。九表唯一复合主键=paper_tags；唯一 KV=
  lineage_graph_meta。
- **捕获面矩阵**（auditor r2-W4；**r4 勘正见 §10**）：①直接 DELETE 语句=AFTER
  DELETE 触发器捕获（全九表）；②`OR REPLACE` 冲突式删除=**全仓零命中**
  （src/main grep 实照 2026-10-14——路径不存在；探针实证其隐式删除**绕过**
  DELETE 触发器=若引入即漏账，「禁 OR REPLACE」quality 规则已挂卡〔U1 落地〕）；
  ③FK 级联删除=**点火子表 DELETE 触发器（实测超集——r4 勘正）**：级联面=001
  （paper_tags/annotations/notes→papers；paper_tags→tags）+004（lineage_nodes→
  papers；lineage_edges→lineage_nodes 双端）+012（lineage_nodes.folder_id→
  collections）+019（tags.folder_id→collections）（020 族不在导出面）。
  **级联删除行完整落账**——本栈 recursive_triggers=0（connection.ts 无该键=
  缺省）下 FK 级联照常点火子表 AFTER DELETE 触发器（探针 probe-cascade-
  deletionlog+020 头注 T3 实照+R4-1 锁定测试三源互证；r2-W3 原文「级联不
  触发 DELETE 触发器」系 SQLite 通用文档误植未再探即落纸——r4 勘正，原文
  要点存 §10 r4 行）。级联行事件在场=r3-N4「中间表事件缺失+限条件」分歧面
  整体消解：级联灭失行与直删行同账，接收端防复活过滤/直执同路径收敛，
  「同一终态」不再依赖两端级联子集一致。接收端直执 (collections,id) 删除后
  本地同 DDL 级联链自愈（两端 schema+pragma 同构——级联点火语义两端同构，
  超集账两端各自独立成账、互不依赖对方级联子集）。实现票核对面（U1）=删除路径盘点对账本矩阵+「src/main
  禁 OR REPLACE」quality 规则挂卡（一次性 grep 实照→机检常驻——auditor
  r3-N7①；受锁面变更走 [locked-change]；**U1 已落地**）+**deletion_log_guard
  开库断言**（stop==0 且恰 1 行——r3-N7②；**U1 已落地**=迁移后每次开库断言，
  空行/多行/悬挂三态均显性 throw）。
- **直执落账抑制**（auditor r2-W5）：导入⑥直执 DELETE 会再触发本库
  落账（同 (entity,id) 异 deleted_at 重复事件+逐跳膨胀）——抑制=触发器
  WHEN 守卫 `(SELECT COALESCE(stop,0) FROM deletion_log_guard)=0`；导入
  事务内置 1→直执→复位 0（同事务=崩溃自回滚，无悬挂态）；守卫表与
  触发器族同批 021 落地，元测试锁「守卫开=直执不落账/守卫关=本地删
  落账」两态。
- **envelope 携带**：`payload.deletions=deletion_events 全量`（append-only
  不剪枝——v1 增长=删除操作数级〔单人千级库个位数/年量级〕；隐私残留
  申报（auditor r1-W2）：被删条目 id 随卷流转=id 皆 uuid 零内容语义、
  画像价值≈零，接受；**剪枝约束条款**：v2 剪枝须以接收端 ack 已应用为
  前提，且剪枝后旧卷拒收面不变（seq 单调）——剪枝永不重引缺席推断
  〔缺席推断机制已随 B1 退役，此为永久约束〕）。删除事件集**不进 LWW
  裁决面**（auditor r1-N6）：接收端处理=追加幂等并集（本地既有+入站，
  主键 (entity,id,deleted_at) 去重），无比较裁决。
- **接收方直执**：六闸（§13.2）全过后，deletions 逐条按（entity,id）
  删除（缺席=no-op 幂等）；批内执行序=先 upsert 后删除（同卷先立后删=
  删除胜出，与单机操作时序一致）。
- **与 seq 护栏关系**：删除指令只随 envelope 到达且必过水位闸③——旧
  envelope 的陈旧删除清单整卷拒收，不进直执。

### 13.2 接收方流程（六闸定稿——五闸+HMAC 闸）

**闸③前置自检（auditor r1-B1/r3-N5）**：envelope.owner==本库 owner_id
→ 整卷拒收（原因码 self_reimport——自身快照回导自身；行级全等拒收
噪音消除）。**边界申报**：自检仅封「当前同 owner」回导；重装后
owner_id 由 ensureIdentity 重生 → 旧卷按异源可达（水位键按旧 owner
独立计）=事实恢复路径——**申报接受**（与 ADR-0013 手动备份互补的
灾备后门；持旧 sync_key 即可解旧卷）。

①结构校验（JSON 完整/**envelope 必填键在位含 hmac 字段——缺席=拒收，
封降级卷**；format_version==当前精确匹配——不匹配=拒收封旧版本卷；
**卷内 schema_version（=导出端 user_version）≤本库 user_version——
超前=拒收封错时升级卷**〔auditor r1-W3③〕；table_counts 键集与九表
对齐）→②**HMAC 验签**（对 canonical envelope 全字段+payload 密文
——owner_id/seq 均入 MAC 面，防跨库字段搬运；不通过=整卷拒收）→
③seq 检验（**内序决策表——auditor r3-N1**：a.查导入日志 applied 面
——同 (owner,seq) **同 sha → 幂等 no-op 出口**（整卷零副作用，卷级
幂等唯一可达路径——须先于水位比较，否则被 stale 吞）；b.同 (owner,
seq) **异 sha → 整卷拒收 seq_conflict**；c.无 applied 记录且 seq≤
水位（空键=0）→ 整卷拒收 **seq_stale**；d.seq>水位 → 过闸。两拒收
分支均记录）→④解密+对账（**payload_sha256 摘要域单源声明**=canonical
payload 全量明文=数据行+pdf_refs+deletions 三件合一（§13.6 payload
定义同源——auditor r3-W2 勘正：r2 括注漏 pdf_refs 即摘要域不自洽；
闸③「同 sha/异 sha」判据同此口径；处 MAC 覆盖面内）+table_counts 与
实载行数一致）→
⑤upsert（比较键 (updated_at,id)：入站新=写；入站旧=跳过；**键等细分
（auditor r3-W1——v1.2 A7 原文「全等即拒收」按字面会误伤每次同步的
未变更行=常态假冲突，本稿消歧）**：键等**且内容全等**（整行所有列
一致）=**幂等 no-op 跳过**（常态路径——同源重传/同卷重放行，零登记）；
键等**且内容异**（同时间戳异内容=分叉写入）=**拒收该行+冲突登记**
A7——确定性不依赖到达序（auditor r1-N1）；**防复活过滤=入站行
(entity,id) 命中本库 deletion_events 即跳过**——本库删除对单向源数据
永不复活，合法重加=新 uuid 新 id 天然不受影响（**正确性前提=「id
不复用」不变量：restore/undo 路径亦不得复用已删 id——复用即该 id
入站行永被跳过；随 U1/U3 登记入 docs/invariants.md+核查实现路径
——auditor r3-N6）；v1.2 缺席对账形态同病无解，删事件日志形态天然闭合）→⑥删除直执（§13.1）+高水位更新+导入日志键落
app_meta（**水位细则〔auditor r1-N3〕：跳号合法〔全量卷语义，卷自含
全量，seq 仅拒旧不补差〕；拒收卷不推进水位；水位推进与数据应用同
事务——应用成功才推进，失败零副作用**）。

**拒收可见性（W1 落纸——auditor r1-W7/r2-W2）**：每闸拒收产出原因码+
记录落 app_meta 导入日志键+导入对话框内联展示。**导入日志记录 schema=
(owner, seq, payload_sha256, outcome)**——outcome=applied｜rejected:
<原因码>；**闸③第三态的「已见」面=仅 applied 记录**（失败尝试不并入
——合法重发不被 no-op 静默跳过；跳号合法前提下已见面不可从水位数推
出，故须独立记录面）。展示面 owner/seq=**自称值**（闸②通过前的未认证
字段——日志与对话框标注；struct_invalid 卷 seq **与 owner** 不可解析时
记 null 降级——auditor r2-N3/r3-N8）。**保留口径**（auditor r3-N2）=
长期保留（量级=导入次数级）；v2 裁剪申报——裁剪后旧 seq 重发退化为
seq_stale（安全，失 no-op/conflict 标签）。原因码表=self_reimport/
struct_invalid（键缺或格式）/version_mismatch（format_version）/
schema_newer（卷超前）/hmac_fail/decrypt_fail（GCM 认证失败——r3-N8
细分，≠hash_mismatch）/seq_stale（≤水位）/seq_conflict（同键异内容）/
hash_mismatch（解密后 sha 对账不符）/counts_mismatch。A7 全等拒收
**粒度=行级**（拒收该行不影响同卷他行；同卷内确定性=键相等即拒收，
不依赖到达序——跨卷间由水位闸定序——auditor
r2-N5）。**FTS×3 导入后本地重建**（§13.7 排除面——auditor r1-W3②：
external content 派生面不随卷走，重建步随 ⑥ 收尾）。

### 13.3 021 条件判定（pk 实测定谳——条件不成立）

- v1.2 §5.b「②自增→021 uuid 迁移为 DB-3 前置」：**实测推翻**——文献域
  全表 id=TEXT PRIMARY KEY+应用层 randomUUID()（001_init 实照；
  notes.repo:115/annotations.repo:167 生成点）；自增 INTEGER pk 仅 020
  AI 族——α 裁决恒本地不同步。合并键 (updated_at,id) 的 id 跨机天然
  免碰撞，uuid 迁移无消费面。
- **021 号改派**=deletion_events+九表 DELETE 触发器族+append-only 拒写
  防御（§13.1）；台账勘正在案（W5 处置）。user_version 20→21。

### 13.4 R4 snapshot_seq 空键高水位语义（定夺）

- **分配**：每次导出成功（envelope 文件完整落盘）owner 本地计数+1，首导
  =1；计数器=app_meta `snapshot_seq` 键（018 登记、DB-3 首次启用——经
  envelope 面专用 snapshot.repo 读写，不经 app-meta.repo 既有 get/set
  〔app-meta.repo:14 头注契约沿承〕）。计数器为 **per-install 本地键**
  （随库文件走）——同库多副本并存时各副本独立计数、可产出同 seq 异
  内容卷，该形态由 §13.2 闸③第三态整卷拒收封堵+§13.0 W4 单写者声明
  圈范围（auditor r1-B1）。
- **空键语义**：接收侧该 owner 水位键缺席（首收）≡水位 0——任意 seq≥1
  过闸③；首收即懒初始化写入水位。杜绝「未初始化=未定义行为」（R4 原问
  指向）。
- **命名空间**：接收水位键按源 owner 分键（`recv_seq:<owner_id>`）；本机
  导出计数键=`snapshot_seq`——两空间不串（多学生快照汇入导师库=每源一
  水位键，行 id=uuid 天然不碰撞——多用户可合并性机制面；**异 owner 同
  seq=命名空间隔离天然合法**）。卷级幂等比较=payload_sha256（含数据行
  +pdf_refs+事件集全量——§13.2 闸③摘要域单源同口径，auditor r3-W2）；
  自身卷回导=闸③前置自检整卷拒收。
- **单机声明**（W4+A3 合并）：v1 **同库单写者**（同一库文件任意时刻至多
  一个导出端；多副本并发导出=范围外+第三态拒收兜底）；时钟域=单机
  （LWW 防御性保留；跨机时钟 skew「新写被旧戳覆盖」=接受声明——auditor
  r1-N1，v1 源-接收端错峰语义内可接受）。

### 13.5 R5+A2 设备清单认证（库级粒度定夺）

- **owner/token=库级**（R5 采纳）：沿 018 ensureIdentity——每课题库
  （workspaces/<id>/ 一库一文件，ADR-0018）独立 owner uuid+device_token
  （randomBytes(32) hex）。**设备级细分不采**：v1 单机上传端语义下无
  同库多 token 并存面；§12-6 A2「可吊销单设备」在库级粒度下=吊销该库
  token 即吊销其唯一上传端；v2 下行多设备立项时随服务端任务书重估。
- **幂等语义**：上传幂等键=(owner_id, snapshot_seq)——同键重传=服务端
  no-op（协议契约声明；客户端同 seq 不重发）。
- 服务端设备清单/吊销 API=战役外任务书（N6 沿承）——本仓交付=协议
  契约文档（§13.8 U4）。

### 13.6 A8 传输安全专项（中继云不可信假设——分析+规划）

- **威胁模型**：中继云（自建服务端）对**保密性与完整性不可信**；可用性
  范围外（离线=同步不可用，文献功能无碍——§12 9-新-5 α 已裁）。TLS
  仅防链路窃听，且 TLS 在中继终结——**不构成对中继自身的防御**。
- **E2E 设计（v1 采纳案；构造参数面 auditor r1-B2 落纸）**：
  - payload（data+pdf_refs+deletions）**AES-256-GCM 客户端加密**后出库；
    主密钥=库级 `sync_key`（randomBytes(32)，app_meta 存储——与 owner/
    token 同载体，ensure 语义同 ensureIdentity：缺席才生成、在场永不
    覆写）。快照文件（v1 无服务端，文件即传输态）恒密文单一格式——
    本地明文导出不设（自备份姿态沿 ADR-0013 手动指引，非本面）。
  - **密钥分离**：HKDF-SHA256 自 sync_key 派生三钥——enc_key（info=
    "synapse/aes"）/mac_key（info="synapse/hmac"）/blob_key（info=
    "synapse/blob"）；salt=固定常数串 "synapse/dbcamp01/v1.3"（salt
    无秘密性要求——域分离依赖 IKM+info，常数盐声明——auditor r2-N7）；
    双原语不同钥，GCM 失效不连锁 HMAC（防「同源密钥=双挡实为单点」）。
    sync_key 熵=256bit CSPRNG（node:crypto randomBytes(32)——非口令
    派生，无 KDF 强度约束面）。
  - **nonce 策略**：每卷 payload 加密与每 blob 加密各取 randomBytes(12)
    随机 nonce——随机量级=导出/blob 上传次数（单人库百级≈10^2，距 NIST
    随机 nonce 2^32≈4.3×10^9 碰撞界约 **7.6 个数量级**余量〔10^9.6−10^2
    手算注——auditor r2-N1 勘正原「十个」误算〕）；不依赖计数器=无重装
    复位面。
  - **认证覆盖面**：HMAC-SHA256(mac_key) 对 **canonical envelope 全部
    明文字段**（format_version/schema_version/snapshot_seq/owner_id/
    table_counts/payload_sha256）+payload 密文——owner/seq 均入 MAC 面；
    **覆盖面显式排除 hmac_sha256 字段本体**（防自指——auditor r2-N4）；
    GCM 加密以同 canonical envelope 字节（除 hmac 字段）为 **AAD**——
    字段搬运/重排/拼接全破。
  - **canonical 序列化规则**（INV-D 确定性口径落纸）：JSON 对象键=字母
    序固定；重复键=解析后重序列化对账不符即拒收；行序=每表
    (updated_at,id) 排序；编码=UTF-8。
  - envelope 明文面=format_version/schema_version/snapshot_seq/owner_id/
    table_counts/payload_sha256+**hmac_sha256**——服务端/中继可见（
    **明文面申报** auditor r1-N4②：表行数/owner/卷大小/卷数量/时序/
    blob 指纹均中继可见，接受）；无 sync_key 不可伪造合法 HMAC。
  - **重放/降级/拼接三形态封堵**：同卷重放=闸③水位；改卷伪造=闸②
    HMAC；降级卷（剥 HMAC 字段/旧版本号）=闸①必填键拒收；字段跨卷
    搬运=AAD+全字段 MAC 破。**同密钥多库=用户显式配对行为=该密钥域
    内互信**（跨库重放仅此形态可达——申报接受，auditor r1-W5）；
    **sync_key 持有者=该库同步域全权（含删除传导）**——导入为手动
    动作（用户择卷）+应用/拒收全可见性兜底，接受申报（auditor r1-Q8
    残项）。
  - 密钥分发=**带外**：设置页「同步密钥」显形（形态=§13.9-1 已裁：文本串
    +二维码）；
    接收端一次性导入。**密钥不随快照传输**（自举悖论规避）。**丢失
    代价申报**（auditor r1-N4①）：sync_key 丢失=中继旧卷不可解（本地
    库仍在可重新导出，仅历史传输卷报废——接受）；配对/轮换/撤销流程
    =v2 服务端任务书面（N6）。
  - PDF 文件面：blob 标识=**HMAC(blob_key, sha256(content))**（密钥化
    摘要——同库同内容同标识保去重；中继不可做候选文件存在性确认、
    跨库同内容不关联——auditor r1-W1 采纳，弃明文 sha256 案）；blob
    内容=enc_key AES-GCM 加密；服务端按标识去重——N3 只补不删。
    **v1 客户端边界申报**（auditor r3-N9）：v1 交付=标识计算+加密
    能力面+卷内 pdf_refs 清单；**blob 传输通道=v2 服务端批**——v1
    快照文件不含 PDF 内容（文件面转移沿 ADR-0013 手动姿态）；U3
    演练无附件用例=明示排除（断言面=pdf_refs 清单正确性）。
  - 实现=node:crypto 现有能力（AES-256-GCM/HMAC/HKDF/随机）——
    **零新依赖**。
- **不采案申报**：纯 TLS 案（与 A8 假设直接冲突）；非对称每设备密钥对
  案（v1 单机无多设备面，复杂度无消费面——v2 重估）。

### 13.7 导出面表清单（文献域定稿——九表；一行式对账 auditor r1-N5）

papers（留——文献主档）/collections（留——文件夹）/tags（留）/
paper_tags（留——复合 PK，身份序列化见 §13.1）/annotations（留）/
notes（留）/lineage_nodes（留——人工策展=文献域结构面，α 裁决只禁
AI 面；13.9-3 已裁：确认入）/lineage_edges（留——同上；复合唯一键
UNIQUE(from,to) 既有）/lineage_graph_meta（留——图级 KV）。**排除**：ai_notes（003
——AI 笔记，α 裁决「AI 记忆与笔记」恒本地）/020 AI 族全表（同）/
FTS×3（external content 派生面——接收端本地重建，§13.2⑥）/app_meta
（身份载体不导出：owner 在 envelope；sync_key/token 永不出库）。
**deletion_events 定位=协议元数据**（随 envelope 携带，不入导出表清单
——§13.1）。

### 13.8 实施单元切分（下场起序——节奏 ≤2 件/场沿承 v169 §1）

- **U1 迁移面**：021 deletion_events+九表 DELETE 触发器族+append-only
  拒写防御；元测试（九表↔触发器对位枚举——020 epoch 三一致元测试范式）
  +逐表删除断言+变异红证。
- **U2 导出面**：snapshot.repo（envelope 面专用：snapshot_seq 计数/
  sync_key ensure/导入日志键）+export-snapshot.service（九表读面+
  canonical 序列化+sha256+HMAC+AES-GCM）+IPC 通道（导出到文件——main
  侧系统对话框路径，INV-07 边界）+设置页同步密钥节。
- **U3 导入合并面**：六闸接收流程+A7 冲突登记+拒收可见性（原因码）+
  **双机演练收口门（W6 判据可观测断言集落纸——auditor r1-W6/r2-N2）**：
  演练形态=**异 owner 双库**（源库 owner X 导出→演练库 owner Y 导入——
  与接收端真实形态及 self_reimport 拒收一致；**灾备/恢复用例不在 v1**
  ——导出件=传输件非备份件，自库回导被闸③前置自检封死，备份姿态沿
  ADR-0013——auditor r2-N2 申报）。正例断言=①X/Y 异行集合并→零覆盖
  （新于入站的本地行原样保留）+零丢行（源行全数在场）；②删除传播：
  X 删行→X 导出→Y 导入→该行在 Y 缺席；③防复活：Y 本库删除行+旧 X
  卷（含该行）重导入→不复活；④同 (owner,seq) 异内容卷→seq_conflict
  拒收可见；⑤同卷重放→seq_stale/幂等 no-op；⑥bit 翻转卷→hmac_fail；
  ⑦剥 HMAC 字段卷→struct_invalid；⑧直执守卫=导入直执不落本地账
  （§13.1）+FTS 重建后检索面可用。断言全部机器可观测（DB 行计数+
  导入日志键+原因码）；多源合并用例=X/Z 双源异行集汇入 Y。**⑨次轮
  同步零冲突**（auditor r3-W1 补钉）：同源次轮全量卷（未变更行为主）
  导入→断言零 A7 登记（未变更行=键等且内容等=幂等跳过——⑤细分的
  回归锁）。**④seq_conflict 构造法**（auditor r3-N8：异 owner 双库+
  单写者自然流不可达）=测试内持源库 sync_key 自签同 seq 异内容卷注入。
  **hash/解密失败区分**（r3-N8）=原因码细分 decrypt_fail（GCM 认证
  失败）≠hash_mismatch（解密成功后 sha 对账不符）。
- **U4 协议契约文档**：服务端任务书面（N6）——设备清单/幂等键/吊销/
  E2E 契约+§13.9 呈裁项落定回写。

### 13.9 呈裁项（2026-10-14 用户裁决落定——三项全按推荐）

1. **sync_key 共享形态**：~~a/b/c~~ → **b=设置页文本串+二维码**（录入容错）。
2. **接收端密钥导入入口**：~~a/b~~ → **a=设置页「导入同步密钥」单一入口**。
3. **lineage 三表入导出面**：**确认入**（人工策展=文献域结构面——α 裁决
   AI 面排除语义不受影响；~~异议=摘出 lineage 三表另裁~~——已裁不采）。

---

## 逐项处置表

| 项 | 处置 | 落点 |
|---|---|---|
| B1 | 修=a+b+c 三层护栏+闭合矩阵+d 否决论证 | §2/§3/§5.b/INV-I/K/§9-A1 |
| W1 | 修=UPSERT 自愈+播种+三一致元测试+016 多重集断言+归属钉 020 | §5.a/§5.c/§6 |
| W2 | 修=摘录函数纯化（只依赖 scope+ctx_ver）+FTS 归尾段 | §5.a/§6 |
| W3 | 修=验收判据集+LIKE 回退路径 | §5.a/§6 |
| W4 | 修=注入面↔集合对照表+INV-J+逐表递增测试 | §5.a/§7 |
| W5 | 修=A7 相等键拒收+冲突登记+范围外声明 | §5.b/§9 |
| W6 | 修=判据可判定化三点（schema 实测/uuid 预案/双机演练） | §5.b/§5.c/§9 |
| W7 | 修=app_meta 载体+生命周期四条（生成/恢复/导入/认领） | §5.b/§5.c |
| W8 | 修=9-新-5 三要素入裁决文本 | §9 |
| N1 采纳=016 显式列清单 §5.c | N2 采纳=明写接受（语义分离/错峰声明/阈值锚定） §5.b | N3 采纳=只补不删声明预期 §5.b |
| N4 采纳=索引清单锚 020 §5.a | N5 采纳=校准任务入 DB-2 §5.a/§8 | N6 采纳=服务端=战役外任务书 §9 |
| N7 采纳=未决门表 §9 | N8 采纳=folder 拒删非空+FK 审计+测试 §5.c/§8 | |

## 独立复算与异议

- **阈值默认值复算**：单人库行量级估算 papers 千级、notes/annotations
  合计万级；正常删除操作=个位数行/次（删文献连带）。绝对阈 50 行覆盖
  正常面数十倍余量；比例阈 20% 防大库下绝对阈失灵；双阈取「且」=保守
  方向（宁可报告不可误删）。seq 机制成本=app_meta 单行+导出路径自增，
  性能影响估算为零。
- **闭合复核**：三反例逐一再验——①旧备份导出 seq≤高水位→闸②整卷拒收
  （删除指令根本不进入对账）；②残卷→闸①拒；「合法但空」→闸④缺席
  100%>20%→隔离报告；③双机旧备份→互拒+服务端现状保持。三层无单点依赖。
- **异议（对 d 候选，已在 §3 论证）**：删除显式指令化/纯报告制不取——
  删除传导是裁决②聚合语义内生需求，纯报告制把确认成本转嫁导师端且需
  本地删除日志（变相墓碑，v1.1 已反）；阈值层已保留人工通道。
- 本轮无对 auditor 判定本身的否决性异议；W1-W8/N1-N8 判定全部成立并已
  闭合。

## 11. 主控终裁记录（2026-10-07/08 夜，三段通道状态）

- **三段通道现状**：ops-drafter 拟定三轮（v1.0/v1.1/v1.2——回炉 2/2 用尽）
  →ops-auditor 对抗三轮（首轮 B4/W16/N8 返工→二轮 B1/W8/N8 返工收窄〔首轮
  28 条处置=22 闭合/6 转移/0 未闭合〕→三审聚焦 **B2/W5/N5 返工**——二轮
  B1 闭合不成立：①隔离分支无出口且为常态触发〔级联删除常态超 50 行阈〕
  ②seq 护栏对回退机只有时限性无结构性〔本地计数器穿越服务端水位后陈旧
  全集进入对账→服务端唯一新副本静默删除〕）。
- **锁定面裁定**：三审两阻断+六项落纸条件（三审 §七）**只锁 DB-3（导出/
  同步协议面）**；DB-1（016/017/018/019 文献域迁移）与 DB-2（020 AI 域）
  与 B1/B2 零耦合——**不被锁，可先行**（三审原文「此 6 项未落纸前 DB-3
  不应开工」）。
- **主控预裁定方向（供处置选项甲/乙采信，可否决）**：删除传播改**删除
  事件日志**（本机删除操作追加式落账 {entity,id,deleted_at,seq} 随
  envelope 携带；接收方按清单直执删除）替代缺席对账——同时消解：B1
  隔离分支整体不存在（无缺席推断=无阈值/无确认队列/无常态触发）+B2
  穿越窗口（回退机旧行 updated_at 落败于 LWW upsert 比较键，服务端新行
  无损；回退机本地停留旧态=可接受 v1 语义〔上传单向、无下行〕）。v1.1
  drafter 对「删除日志表」的反驳（变相墓碑）系混淆行级软删列与事件日志
  ——后者 append-only 小体积零查询面改动，成本远低于缺席对账护栏族。
  W4（同 owner 多机）随之收敛为「v1 同 owner 严格单机」声明（与 A3 时钟
  域声明合并）。
- **处置选项（呈裁——新会话首问之一）**：甲=授权主控按预裁定方向落纸
  v1.3 终裁稿（删事件日志+六项落纸条件一并处置）；乙=新会话派 drafter
  例外第四轮（主控方向作指引）；丙=接受 v1.2 现状，DB-1/DB-2 先行开工、
  DB-3 设计后置（DB-1 落地自然产出 pk/备份/依赖清单实测值反哺协议设计）。
  主控推荐=**丙→甲**复合：DB-1/DB-2 不等待（实测值反哺），DB-3 面按甲
  方向在 DB-1 收口后落纸 v1.3。
- **呈裁 12 项+未决门表**（§9）维持随稿呈裁；9-新-5 三要素/A1/A7 文本
  以本记录预裁定方向为背景重读（若甲/丙采纳，A1 护栏栈文本随之替换为
  删事件日志形态）。

## 12. 用户呈裁第二轮落定（2026-10-08，逐字入账本 ruling 行）

**四问主裁**：设计链处置=**丙→甲复合**（DB-1/DB-2 立即开工，DB-3 面在 DB-1 收口后按删事件日志方向落纸 v1.3）；A1 删除传播=**删事件日志**（本机删除操作追加式落账随导出携带，接收方按清单直执——无缺席推断=无阈值/无隔离/无回退机穿越）；9-新-5 AI 出网=**α 客户端直连**（「服务端不管任何 AI 相关事项，包括 AI 记忆与笔记」——AI 域恒本地，服务端职责收窄为纯文献域快照聚合；出网治理=host 白名单 [locked-change]）。

**11 项细裁**（对照 §9 门表）：
1. **9-新-1 落定+契约收紧**：folder↔lineage_graph **一一对应**（「一个文件夹不允许多张脉络图，必须一一对应」——DB-1 加唯一约束/应用级强制）；跨文件夹全局脉络对话不做；「课题可以有多个文件夹」=课题为文件夹上级概念，**课题实体未立项**（开放点——需要时另呈裁）。
2. **9-新-2 修订**：会话软上限 200→**50 条**（「再多就面临严重的上下文污染」）；记忆=**分门别类知识库路线**（分类组织，非平面堆叠）；其余容量/管理细节（置顶永不淘汰/面板/全置顶拒写）赞同沿承。
3-5. 9-新-3/9-新-4/9-新-6 照推荐落定。
6. **A2 答复+推荐**：uuid+**设备访问 token**+服务端**设备清单**（可吊销单设备）——无账号密码满足多设备互信（内网/自建服务端信任域）；公网账号体系 v1 不做。待用户默认确认。
7. **A3 附加需求**：未来多设备下行同步=**设置页一个按钮**（「从服务端同步数据」——下行通道 v2 需求登记，服务端立项时设计）。
8. A4 照推荐。
9. **A5 修订**：上下文组装引入**按需分级检索**（知识库式——结合第 2 条记忆知识库化：初始注入小预算骨架，对话中按需逐级检索展开）；**初始 token 预算下调**（具体数值 DB-2 实测校准，原 6k/8k/4k 为上限保留）。
10. **A6 简化**：存量均测试数据可清理——016 遇 NULL 行**直接清理**（用户授权），修复 CLI 取消；前置校验保留为防断电保险丝。
11. **多层级预裁被实质改写——三档重定义**：①单个文献；②**整个脉络信息**（含各文献已有结构化笔记+标签+元数据）；③**软件层次**（系统功能+AI 自动化——「相当于助手可以发任务，权限仅限于管理前两个 AI 层级」：第三档升格为代理层，可发任务，权限边界=仅管理 paper/lineage 两档 AI 资源，无文献域写权限之外的能力）。global 档的「能力清单」语义升级为「能力+任务派发」——DB-2 设计面重点展开（任务模型/权限围栏/审计）。
12. **新增呈裁项 A8**：**数据传输安全专项分析**（「值得再分析和规划一下」——快照上传通道的完整性/保密性/认证/防篡改；入 DB-3 v1.3 设计面，与删事件日志/设备 token 一并规划）。

**DB-1 契约增量汇总**（本轮裁决衍生的迁移/约束面）：folder↔graph 唯一约束；app_meta（owner uuid+设备 token 本地侧）；存量测试数据清理授权（016 NULL 处置简化）。**DB-2 设计增量**：会话 50 条上限；记忆知识库化（分类 schema）；按需分级检索组装；初始预算下调；软件层代理化（任务派发+权限围栏）。**DB-3 设计增量**：删事件日志（A1 主裁）；传输安全专项（A8）；设备清单认证。
