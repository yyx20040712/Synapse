# F-DBCAMP-01 DB-3 U4 协议契约文档（服务端任务书面 N6——快照同步协议契约单源）

> 交付件=F-DBCAMP-01 DB-3 §13.8 U4（纯文档批）。读者=v2 服务端立项时的任务书
> 拟定者与实现者：本档定义客户端已落地的同步协议契约面——设备清单/上传幂等/
> 吊销/E2E 契约，服务端任务书以本档为输入，**不得另立第二契约单源**。
> 语义单源关系：§4 E2E 契约为设计书 §13.6（v1.3 终裁稿——§13.6 面含至
> r5 勘正；r6 触及 §10/§13.2，不入本节）
> **全文转录**——后续修订以设计书为准并同步本档（同步义务登记 §8 修订记）；
> 实装锚注（〔实装〕标记）指向 U1-U3 已落地代码单源，转录与锚注不一致时
> 先停后裁（接缝归责纪律）。撰写时点基线：HEAD=68c1cd58（U3 批终闭）。

## 1 范围与边界

- **v1 已交付（本仓）**：库级身份与密钥面（018 ensureIdentity+U2 ensureSyncKey）、
  快照导出（envelope 密文文件，`.synsnap`）、接收端六闸导入合并、对端密钥
  配对（设置页带外分发）。传输载体=文件（本地/人工信道），**零出网**。
- **v2 服务端批（本档读者）**：内网穿透中继云（经公网云服务器代理转发）+
  上传通道+blob 传输通道+设备清单/吊销 API。载体由文件换通道时
  **envelope 格式不变**（§13.6「快照文件恒密文单一格式」——v1 文件即传输态，
  v2 换载体不换格式）。
- **范围外申报**：可用性（离线=同步不可用，文献功能无碍）；AI 域（恒本地，
  α 裁决）；下行同步（v2 登记=设置页按钮）；多设备（v2 重估位，§2.4）。

## 2 设备清单（库级粒度——§13.5 R5 采纳）

### 2.1 客户端身份面（v1 已落地）

- 每课题库（workspaces/<id>/ 一库一文件，ADR-0018）持库级身份对，装配期
  ensure（缺席才生成、在场永不覆写——018 ensureIdentity 语义）：
  - `owner_id`：uuid v4 小写（app_meta `owner_id` 键）——库主标识，
    envelope 明文字段之一；
  - `device_token`：randomBytes(32) hex（app_meta `device_token` 键）——
    v1 已在库但**零消费面**（零出网），为 v2 上传端认证预留。
- **设备级细分不采**（§13.5 裁定）：v1 同库单写者语义下无同库多 token
  并存面——一库=一个上传端=一枚 token。

### 2.2 服务端清单契约要求（v2 任务书面承接）

- 清单粒度=**owner 一行**（库级）；行内容至少覆盖：owner_id、该库现行
  device_token 的验证元数据、登记时刻、吊销状态。
- 上传端认证：上传请求出示 (owner_id, device_token)，服务端校验 token
  属于清单内该 owner 且未吊销。
- token 服务端存储形态（明文/哈希）、清单 API 具体形状（登记/查询/吊销/
  心跳与否）=v2 任务书定夺项，本档不锁实现。
- 客户端侧不变量：token 永不出库进入 envelope/payload（与 sync_key 同
  「身份载体不导出」面——§13.7 app_meta 排除条）。

## 3 上传幂等契约（§13.5 已定）

- **幂等键=(owner_id, snapshot_seq)**：同键重传=服务端 no-op；客户端同
  seq 不重发（导出计数 commit 仅在卷文件完整落盘成功后发生——取消/失败
  零计数消耗，§13.4）。
- seq 分配语义（§13.4）：per-install 本地计数器（app_meta `snapshot_seq` 键，
  空键≡0、首导=1）；同库多副本并存可产出同 seq 异内容卷——该形态由
  接收端闸③ seq_conflict 拒收封堵（W4 单写者声明圈范围）。
