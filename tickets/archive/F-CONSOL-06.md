# F-CONSOL-06 指纹门基线再生成窗口票

- id: F-CONSOL-06
- file: scripts/test-surface.baseline.json（主改面；连带 locks/manifest.json 时序同步）
- area: infra
- owner: strong
- status: open
- 立案：2026-09-29 v77 交接场（§2 次项——P2-1 呈报口用户未应答按闲时纪律跳次项）
- 出处：v77 §2.2「基线再生成窗口：cur 206 vs base 205 delta 积累（S4+改名+接缝一+两用例）——下次显式 npm run test-surface:baseline 时 S2 轴二对账（added 豁免 2 条本轮已真实命中在档）」

## 五层规约

- **行为层**：显式执行 `npm run test-surface:baseline`（check-test-surface.mjs baseline 子命令）——写盘前两轴对账（轴一=judge(old,cur) 漏登检查：所有 delta 须豁免在档；轴二=多登检查：豁免台账条目本轮须真实命中，零命中 exit 4 拒写）→通过后基线 json 重写。预期 delta 面五项（全部已在 v77 §1 记录且 check EXIT=0 合法积累在案）：
  1. scripts/check-test-surface-harding…S4 hardening 测试件：NEW_FILE 8 用例（9fa98dea4f9）；
  2. 改名件 tests/unit/renderer/lineage-timeline-page.test.tsx：NEW_FILE 9 用例净 0（f8745dea65f）——base 旧键 lineage-canvas 由 FILE 级豁免（台账 130）消费退役；
  3. theme-boot 接缝一断言集 3→5：case 级豁免（台账 131）消费旧签名；
  4. lineage-store-write 两新用例（d85817af77f）；
  5. exemptionsSnapshot 131 条随盘。
  基线数字预期滚动：base 205/2110/6501/12 → 206 文件面（用例/断言数以脚本实测为准，禁预估）。
- **接口层**：scripts/test-surface.baseline.json（受锁面）+ locks/manifest.json（若 sha 变化即时 apply——受锁件锁后编辑即刻 apply 纪律，v77 §4 条款）。check 子命令判定语义零变（check 再跑 EXIT=0，base=cur 零 delta）。
- **架构层**：[locked-change][test-refactor] 双尾注（受锁基线件+测试面战役族）。
- **生命周期层**：收口验收=①baseline 子命令 EXIT=0 且对账输出 retiring/added 计数与预期五项吻合；②git diff scripts/test-surface.baseline.json 全量逐项过目（delta 面每一条可归因到上列五项提交，出现预期外条目=停审）；③check 再跑 EXIT=0（新基线下零 delta）；④npm run verify EXIT=0 全绿（189 件/2066 用例基线不动）；⑤locks:check 绿（manifest 同步）。烤验分级=数据批轻量路径申报：脚本双轴对账+check 零 delta+基线幂等重跑（第二次 baseline 无 diff）三重机检独立复算 + k1 单审（diff 可解释性面）+ 主控亲验全机检矩阵。
- **文化层**：零新依赖；零手写数据（基线全脚本产出，人工面仅 diff 审计）；计数类数字落笔前脚本实测。

## 执行记录（2026-09-29 场，主控亲执+k1 单审）

**baseline 实录**：unlock→`npm run test-surface:baseline` EXIT=0——两轴对账通过
`retiring 2（豁免命中 2）added 2（命中 2）removed 0`；retiring=FILE 级
lineage-canvas 旧键+case 级 theme-boot:73 接缝一旧签名（恰预期项②③）；基线写入
exemptionsSnapshot=131。

**delta 全量审计**（自包含可复算规格——W2 固化：输入=`git show <旧提交>:scripts/
test-surface.baseline.json` 与新基线两 json；比对=文件键双差+同键按 `cases[].key`
[describePath+title，**不含 line**] 锚定双向全键比对+既有用例断言数变化+stats 分解）：
- 文件键恰 3：+check-test-surface-hardening.test.ts（8 例/37 断言=S4 件）+
  lineage-timeline-page.test.tsx（9 例/26 断言=改名新键）；−lineage-canvas.test.tsx
  （旧键实测 9 例/26 断言=计数级净 0，且 **9 标题集逐条相等=true**——标题级同一性
  铁证，与前票 git mv 门审双证）。
- 同键 case 级恰 2 文件：lineage-store-write 17→19（新增恰 2 用例=系统型 8 断言+
  CONFLICT 拒绝型 5 断言=13；既有用例断言数变化 0；12 条 line 字段偏移=新用例
  中部插入的结构噪声，键不含 line 无语义影响）；theme-boot 8→8（断言变化恰 1 用例
  3→5=接缝一负锚）。
- stats：205→206 / 2110→2120（+10=8+0+2）/ 6501→6553（+52=37+2+13+0，过定
  闭合）/ skipSite 12·ticketIdCount 57·eachExpandedRows 336 均不变。
- ticketIdCount 57 实测：新旧基线文件级 ticketIds 并集 57→57 零差异（两新件
  ticketIds=[]——`[票号]` 标题形态不在抽取面，S1 在案已知语法子集）。

**豁免台账 123→131 全程归因**（k1-W1 处置，git 历史单源产）：
123（F-CONSOL-03 收口 9f66b5e8263）→**+6**（SR-IPC-10×1：preload-surface 断言
样例裁决 A 案；T3-P8×5：lineage-edge-overlay/lineage-store-write/lineage-tag-edit×2/
lineage-timeline-edit——drag-hint 双态+fullRowInput month/slot 族；六条全带
reason+rulingLink）→129（7a0baa6e282 台账清理票基线再生成时冻结入快照）→**+2**
（F-CONSOL-04 FILE 级改名旧键+F-CONSOL-05 case 级接缝一旧签名）→131（本轮快照=
当前台账深拷贝）。快照写路径唯一=baseline 子命令（脚本头注「无任何红了重写分支」）。

**终验**：verify EXIT=0 全绿（含新基线下 check 零 delta+locks:check 275 同步）；
树态 4 路径零蔓延；临时审计件用毕即删（k1-W2 以本档可复算规格固化补档）。

**勘正（F-CONSOL-08，同场）**：上文「verify EXIT=0」系**管道假绿**——尾验命令
`npm run verify | grep | head; echo $?` 退出码取自 head 非 verify，真值=红（tickets
段规则 3 误报：本票为首个 file 指向 test-surface.baseline.json 的 done 票，基线
快照镜像历史用例标题含占位桩调用词面被误判占位残留）。本票提交 535417675a2 为
带红提交（指纹门/locks/test/build 段实绿，红面仅 tickets 误报段）。修复与根因链
归 F-CONSOL-08。

**门一 k1 单审**：PASS_WITH_CONDITIONS（B0/W2/N6）——W1 台账归因+快照写路径
（上文处置毕）；W2 临时件留档（可复算规格固化毕）；N1 line 仅诊断面（本档上文
**粗体**登记）/N2 两用例 8+5 拆分（毕）/N3 下次窗口同会话双跑 baseline 证字节
幂等（记交接书悬挂）/N4 尾注 [locked-change] 在位（k1 裁 [test-refactor] 不适用
——本票 diff 无 tests/**，采纳）/N5 ticketIdCount 实测（毕）/N6 标题集铁证（毕）。
k1 同意数据批轻量烤验分级（三重机检三角闭合+算术过定验证），不升全对抗位。

**k1 设计观察留档**（交接书候选）：消费型豁免命中后不从台账除名+轴二零命中检查
仅在 baseline 再生成域生效→常规 verify 下陈旧豁免静默滞留（设计观察项，本票不动）。

