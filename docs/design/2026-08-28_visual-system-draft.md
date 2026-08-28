# Synapse 视觉系统设计稿 v1（R3 全局 + R2 脉络）——2026-08-28 总指挥设计役

> 状态：**方向草案**——待修复役（U1~U3）收口后进入多模态循环
> （现状截图→分析→HTML 摸鱼图→截图评审→迭代→定稿），本稿固化已可
> 裁决的方向与约束；参考源=用户指定 `E:\class\智慧水务\aquaresearch`
> （OKLCH+玻璃拟态+明暗双题）与原神 UI（深蓝夜色+金色描边+衬线标题
> +星象/命座意象）。
> 硬约束（宪法）：零新增依赖（图标=内联 SVG；动效=CSS transition/
> animation）；既有 CSS 变量名保留（42 tsx 内联引用零churn 色名兼容）；
> e2e 断言面（中文文案/testid/transform 串格式）不动。

## 1. 设计原则（两参考源合流）

- **aquaresearch 取骨**：OKLCH 色彩空间 tokens、玻璃拟态（backdrop
  blur 12-16px）浮层、柔和多层阴影、12-16px 圆角、150/250/400ms 三档
  过渡、明暗双题架构（v1 先落亮题，暗题=token 镜像预留）。
- **原神取神**：金铜色点缀系（描边/active 态/星饰）、衬线展示字体
  （标题/导航/年份数字）、面档分级「纸面-浮层-夜幕」三质感、脉络=
  命之座星象板意象（R2 专章）。
- **学术工具取度**：阅读区（PDF 周边与文本)保持中性高可读——装饰
  浓度按「脉络 > 导航/侧板 > 库列表 > 阅读器」递减。

## 2. Token 体系（R3-U1 落地，theme.css v2）

- **保留名换值**：--bg/--panel/--border/--text/--text-dim/--accent/
  --accent-soft/--danger/--ok/--annotation-*（色值迁 OKLCH；--accent
  从冷蓝迁**墨青**（信息主色，oklch≈0.45 0.09 240 一带，保 e2e 引用
  面稳定语义「主色」）；新增 --gold（金铜 0.72 0.10 85 一带）+
  --gold-soft；--bg 迁暖纸白（oklch≈0.97 0.008 85）。
- **新增名**：--font-display（衬线栈：Georgia/'Times New Roman'/
  'Songti SC'/SimSun/serif——Windows 零安装可用；楷体细弱不用）；
  --shadow-1/2/3（低-浮-弹三档）；--radius-s/m/l；--panel-glass
  （rgba 白+blur 变量）；--transition-fast/normal/slow；--night-*
  （脉络夜幕三色：底/节点面/描边，R2 消费）。
- **组件基建**：Button（实底=墨青、幽灵=金铜 hover）/Dialog（玻璃头
  檐+金 hairline）/SplitPane 分隔线金化/Toast 玻璃底。App 壳：侧栏
  深墨青底+金色 active 左缘条+display 字体标题+SVG 图标四枚
  （库=书、阅读器=开卷、脉络=星图、设置=齿轮）。

## 3. 分视图浓度表

| 视图 | 质感 | 关键元素 |
| --- | --- | --- |
| 侧栏/导航 | 中 | 墨青底+金 active+display 标题 |
| 文献库 | 低-中 | 纸面卡片+金 hover hairline+年份 display 数字 |
| 阅读器 | 低 | 工具栏玻璃浮层；PDF 区中性；面板纸面 |
| 脉络 | **高（夜幕）** | R2 专章 |
| 设置 | 低 | 分节卡+金节标 |

## 4. R2 脉络=「命之座星象板」方向

- 画布底=夜幕深蓝（--night-bg oklch≈0.21 0.05 265）+微星点
  （CSS radial-gradient 双层，零资产）+年份带=横贯金微光线。
- 节点=金描边圆角小卡（夜色面）+display 字体年份徽记+选中=金辉
  外光（box-shadow 双层）；主题节点=虚线银环。
- 边=金微光贝塞尔+中点 label 玻璃胶囊；选中路径高亮。
- 布局：保留 y=年份分层 RT 树（LG-07 修复后结构正确）——补 **auto-
  fit**（载入/导入后视口自适应全部节点+边距——遗留池既有观察项转正）
  +NODE_W 依题名长度分档（短/中/长三档宽）减题名截断。
- 侧板=夜色玻璃卡（与画布同域质感）。
- **e2e 铁律**：data-node-id/data-edge-id/data-kind/viewport transform
  串格式/「YYYY 年」文案全保留——视觉重皮肤零结构变更；布局常量变
  更若触发 lineage-layout 数值断言→受锁必然红申报（AI-11 口径）。

## 5. 多模态循环流程（修复役收口后执行）

现状截图（库/阅读器/脉络 M1 草稿）→逐张视觉分析（问题清单）→
脉络+壳两摸鱼图（纯 HTML+CSS 静态）→浏览器截图→自评审迭代 ≥2 轮
→定稿本稿 v2（token 终值+摸鱼图存档 docs/design/）→票面化。