- 同键异内容（上述崩溃窗/多副本形态）：**建议策略=拒收对齐**（非静默
  no-op、非覆盖——延伸自接收端闸③「值在且异→seq_conflict」语义的
  服务端侧表述；§13.5 已定面仅覆盖同内容重传=no-op）；**定夺=v2 任务书**
  （同 §2.2 定夺项标法）。
- blob 去重：按 blob 标识（§4.4）去重——**只补不删**（N3 声明）。

## 4 E2E 契约（设计书 §13.6 全文转录+实装锚注）

### 4.0 §13.6 全文转录（2026-10-15 时点态）

> - **威胁模型**：中继云（自建服务端）对**保密性与完整性不可信**；可用性
>   范围外（离线=同步不可用，文献功能无碍——§12 9-新-5 α 已裁）。TLS
>   仅防链路窃听，且 TLS 在中继终结——**不构成对中继自身的防御**。
> - **E2E 设计（v1 采纳案；构造参数面 auditor r1-B2 落纸）**：
>   - payload（data+pdf_refs+deletions）**AES-256-GCM 客户端加密**后出库；
>     主密钥=库级 `sync_key`（randomBytes(32)，app_meta 存储——与 owner/
>     token 同载体，ensure 语义同 ensureIdentity：缺席才生成、在场永不
>     覆写）。快照文件（v1 无服务端，文件即传输态）恒密文单一格式——
>     本地明文导出不设（自备份姿态沿 ADR-0013 手动指引，非本面）。
>   - **密钥分离**：HKDF-SHA256 自 sync_key 派生三钥——enc_key（info=
>     "synapse/aes"）/mac_key（info="synapse/hmac"）/blob_key（info=
>     "synapse/blob"）；salt=固定常数串 "synapse/dbcamp01/v1.3"（salt
>     无秘密性要求——域分离依赖 IKM+info，常数盐声明——auditor r2-N7）；
>     双原语不同钥，GCM 失效不连锁 HMAC（防「同源密钥=双挡实为单点」）。
>     sync_key 熵=256bit CSPRNG（node:crypto randomBytes(32)——非口令
>     派生，无 KDF 强度约束面）。
>   - **nonce 策略**：每卷 payload 加密与每 blob 加密各取 randomBytes(12)
>     随机 nonce——随机量级=导出/blob 上传次数（单人库百级≈10^2，距 NIST
>     随机 nonce 2^32≈4.3×10^9 碰撞界约 **7.6 个数量级**余量〔10^9.6−10^2
>     手算注——auditor r2-N1 勘正原「十个」误算〕）；不依赖计数器=无重装
>     复位面。
>   - **认证覆盖面**：HMAC-SHA256(mac_key) 对 **canonical envelope 全部
>     明文字段**（format_version/schema_version/snapshot_seq/owner_id/
>     table_counts/payload_sha256）+payload 密文——owner/seq 均入 MAC 面；
>     **覆盖面显式排除 hmac_sha256 字段本体**（防自指——auditor r2-N4）；
>     GCM 的 **AAD 面=同构造唯 payload 槽空串占位**的 canonical 字节
>     （**两段面**——r5 勘正：原「GCM 以同 canonical envelope 字节〔除
>     hmac 字段〕为 AAD」字面含 GCM tag 定点循环〔tag 编码于 payload 而
>     AAD 决定 tag，互为前提物理不可达〕，MAC 面〔含 payload 密文〕与
>     AAD 面〔不含 payload 槽〕分立后认证覆盖无净损失——八明文字段两面
>     双覆盖+payload 由 HMAC 与 GCM tag 双拦）——字段搬运/重排/拼接全破。
>   - **canonical 序列化规则**（INV-D 确定性口径落纸）：JSON 对象键=字母
>     序固定；重复键=解析后重序列化对账不符即拒收；行序=**逐表矩阵**（r5
>     勘正——原「每表 (updated_at,id)」字面对 collections/tags/paper_tags
>     不可达：三表无 updated_at 列〔001_init 实照〕；行序仅服务序列化确定性，
>     不承载合并语义）：papers/annotations/notes/lineage_nodes/lineage_
>     edges/lineage_graph_meta=（updated_at,id）序〔graph_meta id=key〕，
>     collections/tags=id 序，paper_tags=（paper_id,tag_id）序，pdf_refs=
>     paper_id 序，deletions=seq 序；编码=UTF-8。
>   - envelope 明文面=format_version/schema_version/snapshot_seq/owner_id/
>     table_counts/payload_sha256+**hmac_sha256**——服务端/中继可见（
>     **明文面申报** auditor r1-N4②：表行数/owner/卷大小/卷数量/时序/
>     blob 指纹均中继可见，接受）；无 sync_key 不可伪造合法 HMAC。
>   - **重放/降级/拼接三形态封堵**：同卷重放=闸③水位；改卷伪造=闸②
>     HMAC；降级卷（剥 HMAC 字段/旧版本号）=闸①必填键拒收；字段跨卷
>     搬运=AAD+全字段 MAC 破。**同密钥多库=用户显式配对行为=该密钥域
>     内互信**（跨库重放仅此形态可达——申报接受，auditor r1-W5）；
>     **sync_key 持有者=该库同步域全权（含删除传导）**——导入为手动
>     动作（用户择卷）+应用/拒收全可见性兜底，接受申报（auditor r1-Q8
>     残项）。
>   - 密钥分发=**带外**：设置页「同步密钥」显形（形态=§13.9-1 已裁：文本串
>     +二维码）；接收端一次性导入。**密钥不随快照传输**（自举悖论规避）。
>     **丢失代价申报**（auditor r1-N4①）：sync_key 丢失=中继旧卷不可解
>     （本地库仍在可重新导出，仅历史传输卷报废——接受）；配对/轮换/撤销
>     流程=v2 服务端任务书面（N6）。
>   - PDF 文件面：blob 标识=**HMAC(blob_key, sha256(content))**（密钥化
>     摘要——同库同内容同标识保去重；中继不可做候选文件存在性确认、跨库
>     同内容不关联——auditor r1-W1 采纳，弃明文 sha256 案）；blob 内容=
>     enc_key AES-GCM 加密；服务端按标识去重——N3 只补不删。**v1 客户端
>     边界申报**（auditor r3-N9）：v1 交付=标识计算+加密能力面+卷内
>     pdf_refs 清单；**blob 传输通道=v2 服务端批**——v1 快照文件不含
>     PDF 内容（文件面转移沿 ADR-0013 手动姿态）；U3 演练无附件用例=
>     明示排除（断言面=pdf_refs 清单正确性）。
>   - 实现=node:crypto 现有能力（AES-256-GCM/HMAC/HKDF/随机）——**零新
>     依赖**。
> - **不采案申报**：纯 TLS 案（与 A8 假设直接冲突）；非对称每设备密钥对
>   案（v1 单机无多设备面，复杂度无消费面——v2 重估）。

