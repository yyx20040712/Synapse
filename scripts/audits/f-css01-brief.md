# F-CSS-01 实现者简报——theme.css 分域拆件（主控→实现者子代理）

> 档位声明（§4.5 单一调用者）：实现者=**GLM5.3flash**（体验套餐优先，思考等级中）。
> 本简报自包含——你无会话历史，一切以本文+票面为准。

## ① 身份与禁令

- 你是实现者子代理，领单 **F-CSS-01**（tickets/registry.ts:250 票面=完整任务书）。
- **禁 git add/commit/push、禁翻 registry、禁碰 tickets/**。
- **受锁面例外（本票票面明示）**：`tests/unit/renderer/theme.test.ts` 受锁扩展
  +`scripts/check-quality.mjs` CSS 关卡登记——两件**你只做内容编辑，禁跑
  locks:unlock/apply/generate**（主控收口位统一锁操作）；编辑前无需解锁即可
  写（若文件系统只读拦你,报告 BLOCKED 停手）。
- 禁新增依赖；禁动 scripts/audits/p7d01-out/。
- 卡住=BLOCKED 停手。

## ② 必读序（文件清单化）

1. `AGENTS.md` 宪法（代码组织/依赖与提交/受锁流程节）。
2. `tickets/registry.ts` F-CSS-01 条目——票面全文。
3. 标的：`src/renderer/shared/theme.css`（645 行,══ 分节注释即现成分界线）。
4. 消费点：`src/renderer/main.tsx:5`（单 import './shared/theme.css'）。
5. 受锁测试（先读后改——受锁扩展=本票任务面）：
   `tests/unit/renderer/theme.test.ts`（token 锚+21 负锚三元组+libCss 多文件
   读取先例——第 20~29 行两 readFileSync 形态）。
6. 先例：`src/renderer/features/library/library.css`（分域样式文件形态——
   libCss 负锚面就是它）。
7. 关卡脚本：`scripts/check-quality.mjs`（:118-127 行数关卡段——repo 300/
   组件 250 先例,你的 CSS 关卡登记加在此段）。

## ③ 主控裁决（票面范围内澄清）

1. **留守块（theme.css 拆后保留）**：@import tailwindcss+文件头注+`:root`
   token 全量（亮/夜/annotation 五色/--dur-*/--z-* 全部——theme.test.ts
   TOKENS 路径锚零扰动）+R2-UI1 共享动画词汇 keyframes 段（:616-637,共享
   词汇=token 同族）+无障碍守卫 reduced-motion 段（:638-645,守卫引用
   keyframes 伴生留守）。
2. **拆出域（四件,皮肤段按 ══ 分节注释）**：
   - `theme-shell.css`：App 壳顶栏身份区（R2-SH2）+切换器+R2-SET1 界面缩放
     +R2-SH3 caption 三键+App 壳侧栏 nav 段（:91-311 一整段）；
   - `theme-buttons.css`：共享 Button 变体皮肤 syn-btn 族（R3-TH1）+R3 菱形
     分隔线（:312-421）；
   - `theme-reader.css`：R3-U3 阅读器周边皮肤+active tab+数字等宽+侧板节标
     +R3-U4 设置分节卡+表单 focus（:422-478）；
   - `theme-lineage.css`：脉络·浅色严谨板全段（:479-615,含边型图例/工具条
     白玻璃/适应视图按钮/边标签 C 变体/悬停滚动）。
   行首行号是**主控现读分界**,你现场核对 ══ 边界（若个别小节归属争议——
   如 SET1 缩放属 shell 还是 reader——按 ══ 注释语境定+申报）。
3. **纯迁移值零改**：一切声明逐字搬运（选择器/属性/值/注释全量随迁）;唯一
   允许的编辑=分节注释归属调整+新文件头注（「[F-CSS-01] 自 theme.css 拆出
   2026-09-05+本域职责一句」）。**CSS 源顺序=层叠语义**:四件在 main.tsx
   的 import 顺序必须保持原相对顺序（shell→buttons→reader→lineage）,
   theme.css（token 留守块）在最前（@import tailwindcss+token 必须先于
   一切消费方）。
4. **main.tsx:5 扩展**：
   `import './shared/theme.css'` → 五行（theme.css 先+四皮肤件按序）。
5. **theme.test.ts 受锁扩展**：新增四件 readFileSync 读取面（libCss 同构,
   变量名 shellCss/buttonsCss/readerCss/lineageCss）;**负锚三元组扩多文件
   口径**——现 21 三元组中 `libCss` 参与的（ms 声明段/衬线/z-[N] 等,
   见 :228-234 先例形态）按语义扩到对应新件（duration 负锚面向全五件——
   token 消费面随皮肤段走了）;TOKENS 正锚仍只锚 theme.css（token 留守）。
   扩展须**先红一次**（临时删一个负锚目标值→红→还原——证明新锚活）。
6. **CSS 行数关卡登记（票面裁量项,主控定夺=登记）**：check-quality.mjs
   :118-127 段增：`src/renderer/**/*.css` 物理行 >450 → violation
   「CSS 文件 ${lines} 行超上限 450（分域拆件——token/皮肤域分离）」。
   同 split('\n') 口径。**注意 theme.css 拆后 ~100 行、新四件最大 ~230 行,
   全部远低于 450——关卡防未来回归**。
7. **探针验收=主控位**（baseline 已双跑 DETERMINISM PASS）。你不跑探针。

## ④ 纪律

- 纯搬运：禁改任何声明值/选择器/顺序;唯一顺序敏感面=import 序（裁决 3）。
- 每步验证：拆毕 `npm run test`（theme.test.ts 扩展先红后绿+全套零红）;
  终态 `npm run verify` 真退出码落盘 `scripts/audits/f-css01-verify.raw.txt`
  （`echo exit=$? >>`）。
- 证据日志 `.raw.txt` 后缀;受锁两件改动在 diff 中可见（主控收口位跑锁操作）。
- 新文件被引用：四皮肤件必须被 main.tsx import。
- UTF-8;中文注释可读。

## ⑤ 基线数字（自检参照）

- verify：156 文件/1422 用例/locks 286（HEAD=b1b6990f52 亲验在档
  scripts/audits/f-split01-final-verify.raw.txt）。
- theme.css 645 行→留守块预期 ~110+新四件（shell ~221/buttons ~110/
  reader ~57/lineage ~137——按 ══ 分界推算,你实测申报）。
- lint/typecheck 基线全绿（CSS 不进 tsc,main.tsx 改动进）。

## ⑥ 报告契约

全文落 `scripts/audits/f-css01-impl.report.md`：实现摘要（每件拆出段+行数）
/文件清单/先红证据（负锚扩展红证 raw 路径）/verify 退出码/自裁申报（分节
归属裁定+一切超票面决定）/疑虑。回复五行内：状态+新文件数+各件行数+verify
结果+报告路径。
