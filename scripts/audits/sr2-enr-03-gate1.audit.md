# SR2-ENR-03 门一深审档（联审模式——门一+门二合并执行，宪法三屋职权不变）

> 审计对象：详情面板被引数透出（缺陷 D）。输入：`sr2-enr-03-gate1.diff`
> （4 文件段）+ `sr2-enr-03-brief.md` v1 + `sr2-enr-03-impl.report.md`；
> 抽读 PaperDetailPanel.tsx / paper-detail-cited.test.tsx /
> paper-detail-notes-off.test.tsx（先例）/ src/shared/models/paper.ts。
> 2026-08-28。只读审计，零写代码面。

## 0. 开工记录（会话开工纪律·技能清点）

- **用**：code-review-excellence（门一深审本体）。
- **用**：verification-before-completion（门二收口核对，见 gate2 档）。
- **不用**：systematic-debugging（只读审计，无调试面）；test-driven-development
  （不写实现，只审 TDD 证据）；subagent-driven-development（本代理即孙代理，
  不再派发）；其余技能（无浏览器/文档生成/部署面）。配置自查：本代理全只读
  （唯一可写=两审计档），无变异操作需求，模型/思考等级由主控配置并随任务书
  确认——无「等级配错签发无效」风险面。

## 1. 工单 A：「rowValue 类型收窄」自裁是否超票面

**事实链**：TS2532 发生在**测试文件 helper**（paper-detail-cited.test.tsx:66-76
`rowValue`），非组件。组件 PaperDetailPanel.tsx 的 diff 恒为 +1 行（:184 被引行），
Row 组件签名（:58 `props: { label: string; children: string }`）与行内逻辑
（:64 `{props.children || '—'}`）零触碰——git status + diff 双重证实。

**职权域判定**：票面 P1/P2 只约束组件改动形状（单文件 +1 行 JSX）与
shared/models 零触碰；P3 规定测试断言内容与 always-active，**未规定测试
helper 的实现细节**——helper 属实现者全权编写域。类型收窄改写
（`spans[0]` 索引访问 → 局部变量 `labelSpan` + 可选链 `labelSpan?.textContent`
+ `valueSpan !== undefined`）为 noUncheckedIndexedAccess 下的类型层修正，
运行时等价（`spans.length === 2` 已保证两索引存在），断言本体
（`toBe('124')/'—'/'0'`）逐字未动——非断言放宽、非组件重构。自裁已申报
（报告 §5.2）且修正后重取全轮变异红证（§3.3 第二轮），流程闭环。

**裁决：不超票面。N（合规自裁）。**

## 2. 工单 B：插入位置与边界语义

- **位置**：diff :184 恰在「期刊」(:183) 与「来源」(:185) 之间——与 P1 指定
  位置一致。行内容与 P1 预裁**逐字相同**
  （`<Row label="被引">{detail.citedByCount === undefined ? '' : String(detail.citedByCount)}</Row>`）。
- **空串 '—' 语义**：Row :64 `{props.children || '—'}`——children='' 为 falsy
  → 渲染 '—'。票面引用的「:64 既有语义」实锚无误。
- **零值边界**：`0 === undefined` 为 false → `String(0)`='0'，非空字符串
  truthy → 渲染「0」，不落 '—'。测试③（citedByCount=0 → toBe('0')）恰覆盖。
- **类型面**：三元两臂均产出 string，满足 Row children: string 契约；makeDetail
  缺省夹具（无 citedByCount 字段）在 optional 契约（paper.ts:46
  `citedByCount: z.number().int().optional()`）下合法，②测缺省分支成立。
- shared/models/paper.ts 零触碰（git status 无该文件）——P2 达成。

**裁决：N。**

## 3. 工单 C：变异红证恰中性

- 票面文化层最低要求：变异 ≥1、删被引行 → ①③红。实况：**两轮**（初版测试
  + 类型收窄修正后重取），每轮删被引行 → **3 红（①②③全红）**，均超最低要求。