### 4.1 envelope 线上格式（实装锚注——codec 单源=src/main/services/snapshot/envelope.codec.ts）

- 文件字节=完整 envelope 的 canonical JSON（键字母序递归/数组保序/无空白/
  UTF-8/无尾换行）——**文件即 canonical**（接收端闸②重算无二次序列化歧义）。
- envelope 恒九键：

| 键 | 类型 | 语义 | 中继可见 |
| --- | --- | --- | --- |
| format_version | number | 恒 1（数据格式版恒整数） | 明文 |
| schema_version | number | 导出时刻 PRAGMA user_version（U3 链尾=21） | 明文 |
| snapshot_seq | number | 卷序（§13.4 per-install 计数） | 明文 |
| owner_id | string | 库主 uuid v4 小写 | 明文 |
| table_counts | object | 九表名→行数（键集恰九表） | 明文 |
| payload_sha256 | string | sha256(明文 payload canonical JSON 字节) hex 小写 | 明文 |
| payload_nonce | string | 12 字节随机 nonce，base64 | 明文 |
| payload | string | AES-256-GCM 密文‖16 字节 auth tag 拼接后 base64 | 密文 |
| hmac_sha256 | string | hex 小写——唯一 MAC 面外字段 | 明文（校验值） |

- 明文 payload（加密前 canonical JSON）三件合一：`{data:{<九表名>:[全列
  行对象…]}, deletions:[{seq,entity,id,deleted_at}…], pdf_refs:[{paper_id,
  file_ref,blob_id}…]}`——九表=§13.7 清单（papers/collections/tags/
  paper_tags/notes/annotations/lineage_nodes/lineage_edges/
  lineage_graph_meta；行对象列集=TABLE_SPECS 单源）。
