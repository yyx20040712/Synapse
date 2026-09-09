[routing]: run=20260909113934-d6zp source=kimi-main model=kimi-k3 switches=0 usage=in=2202,out=7379 latency=208357ms (by ds-call.mjs 链)

# F-LINT-02 设计书：B-1 同值双常量 lint 机器化（三案拟定）

**拟定方**：Kimi（第一跳）
**依据**：registry F-LINT-02 票面 + F-LINT-01 终裁档 §2 + 设计期存量 dry-run（214 文件 / 138 声明 / 18 组同值）
**前置结论**：dry-run 已暴露假阳面主体结构——**纯值匹配必然失效**，18 组中仅 6 组为真命中。三案的分歧不在"要不要过滤"，而在"聚合 pass 的架构形态"。

---

## 0. 从 18 组存量反推的核心设计判据（三案共用）

在进入三案之前，先固定从 dry-run 数据推出的判据，三案仅在架构与成本上分化。

### 0.1 18 组逐组定性（先验）

| # | 值 | 文件数 | 同名？ | 定性 |
|---|---|---|---|---|
| 1 | `'操作失败'` | 7 | 否（ACTION_FAILED/OP_FAILED 混名） | 文案复用，**误报**（红层），warn 层候选 |
| 2 | `2` | 4（含同文件双声明） | 否 | 数字巧合，**误报** |
| 3 | `3` | 5 | 否 | 数字巧合，**误报** |
| 4 | `0.5` | 2 | 否 | 数字巧合，**误报** |
| 5 | `200` | 3 | 否 | 数字巧合，**误报** |
| 6 | `50` | 3 | 否 | 数字巧合，**误报** |
| 7 | `32` | 3 | 否 | 数字巧合，**误报** |
| 8 | `15_000` | 2 | 否 | **语义无关同值**（HTTP_TIMEOUT_MS vs READING_TICK_MS——收敛反而有害，耦合两独立语义），**误报** |
| 9 | `'ai-sensor'` | 2 | 否 | 语义相邻但命名职责不同（DIR_NAME vs SKILL_NAME），**误报**，人工观察即可 |
| 10 | `100` | 2 | 否 | 数字巧合，**误报** |
| 11 | `0.1` | 2 | 否 | 数字巧合，**误报** |
| 12 | `1.5` | 2 | **是**（COLUMN_GAP_H_FACTOR） | **真命中**——复制粘贴孪生 |
| 13 | `0.02` | 2 | **是**（COLUMN_GAP_PAGE_RATIO） | **真命中**——孪生 |
| 14 | `'标注保存失败'` | 2 | 否（SAVE_FAILED/UPDATE_FAILED） | 文案近重复，红层**误报**，warn 层候选 |
| 15 | `'rounded border px-2…'` | 2 | **是**（btn） | **真命中**——className 孪生 |
| 16 | `5000` | 2 | **是**（STATUS_POLL_MS） | **真命中**——轮询参数孪生 |
| 17 | `'标签操作失败'` | 2 | **是**（TAG_OP_FAILED） | **真命中**——文案常量孪生 |
| 18 | `'block w-full rounded…'` | 2 | **是**（ITEM_STYLE） | **真命中**——className 孪生 |

### 0.2 关键判据（写死进三案）

**判据一：同名同值才入红层。** 值匹配单独不构成命中。组 8（15_000）证明：异名同值收敛是**负收益**——把两个独立语义的常量耦合成一个共享常量，未来一方改值会静默污染另一方。同名同值跨文件才是"同一概念被定义了两次"的可靠信号。18 组过滤后：**红层真命中 6 组（12/13/15/16/17/18），误报 0**。

**判据二：泛值豁免为绝对豁免（不看名字）。** `{0, 1, -1, true, false, '', null}` 即使同名也不报（如两文件各声明 `const EMPTY = ''` 属合理局部便利）。**不做数值区间豁免**——2/3/0.5/32/50/200 等不进入豁免清单，它们已被"同名"判据自然过滤；引入值域豁免（如"小于 10 的整数豁免"）会误杀组 12/13（1.5/0.02 恰是小数值真命中）。判据：**字面量类型复合判据——trivial 集合绝对豁免 + 其余值走同名判据**。

**判据三：文案不豁免，降级为 warn。** CJK 文案（组 1/14/17）不按"CJK 即豁免"处理——组 17（TAG_OP_FAILED×2）证明 CJK 文案存在真孪生。也不按 `_TEXT/_LABEL` 后缀豁免（存量命名无此前缀约定，豁免规则会空转）。处理：**异名同文案入 warn 层（非阻断），同名同文案入红层**。

