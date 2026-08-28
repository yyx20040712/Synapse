# Synapse 视觉系统定稿（R3 全局 + R2 脉络）——2026-08-28 设计役

> 状态：**定稿**（取代同日 draft 稿）。多模态循环两轮完成：
> v1 双稿评审（外模 4.5v）→ v2 迭代 → v2 终验——壳+库 **8/10**、脉络星象板
> **7.5/10**，均达「可直接作为实现规范」交付线。摸鱼图源文件与截图存档
> `docs/design/mockups/`（lineage-constellation(-v2)、shell-library(-v2)），
> **token 终值单一来源=两摸鱼图 CSS `:root` 变量**（实现票面直接引用）。

## 0. 两轮评审结论要点（v1→v2 已吸收）

- 菱形语法系统（◆ 品牌标/年份刻度/分隔线）= 贯穿语言（v2 最有价值升级）。
- 金角饰（L 形 1.5px）+材质渐变（165°）+inset 高光 = 卡面「仪式感」成立。
- 主 CTA=墨青实底+金内 hairline+切角 = 原神式双层边界语法。
- 星空三层（细星/亮星/✦ 四芒星少量精放）+星云 radial = 夜幕氛围成立。

## 1. Token 终值（实数值见 mockup :root——此处记语义与归属）

| 组 | 键 | 值要点 | 消费 |
| --- | --- | --- | --- |
| 纸面 | --bg #f6f4ee / --panel #fff / 渐变 #fffdf9→#fdfaf3 | 暖纸白 | 全局亮面 |
| 墨青 | --ink #1b2333 / --accent #2c5f8a / --accent-soft #dcebf5 | 侧栏底/信息主色 | 壳+按钮 |
| 金铜 | --gold #b8935a / --gold-bright #e3c98f / --gold-soft | 点缀/active/年份 | 全域装饰 |
| 夜幕 | --night-bg #171e33→#111728 / --node-face #222c4d / #2b3760 | 脉络页专属 | R2 |
| 展示字 | --font-display: Georgia,'Times New Roman','Songti SC',SimSun,serif | 标题/年份/品牌 | 全域 |
| 阴影 | --shadow-1/2/3 三档+inset 顶高光 | 卡片/浮层/弹窗 | 全域 |
| 圆角 | 8/12/16；节点 14；药丸 999（tag 建议收 6px） | | |

## 2. R3 单元映射（实现顺序）

- **R3-U1 主题基建**：theme.css v2（保留旧变量名换值+新增 token）；App 壳
  （墨青侧栏+金 active 左缘条+菱形品牌标+SVG 图标+课题位预留）；共享四件
  （Button=CTA 语法含 6px 切角/Dialog 玻璃头檐+金 hairline/SplitPane/Toast）。
- **R3-U2 文献库**：卡片网格（渐变+角饰 hover+衬线年份+tabular-nums+空
  venue 隐藏+题名 min-height）、FilterBar chips、菱形分隔线（窄窗 min-width
  24px+flex:1 防碰撞）、详情栏衬线化。
- **R3-U3 阅读器周边**：Toolbar/TabBar/OutlineAside 纸面+玻璃浮层（PDF 区
  中性不变——装饰浓度最低原则）；SelectionRects 色随新 accent。
- **R3-U4 设置页**：分节卡+金节标+菱形分隔复用。

## 3. R2 单元映射（脉络=命之座星象板）

- **R2-U1 画布视觉**：夜幕底+星空三层 CSS 背景（✦ 装饰绝对定位
  pointer-events:none 少量精放）；SVG defs linearGradient 节点渐变+L 角饰
  path；年份层带=line+rect(rotate45) 刻度（y 由 lineage-layout 精确计算，
  对齐误差 ≤2px——mockup 手摆位的非精确对齐在算法中自然消除）；边金辉
  （feGaussianBlur glow）+虚线银推断边；边型图例。
- **R2-U2 布局增强+侧板**：**auto-fit 收口**（载入/导入后视口自适应+边距
  ——LG-07 遗留池观察项转正）；NODE_W 按题名长度三档分宽；侧板夜色玻璃
  （比画布亮一档 rgba(40,51,86,.72)+blur12）；题名色 #f5f3ea 提纯白与
  金年份标拉开层级。
- e2e 铁律重申：data-testid/transform 串格式/「YYYY 年」文案/节点
  rect 尺寸断言（若有）全保留——数值变更触发受锁红则 [locked-change]
  申报（AI-11 口径）。

## 4. 实现注意事项（两稿终验 3+3 条，票面必带）

壳：①切角 6px（非 8px）/hairline .45→hover .7/CTA 与搜索框距 ≥16px
②卡片渐变亚像素缝隙→background-clip:padding-box ③菱形分隔窄窗防碰撞。
脉络：④层带 y 精确对齐（算法保证）⑤SVG 渐变/角饰用 defs+path（rect 无
多背景）⑥装饰层 pointer-events:none 不参与布局与命中。

## 5. 明确不做

暗色全题 v1（token 已预留镜像位）；动画库；新字体文件；脉络画布拖拽
惯性物理；课题色标。
