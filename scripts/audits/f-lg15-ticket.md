# F-LG15 需求票:脉络图人工第二父文献连线(用户小需求)

> 需求源:用户 2026-08-31 反馈批末条。原话:「仅允许人工为脉络图中的
> 论文连接第二个父文献,线的颜色和样式要有区分度,以便于研究者补充
> 自己的判断」。**用户裁决(台账在档):不限条数**(每节点人工父边
> 无上限;样式统一与自动边区分)。样式方向已用户确认=虚线+独立色+
> 可写逻辑线说明。

## 0. 现状(主控排查完成)

- 边模型已有 kind: 'tree'|'ref'(shared/models/lineage.ts:111-112,
  R2-LG12):tree=树边单父(INV-27);ref=综述参考边(service 豁免单父/
  拒环/同端点对互斥);
- 布局消费:lineage-layout.ts 净化段 `if (e.kind === 'ref') continue`
  (:212)——ref 不进树仅渲染;manual 边同型;
- 守卫宿主=services/lineage/lineage.service(导入校验+upsertEdge
  运行时双口,INV-27 修订版)。

## 1. 行为层

- **kind 扩 'manual'**(受锁 shared schema+迁移:lineage_edges.kind
  CHECK 约束若存在则扩值——查迁移 004 DDL 后定,报告申报);
- **守卫(manual 边)**:豁免单父(**不限条数**=用户裁决);仍拒环
  (isAncestorOf 沿 tree 父链+manual 父链双向——防人工边造环,环上
  渲染/布局语义破坏);同端点对互斥(与 tree/ref 任一 kind 同对
  重复拒绝);**draft 导入协议不收 manual**(draft edge schema 无
  kind 字段=tree 语义;manual 仅应用内手工创建——「仅允许人工」
  的字面口径);
- **UI 入口**:节点菜单「连接父文献…」→目标选择(既有文献节点列表
  搜索对话框——crib LineageAddNodeDialog 形态)→创建 manual 边
  (label=逻辑线说明,可后编辑:侧板/菜单);删除入口同菜单;
- **渲染(LineageEdges)**:manual=虚线+独立色(琥珀 var 主题变量或
  自定常量,与 tree 实线/ref 现样式**三方可区分**——先核 ref 现样式
  再定色,报告申报对比表)+label 沿边渲染(既有 edge-label-layout);
- **布局**:manual 不进树/右列计算(净化段 `kind!=='tree' continue`
  同 ref)——**父子几何语义仍由 tree 边独占**,manual 纯叠加连线。

## 2. 接口层

lineageEdgeKindSchema 加 'manual'(受锁改向);upsertEdge 输入
kind 可选值扩;draft 协议零变(不收)。

## 3. 架构层

shared schema(受锁)+service 守卫+LineageEdges 渲染+节点菜单/
对话框 UI;分层单向保持;组件红线(菜单/对话框超限拆件)。

## 4. 生命周期层

存量库零迁移兼容(既有 tree/ref 不受影响);环检测含 manual 后
存量数据(理论无 manual)零风险;删除节点时级联删边沿用既有。

## 5. 文化层

- 单测:manual 创建成功/造环拒绝(经 manual+经 tree 双向)/同端点对
  重复拒绝/不限条数(两 manual 同子通过)/draft 不收 manual(导入
  含 manual 字段拒绝或忽略——schema strict=拒绝,报告申报);
  布局:manual 边不进树(森林结构零变);渲染:虚线+色断言;
  M1~M4 变异(备份法);
- 真机复验(新建 scripts/audits/f-lg15-verify.mjs):①菜单连第二父
  →虚线边在;②label 编辑持久化;③再连第三父(不限条数验证);
  ④造环被拒(toast/报错可见);⑤pageerror 0。探针前 use electron。
- 报告 f-lg15-impl.report.md 同契约。禁 git/registry/locks。

## 6. 主控裁决

- INV-27 登记册修订:tree 单父保持;ref=综述参考豁免;manual=人工
  补父豁免且不限条数、拒环、同端点对互斥(三 kind 全景表);
- 三边样式对比表(tree 实线灰/ref 现 style/manual 虚线琥珀)入报告
  供用户复测辨义。
