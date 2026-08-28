# SR2-F-03 实现者派发简报(主控→实现者子代理)

## ① 身份与禁令

你是三屋模式的实现者子代理,领单 **SR2-F-03 滚动进度回写恢复与键位迁移**。

- 禁 `git add/commit/push`;禁读改 `tickets/registry.ts`——**取证也不许触
  tickets/**:e2e 守卫解除取证用 spec 备份法 skipIfPending([])(methodology
  §4.1 新条款+F-02 门一 W1 实录;再犯同类=直接 B)。
- 只改票面文件清单内的文件;卡点=BLOCKED 停手申报。
- 实现者自裁权:票面下放项可裁但申报;其余歧义一律 BLOCKED。

## ② 必读序

1. `AGENTS.md` 硬规则。
2. **票面**:`src/renderer/features/reader/scroll-progress.ts` 头注五层规约
   (STUB 骨架)+`scripts/audits/p7f-ticketing-draft.md` SR2-F-03 节(六态
   状态机+跨格序列全表)。
3. **F-01/F-02 产物依赖**(已收口 f20c2fd+31b3a07):
   - `PageColumn.tsx` —— scrollToPage/onVisibleChange(锚定页报告)/
     data-page-column 容器/页盒查询约定。
   - `reader.store.ts` —— setPage 第三参(INV-29 双源:'none' 只落账不 bump)
     /pendingProgress+防抖链 :163-197(你要拆到 scroll-progress 的对象)/
     openPaper :278 落 page 时 totalPages≡0(W-A:夹取锚就绪时)。
   - `SelectionLayer.tsx` —— F-02 动态锚定(你不动它,但装配面共享 ReaderPage)。
4. 现状锚点:
   - `ReaderPage.tsx` —— 滚动容器 :154(onScroll 接线落点)/装配段
     (**F-02 门一 N4 裁决并入本单**:SelectionLayer 挂载盒重挂窗口=工具条
     收起限制——滚动中工具条不应因页盒重挂闪收,装配面处置:挂载盒
     稳定化或工具条跟随选区页,实现者自裁+申报)。
   - `ReaderShortcuts.ts` :48-53(PAGE_KEYS 表)/:80-92(注册+preventDefault
     :83 注释语义反转)/:94-102(ctrl+wheel 零触碰)。
   - `anchor-locate.ts` :160-169(**F-02 门一 W3 裁决并入本单**:回退分支
     「全局第一」收紧为「全局唯一」——querySelectorAll 断言唯一,>1=按
     page 层降级 toast;防 anchorPage 超界数据损坏时邻页误 exact)。
   - INV-29(双源)/INV-30(canvas 窗口)/INV-03(per-tab stale-guard 同族
     参考)/keymap.ts editable 避让。
5. 测试宿主:scroll-progress.test(你新建)/reader-shortcuts.test(受锁扩)/
   reader.store.test(受锁扩)/e2e 批 3=reader-text.spec :221-321 tab 序列段。

## ③ 主控裁决

1. **环境铁律**:一切 node/npm 命令带前缀
   `export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`。
2. 基线:verify **92 文件 691 用例** exit 0;e2e **20 passed**;locks
   **141**;工单 110/open 2(F-03/04)。
3. **渲染链单:收口自检=verify 全量+e2e 全量**双真退出码落盘
   `scripts/audits/f03-impl-verify.log`。
4. 六态状态机=票面字面(idle/scrolling/pending/writing/restoring/loading)
   ——writing 中用户又滚→回 scrolling(新格);用户接管=wheel/keydown/
   pointerdown 三类**非 scroll** 信号(程序 scrollToPage 自发 scroll 不算,
   W-B);回写竞 tab 切换=writing 前校验 getPaperId 失配丢弃。
5. 时间全注入(now/timers 经 deps——禁真 timer;jsdom/fake timers 测试)。
6. 键位:PAGE_KEYS 四键=滚动一屏−一行重叠(常量票面定值≈视口高 90%);
   空格=下滚一屏(新增,editable 避让既有);preventDefault 保留(语义=
   统一滚动步长);ctrl+wheel 零触碰。
7. STUB 删除(SCROLL_PROGRESS_STUB grep 零残留);新注释用 F-03 短式
   (scroll-progress.ts 注册文件全号合法)。
8. e2e 批 3 挂 DEPS=['SR2-F-03'] 守卫;取证用 spec 备份法(①铁律)。

## ④ 纪律

- TDD 四档(状态机全格+跨格五序列=宪法前置已交审计——测试必须覆盖
  每格每序列);变异红证日志**必须落盘**(F-02 门一 W2 教训:自述无档
  =主控抽测负担,本单变异日志缺失=直接 W)。
- `npm run test` 禁裸 npx;组件/模块行数 ≤250;UTF-8。
- 受锁流程:scroll-progress.test 新入锁 generate→apply;reader-shortcuts.
  test/reader.store.test/reader-text.spec 扩前 unlock。

## ⑤ 基线数字

- verify:92 文件 691 用例;locks:141(完成后 142:+scroll-progress.test);
- 工单:110/open 2。

## ⑥ 报告契约

全文落 `scripts/audits/f03-impl.report.md`:实现摘要(状态机逐格实现
形态)/文件清单/TDD 红证+变异日志清单/测试证据(verify+e2e 真退出码)/
locks 实录/自裁申报(含删减面 diff 自查+**W3/N4 两项并入裁决的处置
记录**)/疑虑。回复五行内。
