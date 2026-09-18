[routing]: run=20260918230704-ql5wimam source=deepseek model=deepseek-v4-flash role=gate1-reviewer@fb86152e cfg=545b6843a147 switches=0 usage=in=8038,out=23078 latency=97508ms (by ds-call-v2 链)

# b24 门一审查报告（F-LAYER-01 对抗审 + F-TIME-01 轻量审）

审级沿用统一口径：**B=Blocking（须改）/W=Warning（应改）/N=Note（记录）**。只读包内三件（简报 / diff / 评估报告），未跑命令、未查仓库其他文件，包外可裁点显式标「不确定」。

---

## Part A：F-LAYER-01（判定 = PASS_WITH_WARNINGS）

### 查1 零行为逐 hunk
三 hunk 对读，service 真身对 ipc 旧文**逐行同构**：
- `readSettings`：`readFile(...,'utf-8')`→`JSON.parse`→`appSettingsSchema.safeParse`→catch 回 `DEFAULTS`，一字未动；
- `get`：`settings === DEFAULTS` 恒等比较 + 尽力 `atomicWriteFile` try/catch 吞错，同；
- `set`：`atomicWriteFile(path, ${JSON.stringify(req,null,2)}\n)`，同；
- `diagNetwork`：`Promise.all(ALLOWED_REMOTE_HOSTS.map(deps.ping))`，同；
- `DEFAULTS` 字面量、`settingsPath=join(deps.userDataDir, SETTINGS_FILE_NAME)` 全同。
ipc 薄层=`get/set/diagNetwork` 三箭头纯委托，零逻辑残留（`_req`→`req` 仅形参改名）。**无 B 级语义漂移**。

- **A-1[N]**：service 头注（settings.service.ts:6「返回默认 {contactEmail: DEFAULT_CONTACT_EMAIL, theme:'system'}」）**漏 `uiScale:'small'`**（真值同文件 DEFAULTS 行含之）。系旧 ipc 注释原样携带；但新 ipc 头注声明「行为全貌=service 头注」把头注升为单源，遗漏由隐性变显性。
- **A-2[N]**：`ping` 绑定时机改变——旧 ipc `deps.ping(host)` 调用期取属性；新 service 构造期 `{ping: deps.ping}` 快照。deps 不变前提下无行为差，理论 note。

### 查2 L1 锁线语义
group 追加 `'electron'`，既有三 pattern 无损；message 为**纯追加**（「；禁依赖 electron——core 可抽包（…F-LAYER-01）」），与既有语义共存无损。
- **A-3[N，不确定]**：`'electron'` 未加 `**/` 或边界锚。若匹配语义为子串/regex，则 `electron-store`/`electron-log`/相对路径 `./electron-*` 会误伤；按同块既有 `**/db/...*` glob 风格推断应精确命中裸 specifier。规则匹配语义在包外，**标不确定**。

### 查3 方案 B 边界
diff 文件清单=eslint.config.js / src/main/ipc/settings.ts / src/main/services/settings.service.ts 三件；`services/index.ts(ServiceBundle)`、`tests/**`、bootstrap **均未出现**。零范围蔓延。

### 查4 受锁面
diff 内注释句「shared/db 两块既有同款禁令，本块补齐=三域闭合」与简报勘正一致；但 shared:136 / db:154 不在本 diff。
- **A-4[N，不确定]**：票面原文「三处新红线」（被删骨架行确列 services/db/shared）→勘正为「只补 services 一处」，本 hunk 可支持（只动 services 块）；但 db/shared 既有态**包内不可独立验证**，成立性依赖 diff 外文，标不完全验证。受锁=eslint.config.js 单件与 diff 无冲突。

### 查5 应变红证（纸面）
- **M1**：service 若 `import 'electron'` → 命中新增 pattern → EXIT=1（message 含 L1 句）→还原复绿。逻辑链闭合（前提=规则语义正确，见 A-3）。
- **M2**：DEFAULTS.theme='dark' 只影响「回退默认」路径。简报称 theme 相关用例=1/2/4（**3 处**）而实测 **2 failed**。推演：若三处中有一为「写后读显式 theme」（不读 DEFAULTS，对变异免疫），则 2 failed 自洽；若三处皆断言默认 theme，应为 3 failed。settings.test 不在包内 → **不能证实 2/6，标不确定**（简报 3 vs 2 的张力需 test 原文裁）。
- **A-5[N]**：上条不确定，登记。

### 查6 实现者自裁三条
1. 两行语境注释（eslint 块加 L1 说明）——**准**（零行为、增可读性）。
2. 旧注释路径笔误 `tests/unit/ipc/ipc/settings.test.ts`→`tests/unit/ipc/settings.test.ts`——**准**（源 `src/main/ipc/settings.ts` 镜像应单层 ipc；service 头注亦单层，互证）。
3. 「heartbeat 探针锁链观察」——简报未给条目原文/证据。
- **A-6[N，不确定]**：第 3 条**信息不足，无法裁**（须派发方补该条原文）。

