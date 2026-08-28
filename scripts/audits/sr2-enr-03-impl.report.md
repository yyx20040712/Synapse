# SR2-ENR-03 实现报告 —— 详情面板被引数透出（缺陷 D）

> 实现者子代理 · 三屋模式 · 2026-08-28。票面：`sr2-enr-03-brief.md` v1（P1~P4 主控已裁，本役零自裁冲突）。

## 1. 实现摘要

PaperDetailPanel 键值行区「期刊」与「来源」之间插入一行 Row（P1 预裁修法逐字落地）：

```tsx
<Row label="被引">{detail.citedByCount === undefined ? '' : String(detail.citedByCount)}</Row>
```

Row 空串自动渲染 '—'（既有 :64 语义）→ 缺省 '—'、零值「0」、有值真实文本。`src/shared/models/paper.ts` 零触碰（citedByCount optional 契约原样）。

## 2. 文件清单（git status 实况）

| 文件 | 改动 | 说明 |
|---|---|---|
| `src/renderer/features/library/PaperDetailPanel.tsx` | M +1 行 | :184 被引行（期刊:183/来源:185 之间） |
| `tests/unit/renderer/paper-detail-cited.test.tsx` | 新增 3822B | 3 it always-active 裸 describe（不经 guardedDescribe） |
| `locks/manifest.json` | M +6/-1 | 新测试文件入锁（143→144 条） |

其余未跟踪面（`scripts/audits/sr2-ai-11/sr2-lg-06/sr2-lg-07-brief.md`）系主控并行票面，本役未触碰。受锁既有文件零改（P4 达成——manifest 变更为新文件入锁所必需）。

## 3. TDD 四档证据

### 3.1 首红（组件无被引行时）

```
Test Files  1 failed (1)
     Tests  3 failed (3)
  ① AssertionError: expected null to be '124'  // Object.is equality
  ② AssertionError: expected null to be '—'   // Object.is equality
  ③ AssertionError: expected null to be '0'   // Object.is equality
```

（rowValue('被引') 全 null——行不存在；3 it 均非恒真。）

### 3.2 绿（实现一行后）

```
Test Files  1 passed (1)     Tests  3 passed (3)   EXIT_CODE=0
```

### 3.3 变异红证（两轮，均 cp 备份法，禁 git checkout）

**第一轮**（初版测试）：
```
cp 备份 → Edit 删被引行 → vitest：
  Tests  3 failed (3)   EXIT_CODE=1   （①②③全红，超票面要求的①③）
→ cp 还原 → diff 与备份逐字节一致（DIFF_EMPTY）→ 复绿 3 passed EXIT_CODE=0
```

**第二轮**（rowValue 类型收窄修正后重取，见 §5 自裁 2）：
```
cp 备份(.bak2) → Edit 删被引行 → vitest：
  Failed Tests 3 / Tests 3 failed (3)   EXIT_CODE=1
→ cp 还原 → RESTORED_DIFF_EMPTY → 复绿 3 passed (3) EXIT_CODE=0
```

### 3.4 全量 verify（真退出码落盘 /tmp/sr2enr03-verify2.log）

```
locks:check 通过（144 个受锁文件与 manifest 一致）
lint / typecheck（node+web 双 tsconfig）通过
Test Files  95 passed (95)      ← 基线 94→95（+1 新文件）
     Tests  732 passed (732)    ← 基线 729→732（+3，与票面⑤目标一致）
build 通过
VERIFY_EXIT_CODE=0
```

日志 stderr 中文乱码系 Git Bash 按 GBK 解读 UTF-8 的显示假象（会话铁律已预告），退出码 0 为权威凭据。

## 4. locks 实录

| 步骤 | 结果 |
|---|---|
| generate 前 manifest | 143 条 |
| `npm run locks:generate` | 「仅生成 manifest（144 条），未设只读」；新条目 `tests/unit/renderer/paper-detail-cited.test.tsx` sha256=bfaadf83… 已入 |
| `npm run locks:apply` | 「已锁定 144 个文件（只读）。manifest 记录 144 条」 |
| `npm run locks:check` | 通过（144 一致），CHECK_EXIT=0 |
| 类型修正期间 | unlock→修→apply 重锁（即时同步，无跨延迟），最终态 apply 144 条 |

## 5. 自裁申报

1. **it 描述文案**：②③ 描述中预期值改写为「占位符（—）」「而非占位符」——规避字符串内嵌单引号语法错误（首写触发过一次，即时修复）；断言本体逐字符合票面（'—'/'0'）。
2. **rowValue helper 类型收窄**：首轮 verify 被 typecheck 拦截（TS2532：noUncheckedIndexedAccess 下 `spans[0]` possibly undefined）→ unlock→改写为局部变量判空收窄（运行时等价：length===2 已保证索引存在）→apply。属类型层修正，非断言放宽；修正后重取全轮变异红证（§3.3 第二轮）。
3. **行定位方式**：票面只要求「真实文本断言」，未指定定位器；自裁取行内定位（label span === '被引' 的 Row 取值 span 文本），规避全局 textContent 匹配下统计行「0」的假阳性面。
4. **锁操作与文件编辑交错**：二次变异时 Edit 报「File has been modified」——锁脚本 unlock/apply 刷新文件属性/时间戳所致；重读确认内容无损后完成，无数据损伤。
5. **临时脚本**：`scripts/audits/tmp-check-locks.cjs` / `tmp-utf8check.cjs` 用毕即删（scripts/audits 误扫实录教训），目录无残留。

## 6. 疑虑

- **e2e 未重跑**：票面④验证义务=`npm run test`+全量 verify（均绿）；主控简报⑤「e2e 零改（24+0 不变）」按零改动面预期处理。被引行为纯展示文本、无交互路径，理论上不影响 24 spec；如门审要求实证可补跑 `npm run test:e2e`（约数分钟）。
- **manifest.json CRLF→LF 警告**：PowerShell 写 manifest 产生 CRLF，.gitattributes 归一为 LF 属提交时正常行为；manifest 承载的是受锁文件 sha256 值而非自身哈希，行尾归一不影响 check-locks 对账（历史 143 条同流程无事故）。
- **UTF-8 字节级验证**：两新/改文件 node 读取验证无 U+FFFD 替换字符、「被引」中文可读（3822B/9809B）。
