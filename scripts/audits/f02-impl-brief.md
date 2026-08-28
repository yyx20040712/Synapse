# SR2-F-02 实现者派发简报(主控→实现者子代理)

## ① 身份与禁令

你是三屋模式的实现者子代理,领单 **SR2-F-02 四层多页化收口与跳页兼容**。

- 禁 `git add/commit/push`;禁读改 `tickets/registry.ts`(主控单写)。
- 只改票面文件清单内的文件;卡点=`BLOCKED: <描述>` 停手申报。
- 实现者自裁权:票面下放项可裁但申报;其余歧义一律 BLOCKED。

## ② 必读序

1. `AGENTS.md` 硬规则。
2. **票面**:`src/renderer/features/reader/anchor-locate.ts` 头注 [SR2-F-02]
   段(双裁决链声明)+`scripts/audits/p7f-ticketing-draft.md` SR2-F-02 节
   (选区态状态机+锚定根动态方案)。
3. **F-01 产物依赖**(已收口 f20c2fd,你的地基):
   - `PageColumn.tsx` —— onVisibleChange(锚定页报告通道)/data-page-root
     页盒查询约定/renderPage 覆盖层循环。
   - `ReaderPage.tsx` —— SelectionLayer 单实例挂载位(锚定页盒内条件渲染,
     F-01 自裁 4:锚定页外划选暂不弹工具条——**你要解除的这个中间态**)。
   - `reader.store.ts` —— setPage 第三参(INV-29 双源)。
4. 现状锚点:
   - `SelectionLayer.tsx` :81(锚定根=pageRoot.querySelector('.textLayer'))
     /:50/:106-111(selectionchange 防抖)/:112-122(mouseup)/:95-103
     (工具条落点=选区 rect−页根 rect)。
   - `anchor-locate.ts` :153 附近(verifyWhenReady 的全局 querySelector
     第一——你要改页限定处;签名 :69-86 **零触碰**=冻结面)。
   - INV-14(监听成对)/INV-20(锚定单入口)/INV-24(片段序——与选区序不同源)。
5. 测试宿主:`tests/unit/renderer/selection-layer.test.tsx`(你新建);
   `tests/unit/renderer/anchor-locate.test.ts`(受锁扩);
   e2e 批 2 三 spec(reader-text :140-216 段/ai-notes-section :212-222/
   lineage :497-505)。

## ③ 主控裁决(澄清——不再自裁)

1. **环境铁律**:一切 node/npm 命令带前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`(node=v25 假红)。
2. 基线:verify **91 文件 679 用例** exit 0;e2e **20 passed**;locks
   **140**;工单 110/open 3(F-02/03/04)。
3. **渲染链单:收口自检=verify 全量+e2e 全量**双真退出码落盘
   `scripts/audits/f02-impl-verify.log`;受锁 e2e 改动后必须全量 verify。
4. SelectionLayer 单实例方案保持(F-01 已落挂载位)——你的改造=锚定根
   从「固定锚定页」变「选区 anchorNode 向上最近页盒」(纯函数页盒遍历),
   **工具条落点以选区所在页盒为参照系**(单实例 offset parent=页列容器,
   坐标换算经页盒 rect)。
5. 跨页选区拒绝:anchorNode 页盒≠focusNode 页盒→不创建+toast
   「选区跨页,不支持创建标注」(INV-02 可见;禁静默)。
6. verifyWhenReady 页限定:目标页盒内查 .textLayer(data-page-root=
   anchorPage 对应盒——注意 1 基/0 基换算,PageColumn 页盒 1 基)。
7. 新写注释工单号用 `F-02` 短式;anchor-locate.ts(注册文件)全号合法。
8. e2e 批 2 用例挂 DEPS=['SR2-F-02'] 守卫(F-01 批 1 先例:skip 形态+
   备份法无守卫正向实跑取证)。

## ④ 纪律

- TDD 四档(首红留存→绿→断言级变异红证 cp 备份法还原 diff 空)。
- `npm run test` 禁裸 npx;组件 ≤250/文件 ≤500;UTF-8。
- 受锁流程:selection-layer.test.tsx 新入锁 generate→apply;anchor-locate.test
  与三 e2e spec 扩前 unlock。
- 中间态解除验收:F-01 自裁 4 的「锚定页外划选不弹工具条」在本单收口
  ——任意可见页划选均正确(组件测试+e2e 断言)。

## ⑤ 基线数字

- verify:91 文件 679 用例(你的测试会增加——报告实际数)。
- locks:140(完成后 141:+selection-layer.test.tsx)。
- 工单:110/open 3。

## ⑥ 报告契约

全文落 `scripts/audits/f02-impl.report.md`:实现摘要/文件清单/TDD 红证/
测试证据(verify+e2e 真退出码)/locks 实录/自裁申报(含删减面 diff 自查)/
疑虑。回复五行内。
