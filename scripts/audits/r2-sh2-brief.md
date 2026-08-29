# R2-SH2 票面——顶栏身份区+字体衬线消费清零（U3b·决4/决5 纯执行）

> 工单：R2-SH2 / area: infra / owner: strong / 模式：三屋（ADR-0017）
> 裁决母本：handoff-v3 §4 决4/决5。SH1 终态地基：品牌位=「Synapse」侧栏。
> 主控：2026-08-29 LOOP 会话。

## 1. 行为层

### 1.1 顶栏身份区（决4——ZCode 式）

- App 壳根布局改：现有「单侧栏+主区」→「**顶栏 header 条**+侧栏（去品牌
  行）+主区」。顶栏=**h-11**（44px——h-9 级 36px 再容纳切换器+4~8px 余量，
  交接书「h-9 级再容纳切换器 +2~4px」上限裁量）：左区=应用 logo 标
  （现 .app-nav-brand svg 迁入）+`Synapse` 应用名；紧随=**WorkspaceSwitcher
  迁位**（组件本体逻辑零改——纯容器迁挂；dirty/onManage props 原样）。
- 侧栏 `.app-nav-brand` 整行删除（logo+name+ver 迁顶栏/随行）；导航项
  原样；`.app-nav-foot` 原样。
- 样式：theme.css 新 `.app-header` 族（白底 var(--panel)+下边 1px
  var(--border)+高 44px+flex 布局）；`.app-nav` 高度链适配（原顶行位消失
  ——nav 首行改导航项直接起）。
- **F-05/INV-34 回归面**：顶栏 44px 纵向占用对阅读器 TabBar 行高链/滚动
  收敛的影响——实现者 jsdom 测不了视觉收敛，**真机复评归主控收口**
  （阅读器页码跳转+滚动链冒烟）。

### 1.2 字体衬线消费清零（决5）

- `--font-display` 消费位 5 类全清（font-family 声明删，回继承 UI 字体）：
  `.app-nav-name`（并入顶栏新类不再引用）/`.app-nav-ver`/`.rdr-num`
  （**tabular-nums 保留**——同规则 font-variant-numeric 不动）/
  `.rdr-aside-h4`/`.syn-settings h2`。token 定义 `:root :33` **保留**
  （决5 原文）。
- `--gold-night` 别名退役（LG10 观察项结案）：全仓生产消费=0（LG11 清零
  后仅剩 :root 定义）——**定义删除**（死代码即删）+theme.test TOKENS
  清单同步删该行（受锁 [locked-change]）。
- 注释同步：theme.css 相关注释「衬线」表述改写。

## 2. 接口层

- App.tsx 结构改造（header+nav 并列）；WorkspaceSwitcher 零改动（文件
  不碰——纯挂载点迁移）；theme.css 类增删。
- 无新模块/无 IPC/无 shared 面。

## 3. 架构层

- 零新依赖；App.tsx ≤500 行红线（现 ~200 增 header JSX ~10 行）；分层零涉。

## 4. 测试面（TDD）

- 受锁 `app-shell.test.tsx`：品牌断言「在侧栏内」改「**在顶栏内**」
  （`.app-header` 容器断言+logo/name/切换器在场+侧栏无品牌行负锚）；
  it 名同步。受锁 `smoke.spec.ts`：getByText('Synapse') 断言面零改
  （品牌文本仍唯一在场——预判零改，实证必红则 BLOCKED 申报）。
- 受锁 `theme.test.ts`：TOKENS 清单删 --gold-night 行（别名退役）。
- 新 it（app-shell.test 批内）：顶栏结构三件（header 在场/切换器在
  header 内/侧栏品牌行 0 计数防回归）。
- 变异红证 ≥2：①header 渲染删→顶栏 it 红 ②.rdr-num font-display 回填
  →源码形态锁 it 红（**新增源码形态负锚**：theme.css 不含
  `var(--font-display)` 消费串——theme.test 批内 it，B1 先例）。
- 真机复评（主控收口）：顶栏观感+阅读器 TabBar/滚动链冒烟（F-05 面）+
  设置/侧板节标无衬线残留抽查。

## 5. 文化层

- 基线锚：HEAD=5ae8620；verify=107 文件 888 用例/locks 166；e2e 26。
- 用例数预测=888+app-shell 2+theme 1=891±2（删 --gold-night it=−1 →
  890±2；实现者实测申报构成）；locks 166（theme.test 在锁内改 hash）。
- 流程：unlock→批内改→generate（无新文件预期）→apply；verify 真退出码
  落盘 `r2-sh2-*.log`；cp 备份法变异；UTF-8；npm run test 正规入口。

## 6. 主控预裁

1. h-11=44px 定值（h-9 36px+切换器余量上限裁量——交接书「+2~4px」为
   下限语义，44px 留 hover/焦点环余量）。
2. logo svg 迁顶栏（资源不删）；.app-nav-ver（版本号）随品牌行迁顶栏
   右侧或删——**定：迁顶栏（信息保留）**。
3. WorkspaceSwitcher 文件零触碰=结构迁移最小面；其容器样式若依赖
   .app-nav 祖先选择器——查实并随迁（theme.css 选择器面）。
4. A4/A6/A7 顺手池本单**不做**（禁超面——A6 课题徽记虽「顶栏有位了」
   仍留池待独立微票）。
5. e2e workspaces.spec 若断言切换器在侧栏位——grep 核实，必红则受锁
   改写申报（预期：断言 testid 不含容器位——预判零改）。