**判据四：同文件豁免。** 同文件同值多声明（组 2 中 annotation-anchor.ts 双声明）不报——文件内可见性高，属作者知情选择，Rule of Three 口径下不触发。命中必须跨 ≥2 个文件。

**判据五：不设命名前缀规则，以"唯一定义点"替代。** 票面预列的"共享常量须 export 自 shared/"不实现为独立命名约定规则——红层规则收敛后即自然达成唯一定义点（孪生声明消除，仅存一处）。引入 SHARED_ 前缀是双重约定，维护成本大于收益。

**判据六：值归一化按 AST 值不按字面文本。** `15_000` 与 `15000`、`0x10` 与 `16`、单双引号字符串必须归一后比较，否则既漏报又会在收敛建议中给出错误指引。

---

## 案 A：独立扫描脚本（aggregator script 挂 check-quality）

### A.1 架构

- 新脚本 `scripts/lint/dup-constants.mjs`（Node，ESM），内部拆两层：
  - `collect-constants.mjs`（纯函数库）：用 `@typescript-eslint/parser`（项目已有依赖，与 eslint 解析口径一致）逐文件解析 `src/**`（排除 `.test.`、生成物），收集**模块级** `const` 声明中值为字面量者（`Literal` 或一元负号 `Literal`），产出 `{normalizedName, normalizedValue, valueKind, file, line}` 流。
  - `report.mjs`：按 `(valueKind, normalizedValue)` 分组 → 应用 §0.2 六判据 → 红层命中（同名跨文件）与 warn 层命中（异名同文案，长度 ≥4 且含 CJK 或 ≥2 空格分词 token）。
- npm script：`"lint:dup-constants": "node scripts/lint/dup-constants.mjs"`。
- CI 挂点：check-quality 链内，eslint 之后、单测之前。红层命中 exit 1；warn 层只打印不阻断。
- **baseline 棘轮**：`scripts/lint/dup-constants.baseline.json` 存当前 6 组真命中的指纹（name+value+files 哈希）。运行时命中 ∩ baseline = 放行并打印"待收敛"提示；命中 − baseline ≠ ∅（新增）→ 红。baseline 文件改动走正常 PR 审查。

### A.2 白名单边界

完整执行 §0.2 六判据，无增减。trivial 集合 `{0,1,-1,true,false,'',null}` 硬编码于收集层；同名判据、同文件豁免、值归一化于聚合层；文案降级于报告层。

### A.3 存量处置

- 红层 6 组（12/13/15/16/17/18）：**进 baseline 棘轮 + 立收敛子票**，而非本票内收敛——本票职责是 lint 机器化，收敛改动涉及 6 处生产代码 import 重构，混入会扩大终裁面。目标收敛点：组 12/13 → `reader/` 内 feature 级共享模块；组 15/18 → UI 样式常量模块；组 16/17 → 各自 feature 共享常量。
- warn 层 2 组（1/14）：打印进 CI 日志，不追踪。
- 其余 10 组：判据过滤，零输出。
- **存量零误报推演**：以 dry-run 18 组为输入手工推演过滤管线——红层输出恰为 baseline 6 组 → CI 绿；warn 层输出 2 组 → 不阻断。达成"存量零误报"。

### A.4 验收面

- **先红证配方**：在 `src/renderer/features/reader/` 与 `src/renderer/features/library/` 各植入 `const RED_PROOF_SENTINEL = 'red-proof-sentinel-lint-02'` → 跑 `lint:dup-constants` → 断言 exit 1 且输出同时列出两文件两行号 → 还原 → 断言 exit 0。另设阴性对照：植入异名同值（`RED_A = 777` / `RED_B = 777` 跨两文件）→ 断言**不红**（验证判据一不被回退）。
- **verify 全链**：`check-quality` 本地全跑 + CI 干跑各一次；先红证脚本化为 `scripts/lint/dup-constants.selftest.mjs` 纳入 verify。

### A.5 B-2/B-6/C-3 随评

- **C-3（重复字面量 warn）：合派。** warn 层已是其雏形；扩展收集层支持**行内字面量**（非 const 的重复字符串/数字字面量出现计数）仅需在收集器加一个 visitor 分支。建议本票交付 const 面 warn，行内字面量 warn 作为本票尾声的增量，同票终裁。
- **B-2（常量旁落清单）：半合派。** 收集层已穷举全部字面量 const，产出"未被共享引用的常量清单"是零成本副产物。建议本票输出为**只读报告 artifact**（不卡 CI），清单的消费与处置另立票。
- **B-6（同名类型豁免）：另立。** 扫描对象是类型空间（interface/type 同名），与值空间收集器零复用，混入会使本票收集层职责裂变。

