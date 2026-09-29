# F-FOLDER-01 全案归档（票 1/2 schema+service）——2026-09-30 收口

> 状态=done（票 1；票 2=F-FOLDER-02 承接 renderer+e2e）。证据仓外档案区=
> `E:/zcode_md/synapse-archive/scripts-audits/F-FOLDER-01/`（设计通道三跳+
> p1/ 全链：简报/四审批/R1 delta/R2 addendum/19 支变异 raw/probe/closeout）。

## 设计通道（三段+实现期回炉）

kimi 拟定（4900 字+基座矛盾发现）→deepseek 审核 **B4W8N6 返工**（迁移两致命伤
+pubNo 语义偏离）→主控终裁 design-final（B1-B4 全裁）→**R1 实现层卡点回炉**
（B1 终裁前提被 SQLite ADD COLUMN 静态限制证伪——executor 三探针+主控独立
复现双证，改裁方案 A=可空列+显式回填+repo 写边界兜底，修订二落档）。

## 交付面（executor 8 单元+R1 续命 17 项+R2 主控亲执 10 项）

- **012 迁移**：主图先退让后插入+WHERE true 消歧/可空列+回填/部分唯一索引
  （坑 a）+**去重段**（存量重复保最新+边级联）/回填 position+id 启发式/
  paper_collections DROP/IF 列；执行器 db.transaction 已包禁自带事务。
- **INV-88 统一规则**（B1 修复核心）：一切文献节点创建路径（draft 重灌/
  upsert-node 两分支/挂接导入/moveFolder 自动建）节点 folder=文献归属，
  未归档先归主图（入图即归档）；显式≠归属 CONFLICT 拒；写死主图绝迹。
- **服务层**：S1 队列闸（lineagePending 信号链必填化）/跨图边 CONFLICT 拒/
  移动+移出+**同值幂等早退**（R2——folderIdOf 单源，三版定稿根因=findById
  列单双源漂移）/upsertNode 事务包裹（R2 原子性真锚）/slot 归一单源
  nextSlotInGroup。
- **契约**：通道 61（+5）/folderScope 判别联合/pubNo 库级派生（PUBNO_ORDER
  单源，B3=过滤不改编号）/catalogNo 退役零残留（probe 复扫）。
- **文档**：INV-88~93 入册+INV-75 R2 勘正+ADR-0014 v1.4+ADR-0021+architecture。

## 验证终态

verify **199 件/2215 用例 EXIT=0**（2169+34+9+3 逐跳闭合）；e2e **55/55**
（probe A1 两确定性红=语义演进撞旧锚——density 序号 pubNo 库级对调+smoke
空库恒含主图——收口亲修断言随迁+豁免 239）；locks **289**；通道 61；变异
**19 支**全红证还原净；FK 真值 ON 直证（probe M3 真库级联实证）。

## 门链与裁决

executor R0→门一 k1 PWC B0W10N8+d1 **FAIL B1W12N7**→R1 续命 17 项→双席复审
k1'/d1' PWC B0W5N8/B0W4N5→R2 主控亲执 10 项→probe 7/8→收口亲修→**裁决部
GO_WITH_CONDITIONS C=2**[P0=0——C1 INV-88 draft 句勘正已落（原句被 probe U8
证伪：draft 边=repo 直调绕守卫，幽灵边+读面兜底+导出携出——处置口径票 2
裁决登记）/C2 票 2 启动即落 draft 链裁决点+清 export 夹具残留；教训两收]。

## 残余（票 2/池面）

draft 幽灵边处置（导入侧拒收 vs 导出侧过滤——票 2 裁决点）；export_.test
夹具 collectionNames 残留（票 2 顺带清）；draft 全库重置语义=用户知悉面；
findById 列单随票 2 DETAIL 面触点扩列。
