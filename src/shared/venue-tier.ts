// b3: P7-G
/**
 * [SR2-ENR-02] venue-tier —— 学科→期刊档位映射与装配契约（工单：open / strong）
 *
 * 本文件=本单注册文件（新模块）；主要改动面=corpus.assemble.ts 装配接线
 * （该文件头注指针保持 P7-C 不动——一文件双裁决来源，ENR-02 裁决链在本
 * 头注与 registry summary 声明，防实现者顺手改头指针丢失 C-02 链）。
 *
 * ── 行为层 ──
 * - front-matter/manifest 装配两可选字段（corpus.assemble.ts 预留位兑现）：
 *   citedByCount（PaperDetail 有值则装配，undefined/null 省略）+venueTier
 *   （venue→本模块映射表查档；未命中省略——可选语义两形）。
 * - manifest per-paper 条目带 citedByFetchedAt（sha 幂等口径「同缓存状态
 *   下确定」自声明配套）；**配对省略规则：无 citedByCount 则无
 *   citedByFetchedAt——两字段成对出现成对省略**。
 * - INTERFACE.md（interface-template.ts）指标口径节：两字段可选性与消费
 *   口径（领域基线归一/自引处理归 AI 侧）+sha 消费者提示：
 *   「citedByCount=缓存快照随手动增强刷新；contentSha 幂等以同缓存状态
 *   为前提——增量对比消费方须知」。
 * - 无状态机新面（装配纯函数）；两形断言=有指标篇字段存在/无指标篇缺省。
 *
 * ── 接口层 ──
 * - export type VenueTier = 'T1' | 'T2' | 'T3'（三档人工先验；T1=领域顶刊
 *   ——档位语义在模块头注声明）。
 * - export const VENUE_TIER_MAP: Readonly<Record<string, VenueTier>>——
 *   种子表 3~5 条示例级（机制为主，内容增量走受锁常量修订；键=provider
 *   display_name 原形：精确等值、仅 trim，不做 toLowerCase 归一）。
 * - export function venueToTier(venue: string): VenueTier | null——
 *   ''→null；未命中→null。
 *
 * ── 架构层 ──
 * - schemaVersion 恒 1（ADR-0011「新增字段必须可选」规则内）；golden 逐字节
 *   口径更新=契约扩展非放宽（[locked-change]，AI-09 断言演进先例）。
 * - 随单 ADR-0011 修订记录 v1.2 补注行：「venueTier v1 实现档=受锁常量
 *   修订制（D3-A 2026-08-27 用户拍板：最小供给档）；『允许用户改』的 UI
 *   面留 D3-B 档」——纯 docs 随单提交。
 *
 * ── 生命周期层 ──
 * - 不做：venueTier 编辑 UI（D3-B 档）；映射表内容批量扩充（受锁常量修订
 *   制）；cited_by_count 的 FTS/排序消费面（ADR-0012 条件一未触发）。
 *
 * ── 文化层 ──
 * - 测试：golden 更新（夹具含缓存值篇——corpus.export.test.ts 受锁）+
 *   结构断言两形（同宿主）+venueToTier 命中/未命中/空串/trim（新测试
 *   tests/unit/shared/venue-tier.test.ts 裸 describe，不挂 guardedDescribe）
 *   +INTERFACE 声明存在性。
 * - 收口机检项（缺=拒收）：verify 真退出码行+变异红证还原记录（同 ENR-01）。
 * - 受锁面：corpus.export.test.ts+corpus.assemble.test.ts+golden 夹具+
 *   venue-tier.test.ts（新入锁）；corpus.assemble.ts 与 interface-template.ts
 *   均非锁（常规提交）。
 * - 验收：verify 绿；真库导出抽查 manifest 两字段+时间戳。
 * - 文件清单：venue-tier.ts（本文件）/corpus.assemble.ts（非锁改）/
 *   corpus.export.service.ts（非锁改）/interface-template.ts（非锁改）/
 *   docs/adr/0011-*.md（修订记录 v1.2 行）/tests 四件如上。
 * - **依赖 ENR-01 数据面（串行领取）**。
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */

/** 三档人工先验：T1=领域顶刊；T2=领域主力刊；T3=一般刊（档位语义单源在此，
 *  消费侧只做领域内相对比较——跨领域原始值比较无意义，ADR-0011 口径） */
export type VenueTier = 'T1' | 'T2' | 'T3'

/**
 * 种子表（示例级 5 条，机制为主）：内容增量走受锁常量修订制（D3-A 2026-08-27
 * 用户拍板——本文件 src/shared/** 全域入锁，修订=改本表+[locked-change]）。
 * 键=provider display_name 原形：精确等值、仅 trim，不做 toLowerCase 归一（N-r2b）。
 */
export const VENUE_TIER_MAP: Readonly<Record<string, VenueTier>> = {
  'Nature Water': 'T1',
  'Environmental Science & Technology': 'T1',
  Desalination: 'T2',
  'Journal of Hydrology': 'T2',
  Water: 'T3'
}

/** venue→档位：''/纯空白/未命中 → null（装配侧整键省略——可选语义） */
export function venueToTier(venue: string): VenueTier | null {
  const hit = VENUE_TIER_MAP[venue.trim()]
  return hit === undefined ? null : hit
}