### Part A 拷问
- **A-7[W]（拷问1）**：service 头注宣称「6 用例经 ipc 薄分发透传锁住本件**全部公开行为**」。薄层确为纯委托→穿透成立；但「全部」需 6 用例覆盖 get/set/**diagNetwork** 三面，diagNetwork 是否被断言**包内无从证实**。声明强于可证面=守卫缺口风险，记 W。
- （拷问2 见 A-4；结论：L1 三域闭合中 services 一处成立，另两处**不可验证/不确定**。）

---

## Part B：F-TIME-01（判定 = PASS_WITH_WARNINGS）

### 查1 计数实测核对
§1.3 七件 287+496+149+96+61+69+44=**1202** ✓；§1.1 time/ 303+300+139+87=**829** ✓；§0 387=300+87 ✓。表内加法自洽。

- **B-1[W]**：§0/§4 主推荐净删「约 **−1,032**」与其成分和不符。§4 原文「实现 −387 −setup 约 40 ≈ −427；测试 −645（496+149）；合计 约 −1,032」——427+645=**1072**，非 1032；1032 恰=387+645（**漏 setup 40**）。呈裁头条数字内部矛盾，须并（应为 −1,072 或修 −427 行）。
- **B-2[W]**：票面骨架「约 1,100 行」与报告实测口径（impl 829+13、test 1202、scroll-progress 367）**无显式对照句**：全篇未出现 1,100，§1.1 仅分列数字，未做「原估 vs 现测」澄清，呈裁口径缺环。
- **B-3[N]**：§4 选项 3「链总量约 −650 实现行」——outbox 387+reading-time 收敛 150=537，与 650 差 113，加总依据未列（或含 setup 139）。约数但口径不透明。

### 查2 技术断言抽查
§2「saveProgress=本地 IPC+同步 SQLite（better-sqlite3 同步单连接）/非网络通道」与 §1.2「repo:201-204 原子累加+service 透传」内部一致；「窗口=enqueue→ack 毫秒级」为架构推断且报告自认（见查4）。§4 选项 2「页码链牵连」与 §1.1「sp.dispose 尾账经 enqueue :128-131」、§2「P7X-02 页码并入/R7 双 invoke 消除」互证。

- **B-4[N]**：§4 称「**三**收尾口回改直发」，仅指名两口（复合 flusher invokeOne、sp.dispose 排干），第三口未指名——数目断言缺第三点。

### 查3 呈裁完整性
T1（0/1/2/3 四档）互斥、T2（随下波/单独小票/并入 F-SENSOR-01）三支基本完备；推荐 T1=2 有依据链。§5 尾注预告与选项面**对应正确**：选项 2=[locked-change] 单尾注（INV 修订+装配回改）；选项 3=双尾注（[locked-change][test-refactor]）。

- **B-5[N]（拷问3）**：推荐依据含「**无新设计面**」，但 §4 选项 2 实含「invoke 失败→内存重试（短退避）→最终失败 WARN toast+丢该笔」=新增重试/告警逻辑。称「纯删票/无新设计面」与 §4 自述存**口径张力**（该逻辑是否等于 P7X-02 前 invokeOne 直发形态的简单恢复，包内不可判，**不确定**）。建议拆「净删行数 / 新增行数」。

### 查4 诚实申报面
§2 末尾「无生产数据可量化（负面清单=遥测不做）——损失面判断是架构推断，如实申报」**显式**；§4 选项 3「实现复杂点（如实申报）…非纯删票，需 mini 设计链」**显式**。申报面达标。

### Part B 拷问
- 选项 3 比较基准写明（「优于**现状** ledger crash 丢整段未 flush 账」）✓；选项 2「损失面**同 A**」引用 §3 行 A，略欠显式但可回溯。
- （拷问3 见 B-5；结论：推荐选项 2 的「无需 mini 设计链」**存张力/不确定**，不宜作硬结论。）

---

## 主控关键假设拷问（烤验义务）
1. 「零行为=受锁 6 用例穿透薄层锁 business」：穿透**成立**（薄层纯委托），但**覆盖完备性**（diagNetwork）未证 → A-7[W]。
2. 「L1 三域闭合成立」：本 diff 只见 services 一处，shared/db 既有禁令 **包内不可验证** → A-4[N]（不确定）。
3. 「推荐选项 2 无需 mini 设计链」：选项 2 含内存重试+强 WARN 新逻辑，与「无新设计面」**口径张力** → B-5[N]（不确定）。

## 统计与总评
- **Part A**：B=0 W=1 N=6 → PASS_WITH_WARNINGS。零行为/薄层/方案 B 边界**扎实**（逐 hunk 同构、纯委托、零蔓延）；扣分点=「锁住全部公开行为」声明过强（diagNetwork 覆盖未证），及两处不确定（electron 锚定语义、shared/db 既有禁令）。
- **Part B**：B=0 W=2 N=3 → PASS_WITH_WARNINGS。技术结论内部自洽、诚实申报达标、尾注对应正确；**须修**呈裁头条 −1,032 与成分和矛盾，并补「约 1,100 行」口径对照。
- **合计**：B=0 W=3 N=9。机读词表仅 PASS|FAIL，无 B 故判 PASS；本体为 PASS_WITH_WARNINGS。

FINDINGS: B=0 W=3 N=9 VERDICT=PASS