- MAC 面/AAD 面（两段面实装）：MAC 面=去 hmac_sha256 键后 envelope 的
  canonical 字节（payload 以其 base64 字符串形态在场；nonce/table_counts
  全入面）；AAD 面=同构造唯 payload 槽空串占位。GCM tag 编码于 payload、
  AAD 决定 tag——两面分立与 §13.6 r5 勘正一致（codec 头注自裁申报在档）。
- HKDF 实装：IKM=sync_key（64-hex 解码 32 字节）；salt='synapse/dbcamp01/
  v1.3'（常数，HKDF_SALT 导出）；info='synapse/aes'|'synapse/hmac'|
  'synapse/blob'；各派生 32 字节。
- 解密侧认证顺序（接收端六闸消费面）：结构→版本→MAC（timingSafeEqual）→
  GCM——四段原因码细分（§4.3 词汇表）。

### 4.2 密钥与身份键面（app_meta；实装锚注=snapshot.repo/app-meta.repo）

- `owner_id`/`device_token`：018 ensureIdentity（§2.1）。
- `sync_key`：U2 ensureSyncKey（ensureIdentity 同语义；装配期与身份同建，
  单路径全覆盖）；**永不出库**。
- `snapshot_seq`：envelope 面专用通道读写（不经 app-meta.repo 既有 get/set
  ——018 头注契约沿承）。
- `peer_sync_key:<owner_id>`：对端密钥（接收端验签钥源；再导入覆写刷新
  updated_at）——未配对 owner 的卷=hmac_fail（不可验签语义收窄口径）。
- 密钥共享形态：bundle=`<owner_id>:<sync_key>`（36+1+64=101 字符）——
  设置页文本串+二维码（§13.9-1）。

### 4.3 接收端六闸与拒收码（客户端实装——服务端不执行，词汇对齐用）

- 主路径序（U3 实装，R2/R4 重排后）：明文预检→decode（HMAC+解密）→seq
  决策表→对账→单事务应用。拒收卷零副作用（③④全在事务外只读预检）。
- 拒收原因码十枚（shared/ipc/schemas 单源）：`self_reimport`（自称 owner=
  本库）/`struct_invalid`（形状/键集/非 canonical/行键集/deletions 身份
  畸形）/`version_mismatch`（format_version≠1）/`schema_newer`（卷
  schema_version>本库）/`hmac_fail`（MAC 不符或未配对）/`decrypt_fail`
  （GCM 认证失败）/`seq_stale`（≤接收水位）/`seq_conflict`（同 (owner,seq)
  异内容）/`hash_mismatch`（解密后 sha 对账不符）/`counts_mismatch`
  （table_counts vs 实载行数）。
- 接收端本地合并状态键：`recv_seq:<owner_id>`（按源分键水位，空键≡0）+
  `import_log:<owner_id>:<seq>`（=卷 payload_sha256，仅 applied 面）——
  服务端**不需要**维护此二键（客户端合并语义），幂等面以 §3 键为准。

### 4.4 PDF blob 契约（v2 面）