- 还原安全：两轮均 cp 备份法（报告 §3.3），还原后 diff 逐字节空
  （DIFF_EMPTY）+ 复绿 3 passed EXIT_CODE=0——宪法「禁 git checkout 还原
  未提交实现」合规，且第二轮重取排除了「初版 helper 红证≠终态测试红证」的
  证据断裂。
- 恰中性 vs 3 it 断言面：变异物=被引行本体（实现面），3 断言全部感知（行
  删除后 rowValue('被引')=null → 三断言全红）；首红档（组件无行时 3 failed、
  rowValue 全 null）排除恒真断言。红证覆盖面 3/3，无冗余变异、无断言面缺口。
- ②的语义有效性追问：若实现改为 `?? ''` 判空，②仍绿——但该实现下缺省
  确实渲染 '—'（行为等价），②锚定的是「缺省→'—'」行为而非具体写法，语义
  正确；「0 非 —」边界由③独立锁住。

**裁决：恰中性成立。N。**

## 4. 工单 D：受锁面零改

diff 包 4 文件段：locks/manifest.json（M）/ sr2-enr-03-brief.md（新）/
sr2-enr-03-impl.report.md（新）/ PaperDetailPanel.tsx（M +1）。新测试文件
paper-detail-cited.test.tsx 为未跟踪新文件（不在 git diff 内），其入锁痕迹=
manifest 新条目（sha256=e7364b37…，终态）。manifest 变更内容仅两处：
generatedAt 时间戳 + 新增 4 行条目（字母序 page-column < paper-detail-cited
< paper-detail-export 正确）——**无任何既有条目 sha 变更**。审计档（brief/
report）非受锁路径。P4「不动任何既有受锁文件」达成（manifest 变更为 P3
授权的入锁所必需）。

**裁决：N。**

## 5. 工单 E：always-active 与 mock 链

- **always-active**：:101 裸 `describe(...)`，不经 guardedDescribe——与票面
  P3 及宪法三屋条款（新测试 always-active，K3 威胁结构性缺位）一致；先例
  paper-detail-notes-off 用 guardedDescribe 属其票面时代产物，本票票面明令
  覆盖先例形式。✓
- **mock 链 vs 先例**：stubApi 面（library.detail / enrich.fetch /
  export_.report|bibtex|corpus / system.openExternal）+ toastSpy +
  importOriginal 部分 mock——与先例逐段同构；差异两处均合理：①夹具注入
  移入 renderPanel（三 it 夹具不同，先例三 it 共用一夹具故置 beforeEach）；
  ②渲染 await act(async) 直等异步 resolves（先例同步 act+手动
  Promise.resolve 微任务冲刷）。mock 面覆盖组件全部 api 引用点
  （PaperDetailPanel :78/:99/:107/:110/:113/:116 六调用点逐一在 stubApi 域内）。
- 3 it 实数（grep it( =3），断言内容与 P3 ①②③逐条对应；it 描述文案自裁
  （「占位符（—）」规避内嵌引号）已申报且断言本体逐字未动。
- 清理面：scripts/audits 无 tmp-*.cjs 残留（实查），自裁 5 属实。

**裁决：N。**

## 6. findings 统计与门一裁决

| # | 级 | 内容 |
|---|---|---|
| N1 | N | 实现报告 §2 称 manifest「+6/-1」，diff 实况 +5/-1（generatedAt 1 行换 1 + 新条目 +4）——计数笔误，无实质影响 |
| N2 | N | 报告 §3.4/§6 引用「票面⑤/主控简报⑤」——票面 v1 无编号⑤；该口径（e2e 零改 24+0）出自主控派发简报（本联审任务书含同表述），系跨文档引用非杜撰 |
| N3 | N | 组件 244 行 / 宪法 250 行上限——贴线预警（非本票违规）：该组件后续再加行需先拆分 |
| N4 | N | manifest 终态 sha（e7364b37…）≠ 报告 §4 generate 时记录（bfaadf83… 初版）——类型收窄 unlock→修→apply 重锁所致，时间线自洽；终态一致性经门二实算证实（见 gate2 清单三） |

**门一统计：B=0，W=0，N=4。无回炉项，全数放行至门二。**