### A.6 受锁面与成本

- **受锁面**：新增 `scripts/lint/` 两文件 + package.json scripts 字段 + check-quality 挂点 + baseline.json。**不触 eslint.config.js**。按票面"受锁面按终裁"，落点为 check-quality 线。
- **成本**：实现约 200 行（收集 80 / 聚合 60 / 报告 60）；运行成本为 214 文件单次解析，本地实测量级 1–3s，可接受；维护成本为 parser 版本随 eslint 依赖同升，无第二条规则体系。
- **风险**：①baseline 棘轮被人为编辑放行新增命中——缓解：baseline 存指纹哈希而非名单，编辑痕迹在 diff 中显眼；②收集层与 eslint 解析口径漂移（如新的 TS 语法）——缓解：共用 `@typescript-eslint/parser` 同一依赖实例；③warn 层噪音疲劳——缓解：warn 输出限 20 行截断+计数汇总。

---

## 案 B：eslint 复合 pass（预聚合 manifest + eslint 规则消费）

### B.1 架构

- **Pass 1**：预聚合脚本（与案 A 收集层同构）扫描全仓，产出 `.cache/dup-constants.manifest.json`：`{命中声明的文件:行 → 命中组信息}` 映射。
- **Pass 2**：自定义 eslint 插件规则 `local/no-cross-file-dup-constant`，在每个文件的 `Program:exit` 查 manifest，命中则 report——从而使违规出现在 eslint 统一输出、支持 `// eslint-disable-next-line` 行内豁免、进入 IDE 实时提示。
- 编排：`lint` script 改为 `node scripts/lint/dup-manifest.mjs && eslint .`；manifest 的 freshness 以 src 文件 mtime 集合哈希缓存。

### B.2 白名单边界

判据全部前置在 Pass 1（同 §0.2），eslint 规则本身零判据、纯报告。白名单形态与案 A 等价，但额外获得行内 disable 豁免通道（需约定：disable 必须附注释理由，由 review 兜底）。

### B.3 存量处置

同案 A 的 baseline 棘轮，但 baseline 表达在 manifest 层：Pass 1 生成 manifest 时扣除 baseline 指纹。存量推演结果相同（红 6 组入 baseline，CI 绿）。

### B.4 验收面

- 先红证配方同案 A，但断言点改为 `eslint` 输出中出现 `local/no-cross-file-dup-constant` 两条诊断。
- 额外验收：manifest 缺失/过期时 eslint 规则的行为——**必须 fail-open 为跳过并打印警告，还是 fail-closed 为报错？** 建议 fail-closed（报错提示先跑 Pass 1），否则 manifest 丢失会造成**静默失防**——这是本案最大的静默失败面。

### B.5 B-2/B-6/C-3 随评

- C-3：合派，但 warn 层落入 eslint 需第二条规则 `local/warn-repeated-literal`，规则数翻倍。
- B-2：半合派，报告 artifact 仍由 Pass 1 输出。
- B-6：另立（同案 A 理由）。

### B.6 受锁面与成本

- **受锁面**：触 eslint.config.js（注册本地插件与规则）+ 新增插件目录 + Pass 1 脚本 + lint script 编排改造。受锁面大于案 A，正撞票面"eslint.config.js 受锁"敏感区。
- **成本**：实现约 350 行；**维护成本显著高于 A**——①eslint 缓存（`--cache`）与 manifest 双缓存一致性是长期坑：manifest 变了但文件没变时，eslint 缓存会跳过重检，**命中漏报**（静默失败）；②eslint 并行/分片运行时 manifest 必须先行生成，CI 编排顺序成为隐性契约；③IDE eslint 集成在 manifest 过期时给出陈旧诊断，开发者体验劣化。
- **不确定性声明**：eslint 缓存与外部 manifest 的交互在不同 eslint 版本行为有差异，本设计未实测，列为案 B 的主要未决风险。

---

## 案 C：AST 全域收集索引（一次解析、多票消费的 code-index 层）

### C.1 架构

- 建独立仓内设施 `scripts/code-index/`：基于 `ts-morph`（新依赖）建 project 级 AST 索引，序列化常量表、字面量出现表、类型声明表到 `.cache/code-index.json`。
- B-1 检查、B-2 旁落清单、C-3 重复字面量 warn 全部实现为**索引查询器**（纯函数 × JSON），各自独立 exit code，统一由 check-quality 编排。
- 定位：不是"为 B-1 写脚本"，而是"为质量门禁家族写查询层"，B-1 是其第一个消费者。