- blob 标识=HMAC-SHA256(blob_key, papers.sha256) hex（DB 权威哈希列——
  导出零文件读）；pdf_refs 按-paper_id 序（码元比较，INV-D 跨机确定性）。
- v1 边界：卷内仅 pdf_refs 清单（标识计算+加密能力面已交付）；blob 内容
  传输=v2 服务端批（enc_key AES-GCM 加密、按标识去重、只补不删）。

## 5 吊销（库级粒度——§13.5）

- 吊销语义：服务端设备清单中将该 owner 的 device_token 置失效——**吊销库
  token 即吊销其唯一上传端**（§12-6 A2「可吊销单设备」在库级粒度下的实现
  形态）。
- 吊销作用面=**仅断上传通道**：不影响 E2E 密钥域（sync_key 不变、已存卷
  可解性不变）；与密钥轮换正交（配对/轮换/撤销流程=v2 服务端任务书面）。
- v2 重估位：下行多设备立项时，设备级细分与多 token 并存面随服务端任务书
  重估（§13.5 尾句）。

## 6 §13.9 呈裁项落定回写核对（2026-10-14 用户裁决三项）

| # | 裁决 | 设计书锚点 | 实装锚点（U1-U3 已落地） | 核对 |
| --- | --- | --- | --- | --- |
| 1 | sync_key 共享形态=b：设置页文本串+二维码 | §13.9-1；§13.6 密钥分发句 | SyncKeySection：bundle 等宽展示+复制钮+二维码（QrImage，aria-label=同步密钥二维码）；bundle 构造单源=export-snapshot.service getSyncKeyInfo | 兑现 |
| 2 | 接收端密钥导入入口=a：设置页单一入口 | §13.9-2 | SyncKeySection「导入同步密钥」textarea 单入口（渲染层 bundle 预校验→importPeerKey→main 侧同式二道校验→setPeerKey；拒本库自身）；SnapshotImportButton=快照卷导入钮（非密钥入口，两入口分立） | 兑现 |
| 3 | lineage 三表=确认入导出面 | §13.9-3；§13.7 九表清单 | snapshot.repo TABLE_SPECS 九表含 lineage_nodes/lineage_edges/lineage_graph_meta（全列清单+行序矩阵）；U3 写面同列集对偶（「出库真值/入写真值」R1） | 兑现 |

- 核对结论：**三项全兑现，零漂移**。附注：二维码真机扫码=R-F 观察项沿承
  （v189 §2——观察项非缺陷）。

## 7 服务端任务书承接清单（v2 立项时输入面）

1. 设备清单 API 形状+token 存储形态（§2.2 定夺项）。
2. 上传通道：envelope 密文卷按 (owner_id, snapshot_seq) 收储与幂等拒收
   （§3）；同键异内容=拒收对齐（§3 建议策略——v2 任务书定夺项）。
3. blob 传输通道：按标识去重、只补不删（§4.4）。
4. 吊销 API（§5）+配对/轮换/撤销流程设计（§13.6 尾句欠账）。
5. 明文面接受申报沿承（§13.6：表行数/owner/卷大小/卷数量/时序/blob
   指纹中继可见——已裁接受，服务端设计不得以「明文面泄露」为由改契约）。
6. 多设备/下行同步重估位（§1 范围外+§5 重估位）。

## 8 修订记

- r1（2026-10-15）：初版——§13.6 全文转录（v1.3 终裁稿 2026-10-15 时点态，
  含 r5 勘正）+U1-U3 实装锚注+设备清单/幂等/吊销契约+§13.9 三项回写核对
  （全兑现）。同步义务：设计书 §13.6 后续修订时本档 §4.0 随批同步。
  同日门一回炉修正（有条件放行两条件+N 两项）：§4.1 指针改 §4.3（W-1）；
  §3 同键异内容改「建议策略+定夺=v2 任务书」标法（W-2，§7-2 联动）；
  头部修订态口径收敛为「§13.6 面含至 r5」（N-1）；§7-5 明文面枚举补
  「卷数量」（N-2）。
