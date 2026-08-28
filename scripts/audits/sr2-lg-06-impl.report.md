# SR2-LG-06 脉络跳转接笔记面板信号（缺陷 E2）——实现报告

> 实现者子代理，三屋模式。票面=`scripts/audits/sr2-lg-06-brief.md`。
> 状态：完成（verify 全绿真退出码 0）。

## 1. 实现摘要

`open-paper-anchor.ts` anchor 分支在 `locateAnchor` 之前新增 1 行接线
（+1 行行内注释）：`req.aiNoteId` 有值时先发
`useReaderStore.getState().notifyAiNoteHighlight(req.aiNoteId)`——复用
AI-09 全套语义（OutlineAside 订阅 aiNoteHighlight 持久 state 切 'notes'
tab+列表滚动高亮；早发不丢失，挂载后效应补切）。头注追加 LG-06 链声明
（F-02 双裁决链先例：LG-04 头链不动）。无锚/无 aiNoteId/annotationId
路径零触碰（notify 是呈现信号非定位降级，不违 INV-20）。

## 2. 文件清单（git diff --stat，3 文件 +62/-7）

| 文件 | 改动 |
| --- | --- |
| `src/renderer/features/reader/open-paper-anchor.ts` | +12：anchor 分支接线 1 行+行内注释 1 行+头注 LG-06 链声明段 |
| `tests/unit/renderer/lineage-side-panel.test.tsx` | +46/-7（受锁，[locked-change]）：stub 池+解构加 `notifyAiNoteStub`；reader.store mock 的 getState 加 `notifyAiNoteHighlight: notifyAiNoteStub`；头注覆盖说明追加；消费方级组新增 2 it |
| `locks/manifest.json` | sha 同步（locks:apply 重锁 144 条） |

## 3. TDD 四档实录

### 3.1 首红（接线前，/tmp/lg06-red2.log，VITEST_EXIT=1）

仅 it① 红、19 过（it② 守卫语义本就应绿）：

```
FAIL tests/unit/renderer/lineage-side-panel.test.tsx > 消费方级 LG-06：
  带 aiNoteId 锚请求→notifyAiNoteHighlight("a1") 先于 locateAnchor+定位照常
AssertionError: expected "spy" to be called 1 times, but got 0 times
 ❯ tests/unit/renderer/lineage-side-panel.test.tsx:214:28
    214|   expect(notifyAiNoteStub).toHaveBeenCalledTimes(1)
Tests  1 failed | 19 passed (20)
```

红前两轮测试自缺陷修正（非实现面）：① vi.hoisted 返回对象加了
`notifyAiNoteStub` 但顶层解构漏加（ReferenceError，既有 4 用例连带炸）；
② it① 标题 `(''a1'')` 相邻字符串 JS 语法错误→改内层双引号。

### 3.2 绿（实现后，/tmp/lg06-green.log，VITEST_EXIT=0）

```
Tests  20 passed (20)
```

### 3.3 变异红证（cp 备份法，禁 git checkout，/tmp/lg06-mutant.log）

- cp `open-paper-anchor.ts` → `/tmp/lg06-anchor-backup.ts`
- sed 删接线行（grep 确认文件内 notifyAiNoteHighlight 仅剩头注文本 1 处）
- 跑测：VITEST_EXIT=1，全日志（去色）：

```
⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯

 FAIL  tests/unit/renderer/lineage-side-panel.test.tsx > 消费方级 LG-06：带 aiNoteId 锚请求→notifyAiNoteHighlight("a1") 先于 locateAnchor+定位照常
AssertionError: expected "spy" to be called 1 times, but got 0 times
 ❯ tests/unit/renderer/lineage-side-panel.test.tsx:214:28
    212|   })
    213|   await flush()
    214|   expect(notifyAiNoteStub).toHaveBeenCalledTimes(1)
       |                            ^
    215|   expect(notifyAiNoteStub).toHaveBeenCalledWith('a1')
    216|   // 顺序：notify 先于 locateAnchor——面板信号早发（持久 state 非瞬态事…

 Tests  1 failed | 19 passed (20)
```

- cp 还原 → `diff` 空（DIFF_EMPTY=OK）→ 复跑 20/20 绿（VITEST_EXIT=0）

### 3.4 verify（真退出码）

- 第一轮 VERIFY_EXIT=1：tickets:check 拦「引用了不存在的工单号
  SR2-LG-06」（registry 113 单无此号）→ 自裁申报 §5.1 头注改
  `[LG-06]` 格式。
- 第二轮 VERIFY_EXIT=2：tsc 关口拦 it② 载荷 `annotationId` 类型错
  （OpenPaperRequest 无此字段——vitest/esbuild 不查类型，票面纪律预判
  实证）→ it② 改裸锚形态（票面 P3 预给二选一的另一支）+ 重走
  unlock→改→apply。
- **第三轮 VERIFY_EXIT=0（落盘 /tmp/lg06-verify-exit3.txt +
  /tmp/lg06-verify3.log）**：95 文件 734 用例全过（基线 732，+2 符合
  预期）；quality（无占位/乱码/跨域）/tickets（113 open 0）/locks 144/
  lint/typecheck/test/build 全绿。e2e 零改（本单无 spec 面，24 基线不变）。

## 4. locks 实录

- `npm run locks:unlock` → 改受锁测试 → 首红取证 → （it② 类型修正时
  第二轮 unlock→改）→ 每次 `npm run locks:apply`：锁定 144 文件、
  manifest 记录 144 条、`locks:check` 对账一致（verify 内含关卡复验过）。
  manifest sha 变更随 [locked-change] 尾注提交（主控收口）。

## 5. 自裁申报（超票面文字面的决定）

1. **头注工单号格式 `[SR2-LG-06]`→`[LG-06]`**：照 F-02 先例写
   `[SR2-LG-06]` 撞 tickets:check 规则 2（src 引用工单号必须存在于
   registry；registry 基线 113 单全 done 无 LG-06，实现者禁建工单）。
   对照同文件 LG-04 既有头链本就是无 SR2 前缀格式（「LG-04 接缝落地」，
   LG 系列缺陷役单不走 registry 工单）——改用 `[LG-06]` 与 LG-04 链
   同款，P4「追加 LG-06 链声明+LG-04 链不动」实质不变。若主控后续把
   LG-06 登记进 registry，可再换回带前缀格式（一行改动）。
2. **it② 场景取「裸锚」弃「annotationId」**：票面 P3 预给「annotationId
   或裸锚」二选一；tsc 实证 OpenPaperRequest 无 annotationId 字段
   （标注跳转不经本总线消费点，走 FragmentNotesList→locateAnchor 直调
   链）——annotationId 形态类型不合法，取裸锚（票面预给范围内，附类型
   事实说明）。
3. 测试自缺陷三处即时修正（§3.1 ①②+it② 首版 locateAnchor 断言按
   annotationId 写错透传形状）：均为红绿迭代内测试自身修正，未放宽
   任何断言、未改既有用例。

## 6. 疑虑

- 无阻塞性疑虑。备注：`git diff` 对 `locks/manifest.json` 报 CRLF→LF
  归一化 warning（PowerShell apply 写盘行尾），locks:check sha 对账
  已过、仓库 .gitattributes 强制 LF，与既往工单同形态，非本单引入。
