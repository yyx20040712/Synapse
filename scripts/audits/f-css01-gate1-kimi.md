[routing]: run=20260905010245-uk6w source=kimi-main model=kimi-k3 switches=0 usage=in=0,out=8845 latency=497256ms (by ds-call.mjs 链)

# F-CSS-01 门一对抗深审报告

审计范围：仅本审计包（票面+主控简报+实现者报告+完整 diff）。未触仓库、未跑命令。包外事实一律标不确定。

---

## A. 母本符合度

**[N] A1 token 留守与拆件边界**
diff 显示 theme.css 留守 :root 全量（TOKENS 47 正锚对新布局全绿→:root 未动）+html/body/#root（:75-89 块在 diff 前文中未被删除行触及）+keyframes（theme.css diff 尾部保留 `background-position: 50% 100%` 的 keyframes 闭块）。四新件内容与被删段逐段眼对一致（`.app-nav::after`/`syn-btn-primary`/`rdr-toolbar`/`lineage-edge-label` 等声明逐字节形同）。守恒 631=631 为实现者机检声明，包内无法复算，**不确定**，但 diff 双向文本比对无反证。

**[N] A2 import 序=原相对序**
main.tsx:5-13：`theme.css`→`theme-shell.css`→`theme-buttons.css`→`theme-reader.css`→`theme-lineage.css`，与原文件段序 :91(shell)/:312(buttons)/:422(reader)/:479(lineage) 一致；keyframes(616) 留守件先行无层叠面（按名全局注册）。符合票面「单 import 点扩展多行 import」。

**[N] A3 theme.test.ts 扩展=libCss 先例**
theme.test.ts:30-46 四 readFileSync 与 libCss 同构（URL 法、相对路径同型）；B1 三锚改指 buttonsCss、SET1 两锚改指 shellCss、决5/z-index/MS_DECL/DURATION_COUNTS 扩面全部在 diff 内，断言正则本体零改。符合票面「受锁扩展（libCss 先例多文件面）」。

## B. 宪法红线

**[N] B1 受锁 6 件改动全覆盖**
manifest.json 6 处 sha256 更新恰为 check-quality.mjs/theme.test.ts/library-cards/lineage-canvas/r3-rdr-set-visual/window-control——与票面受锁扩展+主控追认 4 再锚完全对应，无第七件受锁改动。main.tsx 不在 manifest 变更面（推定非受锁件，**不确定** locks 收录口径，但主控「locks 286 重锁后绿」间接佐证无漏）。

**[W] B2 四新 CSS 件未见 manifest 收录项**
manifest diff 仅 6 个 sha 替换，无 theme-shell/-buttons/-reader/-lineage 新增条目。若 locks 体系要求全量登记则属遗漏；若为既有受锁清单制（新件默认不入），则无问题。**不确定 locks 口径**，主控「重锁后绿」倾向于后者，但包内无 manifest 全文可证。低危提示。

**[N] B3 新文件被引用**
四新件均被 main.tsx:9-12 import+theme.test.ts:33-46 读取，零孤儿。UTF-8/无 BOM 无法在 diff 层验证（diff 不承载 BOM 信息），**不确定**，中文内容渲染正常。

## C. 代码与测试质量（CSS 皮肤类强制审项）

**[N] C1 守卫迁移层叠论证——显式推演成立**
逐条核：
- 守卫 `.app-nav::after,.app-nav-item-active::before{animation:none}`（theme-shell.css 末，(0,1,1)）vs 常驻 `.app-nav::after{animation: syn-pan-y 5s...}`（同件 :235 区，(0,1,1)）、`.app-nav-item-active::before{animation: syn-pan-y 2.8s...}`（同件 :289 区，(0,1,1)）——同特异性，源顺序决胜；守卫在原文件本居 :638 末位，随迁后仍居 shell 件末，**件内相对序保持**。
- @media 不增特异性——实现者论证正确。
- 跨件面：theme-buttons.css/theme-reader.css/theme-lineage.css 全量 diff 内**零 `animation` 声明**（仅 transition/keyframes 无关项）；theme.css 留守面仅 keyframes 定义（非 animation 属性）。shell 为皮肤件首载，后载三件无任何可反压守卫的 animation 规则——「shell 末位=全局末位等效」在包内证据下成立。
- 残余面：feature 本地 CSS（library.css 等）由组件挂载后载，理论上后于 shell——但拆件前亦然后于 theme.css，**相对态势零变**，非本票引入。

**[N] C2 close 红/svg 覆写同特异性源顺序随迁保序**
theme-shell.css 内：`.titlebar-btn:hover/:active`（(0,2,0)）先于 `.titlebar-btn-close:hover/:active`（(0,2,0) 在后胜）；`.app-header svg` 先于 `.titlebar-btn svg`（同 (0,1,1) 在后胜 22px→10px）。两对依赖的件内相对序与原文件逐行一致，且两对手同件随迁无跨件拆分。