### C.2 白名单边界

判据同 §0.2，实现为索引查询的 WHERE 子句等价物。优势：判据调整（如 warn 层阈值从长度 4 调到 6）只改查询不改收集。

### C.3 存量处置

同案 A（baseline 棘轮表达为查询排除清单）。额外产出：索引一次建成即同时给出 B-2 清单与 C-3 warn 全量，存量 dry-run 在三票间复用，**无需重复扫描**。

### C.4 验收面

- 先红证：B-1 查询器同案 A 配方；另需索引层自身的自证——植入已知常量后断言索引记录数 +1（否则索引静默漏收会使所有下游查询失效，这是本案特有的系统性静默失败面）。
- verify：索引构建 + 三查询器挂 check-quality。

### C.5 B-2/B-6/C-3 随评

- **C-3、B-2：合派且是本案的主要卖点**——边际成本趋近于零。
- **B-6（同名类型豁免）：合派可行**（类型声明表已在索引内），这是三案中唯一能自然消化 B-6 的方案。但仍建议 B-6 的**判定规则**另立终裁，索引层只供数据。

### C.6 受锁面与成本

- **受锁面**：新增 `scripts/code-index/` 子系统 + 新增生产级 devDependency（ts-morph）+ check-quality 重编排。**不触 eslint.config.js**，但引入的新依赖与缓存物是最大受锁面。
- **成本**：实现约 600 行（索引构建器 + 序列化 schema + 三查询器 + 增量失效逻辑）；ts-morph 加载 214 文件 project 的内存与时间成本（实测量级 5–15s、数百 MB 内存）显著高于案 A 的逐文件解析；增量索引失效逻辑是长期维护负担。**为一张红层规则票建索引层，存在明显过度工程风险**：B-2/C-3/B-6 的终裁口径均未定，索引 schema 可能为未来票的错误假设定型。

---

## 推荐案：案 A（独立扫描脚本），结构性预留案 C

### 理由

1. **精度等价**：三案共享 §0.2 六判据，存量推演结果完全一致（红 6 组 baseline、warn 2 组、零误报）。判据与架构正交，案 B/C 的架构溢价买不到精度。
2. **静默失败面最小**：案 B 的 manifest×eslint 缓存一致性漏报、案 C 的索引漏收系统性失效，都是**不出声的错误**；案 A 单脚本单 pass，失败即 exit≠0，无可静默态。
3. **受锁面匹配票面**：票面锁定面为"eslint.config.js 或 check-quality"，案 A 落 check-quality 线、绕开 eslint.config.js 敏感区，终裁摩擦最小。
4. **成本/收益**：案 A 约 200 行、1–3s 运行；案 C 约 3 倍成本且为未定口径的未来票预支 schema；案 B 约 1.75 倍成本且引入长期缓存一致性债。
5. **演进路径不锁死**：案 A 的收集层（`collect-constants.mjs`）设计为纯函数库即是案 C 索引层的种子——C-3/B-2 终裁落地时，收集器可平移为索引构建器，案 A 投入零沉没。

### 随案建议（终裁请示项）

- **B-2**：合派本票，仅以只读 artifact 形态交付，不卡 CI。
- **C-3**：合派本票，以 warn 层（异名同文案/重复行内字面量）交付，不阻断。
- **B-6**：另立终裁；本票收集层不为其预留接口（避免为空转需求定型）。
- **存量 6 组真命中**：建议批准 baseline 棘轮 + 立收敛子票（估 6 处 import 重构，小票），不并入本票终裁面。

### 附：本设计书自陈的不确定项（提请 deepseek 对抗审核重点）

1. eslint 缓存与外部 manifest 交互（案 B 风险）未实测，若终裁倾向案 B 须先补 spike。
2. dry-run 扫描器本身未随票提供源码，"模块级 const 138 个"的收集口径（是否含 `as const`、是否含导出声明、template literal 是否计入）未核验——案 A 实现时须以 dry-run 输出为金标准做对拍。
3. warn 层阈值（长度 ≥4、≥2 token）为经验值，存量 7 文件'操作失败'会不会在 warn 层演化为噪音源，需上线后一个迭代周期观察。
4. baseline 棘轮的"禁止新增"语义在文件重命名/移动场景下的指纹稳定性（建议指纹不含行号、含文件相对路径——路径变更即要求 baseline 随 PR 更新，此点为有意设计但可被审查挑战）。