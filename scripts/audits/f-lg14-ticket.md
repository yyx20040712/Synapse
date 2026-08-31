# F-LG14 需求票:脉络图节点元信息区——含金量+年份+标签组(用户图6/图7)

> 需求源:用户 2026-08-31 反馈批图6(现状)/图7(期望手绘)。期望卡结构=
> 题名主体(绿)+底行「含金量(黑)+标签组(橘黄框内多个红小块)+年份(蓝)」;
> 颜色仅为示意,层次结构为准。**依赖 F-LG13 新卡结构(底行占位)**——
> 串行开工。四项口径裁决在档(台账 2026-08-31):含金量=并列原始值;
> 标签=梳理智能体草稿带+应用内增删;橘黄框=标签区容器;人工父边=LG15。

## 0. 数据现状(主控排查完成)

- **含金量数据链已在库零新增出网**:papers.citedByCount(OpenAlex/CrossRef
  增强抓取缓存,ENR-01/02)+src/shared/venue-tier.ts(期刊→档位映射,
  内置人工先验受锁常量)。脉络节点 paperId 可关联;
- **标签无存储**:lineage_nodes 无 tags 字段;draft 协议
  (lineageDraftNodeSchema,strict)无 tags;
- **graph 取数通道**现状返回 nodes/edges(含金量需 join paper 摘要)。

## 1. 行为层

- **存储**:迁移 006 lineage_nodes 加 tags 列(JSON 数组 TEXT,缺省 NULL=
  无标签;**手写 SQL 迁移文件受锁**[locked-change]);应用面 schema
  lineageNodeSchema 加 tags: string[] | null(受锁 shared/models);
- **draft 协议扩展**:lineageDraftNodeSchema 加 tags 可选字段
  (snake_case=tags,缺省省略;strict 保持——梳理智能体草稿可带标签,
  **口径=草稿带为主,导入即有**);导入链 lineage-import 落库;
  ADR-0014 文件协议修订注记(v1 draft 加可选字段=向后兼容)。
- **含金量取数 join 单源**:lineage graph 通道(main service)扩展返回
  每文献节点的 {citedByCount, venueTier} 摘要(单查询 join 或批量
  in-query,禁 N+1 逐节点通道调用——主控裁决);渲染层零额外取数;
- **卡内底行渲染**(LineageNodeCard 底行占位填充):
  含金量=「引 N · T档」并列原始值(无数据显示「引 — · 未定」占位,
  不合成单一分数——用户口径在档);年份=既有;标签组=外框+内联标签
  小块(超宽横向滚动或 wrap 自裁);主题节点(paperId null)底行=仅
  年份+标签(无含金量);
- **标签增删 UI**:节点菜单(LineageNodeMenu)「添加标签」入口+侧板
  (LineageSidePanel)标签编辑(增删即时持久化经既有 upsert 通道)。

## 2. 接口层

graph 通道载荷扩展(加字段向后兼容);upsert 输入面加 tags;draft
schema 加可选字段——**跨进程类型单一真相源 shared/models/lineage.ts
受锁改向 [locked-change]**。

## 3. 架构层

迁移 006+main/service join+renderer 卡渲染三段;分层单向 ipc→services
→repos→db 保持;禁引依赖;组件超 250 行红线(LineageNodeCard 若超=
底行拆件 LineageNodeMeta)。

## 4. 生命周期层

存量库零迁移兼容(tags NULL=无标签不渲染);venue-tier 受锁常量
零改(映射表扩充=D3-B 档不在本票);draft 旧版本草稿(无 tags)导入
零破坏。

## 5. 文化层

- 单测:draft tags 字段校验(合法/非法类型拒绝/缺省省略)/迁移 006
  升降级/含金量 join 载荷/卡底行 DOM(含金量文本+标签块计数+占位)
  先红后绿;M1~M4 变异(备份法);
- 真机复验(新建 scripts/audits/f-lg14-verify.mjs):①有含金量节点
  底行「引 N · T档」可见;②带 tags 草稿导入→标签块渲染;③侧板
  加删标签持久化(重开在场);④pageerror 0。探针前 use electron。
- 报告 f-lg14-impl.report.md 同契约。禁 git/registry/locks。

## 6. 主控裁决

- 含金量口径字面=「引 {citedByCount} · {venueTier 档名}」;
  citedByCount null/undefined=「引 —」;venueTier 未映射=「未定」;
- 标签去重同值(同节点同名标签合并);
- LG15 的 manual 边与本票无依赖,可并行(文件面:edge 相关 vs 卡渲染
  ——LineageNodeMenu 两票都动则串行,主控派发时裁决)。
