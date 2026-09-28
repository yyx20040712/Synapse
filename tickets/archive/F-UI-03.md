# F-UI-03 票面归档（F-GOV-01）

- id: F-UI-03
- file: src/renderer/shared/ui/SplitPane.tsx
- area: ui-kit
- owner: strong
- status: done

## summary 原文

应用导航栏可调宽+窄条折叠+收起图标（设计文档 §2.2 P2——对象经用户更正=.app-nav 墨青侧栏本体；D3=图标窄条折叠 collapsedWidth≈64/D4=档位折叠宽 64·拖拽 max 280·default 184（实施默认值验收轮可微调）/D5=窄态尾行「本地学术文献管理」隐藏——§5 已裁）：①SplitPane 扩展（主工作量）=collapsedWidth?: number prop（折叠到窄条宽而非 display:none 折到 0——现 collapsible 语义不适配导航）+受控折叠面 collapsed?: boolean/onCollapsedChange（缺省不传=非受控旧行为零漂移——既有 11 用例锁面向后兼容红线）+折叠态 aria-valuenow=collapsedWidth；②App.tsx nav 包 SplitPane（paneId=app-nav/side=left/main 槽 null 主内容外置——ReaderPage 接线先例）+navCollapsed state+收起/展开切换按钮（nav 顶行，aria-label 随态换名——TitleBarControls 三元先例，D7=24×24 描边双箭头）+nav label 文本包 span.app-nav-label（窄态视觉隐藏——**禁 display:none**[Chromium 可访问名排除面，保 getByRole name 断言]用 clip 视觉隐藏手法）+窄态类 .app-nav-collapsed 挂 nav；③theme-shell.css=.app-nav width 184px→100%（宽度归 SplitPane 管）+窄态类规则（label 隐藏/foot 隐藏[D5]/图标居中）+收起钮皮肤（深色墨青底适配）；持久化键 synapse:splitpane:app-nav 勿与 reader-outline 冲突；受锁=split-pane.test（新形态用例 TDD 先行：collapsedWidth 折叠/受控模式/缺省零漂移）+app-shell.test（按可访问名查询+品牌行负锚不破——jsdom textContent 尾行断言默认展开态成立）；【毕 2026-09-20 三屋全链+主控自为两笔】①SplitPane 三 prop 扩展（collapsedWidth 窄条折叠/collapsed+onCollapsedChange 受控面——折叠三态表入头注；三 prop 全缺省=旧行为零漂移，门二基线 JSON 逐字比对实证）；②App nav 包 SplitPane（main 槽 null 外置）+收起钮（«/» 随态三元 aria-label）+label 包 span（窄态 clip 隐藏——禁 display:none 保可访问名）；③CSS 窄态三规则+toggle 皮肤+**门二 P1-1 nav 满高修复**（height:100%——pane 容器块级无 stretch，jsdom/smoke 结构性盲区由门二揪出；三重实证=形态锚 TDD+几何探针 z-f-ui03-nav-geom-probe[navH=746.4=rowH+foot 钉底]+几何变异红证[移除→270.8 内容高红]）；④连带修 reader-text.spec:501/:503 strict 歧义（页面两 SplitPane——选择器收紧 main 容器，指纹门零冲突）；测试=split-pane +2/app-shell +1（plain describe always-active——实现者自裁①依宪法 K3 纠正票面 guardedDescribe 笔误）+theme.test 形态锚；TDD 红 3→绿+变异三支；门一 k1 B0/W1/N10（W1 行数压线备案拆 nav-icons 件）+门二 GO（P1-1 销项终裁；基线逐字独立比对+5400 差 1 勘正）；verify 亲验 EXIT=0（167/1730/locks 246/指纹门 185·1776·5400·skip14——基线 C_before 恒 183·1768·5368·skip14）+e2e 默认门 42/42+model-names 0；批档=仓外 f-ui03-batch-record.md；[locked-change]（split-pane.test/app-shell.test/theme.test/reader-text.spec/两探针件/manifest）

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
