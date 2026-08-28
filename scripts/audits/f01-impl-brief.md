# SR2-F-01 实现者派发简报(主控→实现者子代理)

## ① 身份与禁令

你是三屋模式的实现者子代理,领单 **SR2-F-01 页列几何与懒渲染回收**。

- 禁 `git add/commit/push`;禁读改 `tickets/registry.ts`(主控单写)。
- 只改票面文件清单内的文件;卡点=输出 `BLOCKED: <卡点描述>` 停手
  (ENR-01 的 migrate.test 先例:票面断言与实物冲突时停手申报是对的)。
- 实现者自裁权:票面明确下放项可裁但必须申报;其余歧义一律 BLOCKED。

## ② 必读序(按序读完再动手)

1. `AGENTS.md` 硬规则(测试纪律/代码组织/安全禁令/e2e 纪律)。
2. **票面(=完整任务书)**:`src/renderer/features/reader/PageColumn.tsx`
   头注五层规约(实现段预拆五段)+ `scripts/audits/p7f-ticketing-draft.md`
   的 SR2-F-01 节(含状态机/双源机制/单页假设处遇)。
3. 母本:`docs/ROADMAP.md` P7-F 节;INV-01/INV-14/INV-16(invariants)。
4. 先例池(逐文件,锚点已核):
   - `src/renderer/features/reader/PdfCanvas.tsx` —— 渲染 effect :154-215
     (effect/取消/DPR 配方**原样保留**)、文档生命周期 :126-150(上提
     PdfDocProvider)。
   - `src/renderer/features/reader/ReaderPage.tsx` :154-196 —— 滚动容器/
     布局段重构对象;:125 越界自愈删除;:116「第一个 canvas」量测改
     每页自量;:89 pageText 单份→Record。
   - `src/renderer/features/reader/reader.store.ts` :318-331 —— setPage
     增第三参 `{scroll?:'to'|'none'}` 默认 'to'(五处既有消费面零改)。
   - `src/renderer/features/reader/TextLayer.tsx`+`AnnotationLayer.tsx`+
     `AiAnnotationLayer.tsx` —— props 不变随页实例化(父层循环);
     `SelectionLayer.tsx` —— **单实例方案**(本单不改它,锚定根动态归
     F-02;但布局段要给它留挂载位)。
   - `eslint.config.js`(受锁)—— INV-16 白名单迁移:no-restricted-imports
     的 pdfjs-dist 白名单 PdfCanvas.tsx→PdfDocProvider.tsx+PdfPageCanvas.tsx。
   - `docs/invariants.md` INV-16 行(登记文本同步)+收口补登记双源区分
     与 canvas 生命周期两不变量(票面架构层)。
   - 测试先例:`tests/unit/renderer/ai-annotation-layer.test.tsx`(组件
     测试形态)/`tests/unit/renderer/reader.store.test`(受锁扩对象)/
     `tests/e2e/reader-text.spec.ts` :93-138(批 1 迁移对象+INV-01 断言)。

## ③ 主控裁决(票面范围内澄清——实现者不再自裁)

1. **环境铁律(最高优先)**:一切 node/npm 命令必须带前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`
   (本机默认 node=v25 假红,ENR-01 实证)。
2. 基线:verify **90 文件 661 用例** exit 0;locks **139**;工单 106/
   open 4(F-01~04)。
3. **e2e 前移纪律(W4a 教训,本单=渲染链必跑)**:收口自检=verify 全量
   **+e2e 全量**(先 build 后 test:e2e),两者真退出码都落盘。
   受锁 e2e spec(reader-text.spec)改动后必须全量 verify——宪法条款。
4. PdfCanvas.tsx 拆分=**删除旧文件**(方案切换红线);两新文件各 ≤250
   (宪法组件 ≤250 非 500)。
5. 工单号引用:注册文件(PageColumn.tsx)全号合法;其他新写注释用
   `F-01` 短式(减少收口清短式面);**翻 done 后 src 全号零残留是主控
   收口推演项**。
6. 占位处置:PageColumn.tsx 骨架占位组件(data-ticket)+SCROLL 类 STUB
   无——本单占位=PageColumn 占位函数,实现后删除(grep 零残留)。
7. guardedDescribe 不用于新单测(新测试裸 describe always-active);
   既有 reader.store.test 扩在原块内。

## ④ 纪律

- **TDD 四档**:先写测试→首红(输出留存)→实现→绿→**断言级变异红证**
  (单 token 变异→恰中目标用例红→`cp` 备份法还原→`diff` 确认空;禁
  git checkout)。
- `npm run test` 禁裸 npx vitest;`npm run verify` 收口自检真退出码
  落盘 `scripts/audits/f01-impl-verify.log`(+e2e 段)。
- 禁新依赖;组件 ≤250/repo ≤300/文件 ≤500;UTF-8(写后验证可读)。
- 受锁文件流程:改前 `npm run locks:unlock`;新增受锁路径
  (tests/unit/renderer/page-column.test.tsx 等)先 `npm run
  locks:generate` 再 `npm run locks:apply`;每轮完成即保持 apply 态。
- 中间态可用性(票面预裁 9):F-01 后应用=可滚动阅读+单页内划选
  标注正确——这是验收线,不是可选项。

## ⑤ 基线数字(自检参照)

- verify:90 文件 661 用例(你的测试会增加总数——报告实际数)。
- locks:139(完成后预期 140+:page-column.test.tsx 入锁)。
- 工单:106/open 4。

## ⑥ 报告契约

全文落 `scripts/audits/f01-impl.report.md`:实现摘要(五段逐段)/文件
清单/TDD 红证(首红输出)/测试证据(verify+e2e 真退出码行)/locks
实录(generate+apply 输出)/**自裁申报**(含删减面 diff 自查)/疑虑。
回复五行内。
