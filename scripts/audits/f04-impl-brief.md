# SR2-F-04 实现者派发简报(主控→实现者子代理)

## ① 身份与禁令

你是三屋模式的实现者子代理,领单 **SR2-F-04 缩放重定义与收官 e2e**(P7-F
战役收官票,注册文件=tests/e2e/reader-scroll.spec.ts)。

- 禁 `git add/commit/push`;禁读改 `tickets/registry.ts`——**取证也不许触
  tickets/**:e2e 守卫解除用 spec 备份法 skipIfPending([])(methodology
  §4.1 条款;F-02 门一 W1 实录)。
- 只改票面文件清单内文件;卡点=BLOCKED 停手。

## ② 必读序

1. `AGENTS.md` 硬规则(e2e 纪律:渲染真实文本断言)。
2. **票面**:`tests/e2e/reader-scroll.spec.ts` 头注五层+
   `scripts/audits/p7f-ticketing-draft.md` SR2-F-04 节。
3. **F-01/02/03 产物依赖**(f20c2fd/31b3a07/aba9da0):
   - `PageColumn.tsx`(245 行——**W3 拆分预案**:你若加缩放锚点导致超 250,
     预裁拆分=几何纯函数独立文件 page-column-geometry.ts(盒高/列宽/中心
     比纯函数搬移,组件留装配;page-column.test 同步 import 调整——受锁
     扩);拆分时旧函数删除=方案切换红线)。
   - `scroll-progress.ts`(INV-31/32 状态机——缩放时中心锚定与恢复链的
     交互:zoom 变化=程序性 scrollTop 修正,不触发进度回写竞态;门一 N4
     联测项:缩放需与状态机协同(缩放中的 scroll 事件=程序性,不应被当
     用户接管信号)。
   - `ReaderPage.tsx` fitWidth(:129-135 原公式——分母改列宽基准)。
   - `ReaderToolbar.tsx`(零 props 改——zoom 数值语义不变)。
4. INV-01(三层 overflow 断言锚 reader-text.spec :126-136)/INV-30(canvas
   窗口)/INV-29(双源)/INV-31/32。
5. e2e 宿主:reader-scroll.spec(你重写——DEPS 六 done 后全激活)+
   reader-text.spec :399-432(ctrl+wheel 段迁移批 4)+pdf-factory
   (createMultiPagePdf 先例)+e2e-env。

## ③ 主控裁决

1. **环境铁律**:`export PATH="/e/class/智慧水务/tools/node24:$PATH" && ...`。
2. 基线:verify **93 文件 719 用例** exit 0;e2e **21 passed+1 skipped**
   (唯一 skip=你的骨架守卫);locks **142**;工单 110/open 1(F-04)。
3. **收官票=渲染链:收口自检 verify 全量+e2e 全量**双真退出码落盘
   `scripts/audits/f04-impl-verify.log`;骨架守卫用例翻 done 后自动激活,
   e2e 终态=22 过+0 skip 推演。
4. 缩放中心保持纯函数:(scrollTop+vh/2)/总高 比值保持——PageColumn 内
   实现(或拆分件);zoom 变化链=盒重算→scrollTop 程序修正(不发用户
   接管信号)。
5. fit-width 分母=列宽基准(最宽页×zoom);一次性 zoom 语义保持。
6. 收官报告 `docs/reports/2026-08-28_p7f-campaign.md`(战役收官:四票链
   完整性+成本账本汇总+验收四项对照——主控提供账本数据,你搭骨架)。
7. 新注释 F-04 短式;reader-scroll.spec(注册文件)全号合法。
8. 变异红证日志必落盘含目标 it 名(F-02 W2+F-03 门一二 W 教训)。

## ④ 纪律

- TDD 四档;e2e 用例渲染真实文本断言(禁纯几何断言冒充);spec 备份法取证。
- 组件 ≤250/文件 ≤500;UTF-8;受锁流程(reader-scroll.spec/reader-text.
  spec 已锁——改前 unlock;若拆分 page-column-geometry 则 page-column.
  test 受锁扩)。
- e2e spec 改动后必须全量 verify(宪法)。

## ⑤ 基线数字

- verify:93 文件 719 用例;e2e:21+1 skip;locks:142;工单 open 1。

## ⑥ 报告契约

全文落 `scripts/audits/f04-impl.report.md`:实现摘要/文件清单/TDD 红证+
变异日志/测试证据(verify+e2e)/locks 实录/自裁申报(含删减面)/疑虑。
回复五行内。