**[N] C3 负锚 28 三元组期望 0 论证**
7 字面量（0.08/0.12/0.14/0.18/0.2/0.22/0.3s）×4 新件=28。逐件扫 diff 全文：四新件 duration 全 `var(--dur-*)` 形态；`5s`/`2.8s`（shell 常驻 animation）不在字面量清单；`rgba(...,0.3)`/`rgba(...,0.2)`/`rgba(...,0.35)` 等数值后无 `s` 后缀，子串不咬；substring 互咬（0.2s⊄0.22s）不成立。期望 0 论证严密。MS_DECL 注释「theme-buttons.css『瞬态 80~120ms』」与新件头注实际文字一致（随迁准确）。

**[N] C4 CSS 关卡 450 口径**
check-quality.mjs:129-138：独立 walk（不并 srcFiles，注释明示理由）+`split('\n').length` 同口径+>450 violation。现状最大件 236≪450，主控实跑绿。

## D. 报告诚实性

**[N] D1 §3.1 自裁=真偏离+已追认**
票面明写「reduced-motion 守卫归置留守 theme.css」，实现者迁 shell 末属**字面偏离票面**，但：①自裁申报显著标注「偏离主控裁决，请复核」；②层叠论证经 C1 独立复核成立（留守首件确会被后载 shell 反压失效，论证正确）；③主控简报明示追认。处置链完整。

**[W] D2 「在线授权」表述与主控口径矛盾**
§7.3 称「主控 AskUserQuestion 在线授权『授权再锚』」，主控简报则写「主控逐件亲核 diff 追认——**不依赖实现者所述在线授权**」。两说并存，授权事实包内不可 corroborate。因 4 再锚已落入主控明示追认范围且 diff 在包，不构成范围外改动，但实现者的过程叙事不可信级高于主控叙事——记档。

**[W] D3 Toast.tsx:20 不改=对主控终裁清单的二次自裁**
§7.6.1 自承 Toast.tsx:20 在主控终裁 3 清单内却未改，理由（该行指 token 变量，:root 留守 theme.css，注释仍准确）技术上合理，diff 中确无 Toast.tsx 改动。但这构成对主控已下终裁的再裁量，主控追认简报未明示豁免此项。程序瑕疵，非技术缺陷。

**[N] D4 ReaderToolbar 处置一致**
§7.6.2 称 :95/101「未改留主控处置」，diff 显示 ReaderToolbar.tsx:92-101 已改指 theme-buttons.css/theme-reader.css——与包注「已由主控处置，diff 在包内」一致，无隐瞒。

**[W] D5 §4.2「存量 CSS 四件（116/236/113/60/140/228/116/137）」数字口径瑕疵**
文字「四件」后列 8 个数值（应为拆件 5 件+存量 3 件=8 件）。报告计数表述失真，不影响关卡实现（diff 逻辑独立正确），属低危诚实性毛刺。

**[W] D6 探针 baseline 语义不明**
验证摘要「baseline 双跑 DETERMINISM+after」+票面「baseline 重采+COMPARE PASS」——若 baseline 系**拆件后**重采，则 COMPARE PASS 仅证新态自洽，不能证对拆件前的零视觉差。包内无法确定 baseline 采样时点，**不确定**；reduced-motion 盲区已申报并转门二，但零视觉差主验收链的 baseline 时点建议门二一并核实。

## E. 接缝与后续单

**[N] E1 tests/ 漏网面**
实现者 §7.3 自承首轮仅 grep src/ 漏 tests/ 致 8 红，续命轮补 4 件；并称 ai-note-style/reader-text 锚 :root 留守件零扰动。包内不可 grep 复核（**不确定**），但 verify 156 文件 1450 用例全绿构成强间接证据——若仍有锚 theme.css 已迁段的断言必红。无漏网反证。

**[N] E2 五文件接缝注释准确性**
Button.tsx:20→theme-buttons、TitleBarControls.tsx:24→theme-shell、DiamondRule.tsx:12→theme-buttons、App.tsx 4 处→theme-shell（.app-content-row/[data-page-column]/caption/nav 均确住 shell 件）——逐处与拆件归属核对无误。ReaderToolbar 主控处置后亦准。遗留 Toast.tsx:20 见 D3。

**[N] E3 P7D-01 批二提示**
四皮肤件含 font-size 字面量（10.5/13.5/9.5/11.5/13/12px 等，散于 shell/reader/lineage）。批二字号轴若做 token 收敛，负锚面须按本票 4 件同型扩锚——后续单预告，非本票缺陷。

---

## 统计

| 级 | 数 | 条目 |
|---|---|---|
| B | 0 | — |
| W | 5 | B2(manifest 新件口径-不确定)/D2(在线授权叙事矛盾)/D3(Toast 二次自裁)/D5(计数表述失真)/D6(baseline 时点-不确定) |
| N | 13 | A1-A3/B1/B3/C1-C4/D1/D4/E1-E3 |

## 总评：**PASS_WITH_WARNINGS**

拆件本体与层叠论证经独立推演成立（C1/C2/C3 为本票核心技术面，全部通过）；受锁面与追认链闭环；测试扩展有先红证+全绿终态。五条 W 无一致命：D2/D3 属程序/叙事瑕疵且均被主控追认范围或技术合理性覆盖；B2/D6 为包内不可决的不确定项，建议门二以实证收口（manifest 新件登记口径核查+probe baseline 采样时点取证+reduced-motion 实机态验证）。不阻塞收口。