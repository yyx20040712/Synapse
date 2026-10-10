#!/usr/bin/env node
/**
 * calibrate-token-estimate.mjs —— 估计器校准协议闸（受锁文件；
 * F-DBCAMP-01 DB-2 U2b-2b §3.e P12）。
 *
 * 职责：对 src/main/services/ai/ai-estimate.ts 的**真估计器**（esbuild 聚合加载
 * ——禁脚本内重实现公式）跑 3 类×20=60 内嵌语料，与代理参考
 * （Intl.Segmenter('zh-Hans',{granularity:'word'}) 非空白段计数——每段 1，
 * 词级代理）对照，输出分类表（n/meanRef/meanEst/签名偏差%/平均绝对偏差%/判定）
 * +极值。判定=类平均绝对偏差>20%；exit 0 全类内/exit 1 任一类超（协议闸，
 * 不进 verify 链——超限处置=预裁 P-B：维持系数冻结，偏差登记 docs/design/
 * 2026-10-10_f-dbcamp01-estimator-calibration.md，终校准挂账真实分词器落定批）。
 *
 * Node 版本守卫沿 check-quality 口径（非 24 退 1；豁免口 CI/SYNAPSE_SKIP_NODE_GUARD）。
 */
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 0) Node 版本守卫（check-quality 同款三条件——vitest jsdom 假红防线同源）
if (
  process.env.CI !== 'true' &&
  process.env.SYNAPSE_SKIP_NODE_GUARD !== '1' &&
  !process.version.startsWith('v24.')
) {
  console.error(`Node 版本守卫：当前 ${process.version} 非 v24.x（CI 口径）——校准协议闸拒绝执行`)
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 1) esbuild 聚合加载真估计器（bundle 单文件→data URL 动态 import——零临时文件）
const bundled = await build({
  entryPoints: [join(root, 'src/main/services/ai/ai-estimate.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent'
})
const code = bundled.outputFiles[0].text
const mod = await import('data:text/javascript;base64,' + Buffer.from(code, 'utf8').toString('base64'))
const estimateTokens = mod.estimateTokens
const truncateToTokens = mod.truncateToTokens
if (typeof estimateTokens !== 'function' || typeof truncateToTokens !== 'function') {
  console.error('估计器装载失败：estimateTokens/truncateToTokens 未导出（装载面漂移）')
  process.exit(1)
}
// [r1 R-N8] 系数导出存在性守卫——装载面漂移（重命名/漏导出）时防静默 undefined
// 打进输出数字（undefined 参与算术=NaN 污染全表且不抛错）
if (
  typeof mod.ESTIMATE_CJK_WEIGHT !== 'number' ||
  typeof mod.ESTIMATE_OTHER_WEIGHT !== 'number'
) {
  console.error(
    `估计器系数导出缺失：ESTIMATE_CJK_WEIGHT=${typeof mod.ESTIMATE_CJK_WEIGHT} ` +
      `ESTIMATE_OTHER_WEIGHT=${typeof mod.ESTIMATE_OTHER_WEIGHT}（装载面漂移——拒绝跑校准）`
  )
  process.exit(1)
}
console.log(`装载真估计器：a=${mod.ESTIMATE_CJK_WEIGHT} b=${mod.ESTIMATE_OTHER_WEIGHT}（esbuild 聚合——脚本零公式重实现）`)

// 2) 语料（3 类×20=60——覆盖纯中/纯英/混排/数字/代码标识符/CJK+ASCII 标点/长短跨）
const NOTES_MARKDOWN = [
  '## 漏损检测方法小结\n\n- 夜间最小流量法（MNF）适用于 DMA 分区计量场景\n- 声学检测 acoustic correlation 对金属管道灵敏度高\n- 灵敏度约 0.5-2 L/s，视管径与压力水平而定',
  '### 水力模型校准笔记\nEPANET 2.2 的 WSHP 求解器在大型管网上收敛较慢；roughness 系数建议按 Hazen-Williams C=120 起步，再据实测压差微调。',
  '水质预警阈值：浊度 NTU>1.0、余氯 <0.05 mg/L、pH 偏离 7.5±0.5 触发复核。SCADA 采样周期 5min，报警延时 3 周期防抖。',
  'Reading notes: the paper compares GRU and LSTM for short-term demand forecasting. MAPE drops from 7.2% to 5.8% on the hourly dataset, but gains vanish on daily granularity.',
  '管网拓扑：J1037--J1042 段 DN300 铸铁管 1986 年敷设；爆管记录 3 次/近五年。建议列入年度更换清单（priority=P1）。',
  '## 试验记录\n\n台架：水泵变频 50Hz，出口压力 0.32MPa。传感器：pressure_transducer_01 采样 100Hz。\n结果：水锤峰值约为稳态 2.3 倍，缓闭止回阀可将升压速率降低 41%。',
  '消毒副产物（DBP）控制思路：前加氯改为后加氯，THMs 生成势下降约 30%；联合 UV254 在线监测作为前体物代理指标。',
  'Data pipeline: raw SCADA csv -> ETL (dedupe, gap-fill) -> feature store v3. Field names use snake_case, e.g. flow_rate_lps, pressure_head_m. Retention 90d hot / 2y cold.',
  '## 泵站调度优化\n\n- 双泵并联运行点偏移：效率下降约 4 个百分点\n- 峰谷电价差 0.7 元/kWh，蓄水池调蓄容量 800m3 可承接夜间低谷充水\n- 变频下限 35Hz（防汽蚀）',
  'NRW（产销差）拆解：物理漏损约占 60%，计量误差 15%，偷盗与免费供水 10%，数据不一致 15%。ILI 指标当前 4.7，目标三年内降至 3.0。',
  '模型输入特征清单：hour_of_day, day_of_week, temperature_c, rainfall_mm_1h, upstream_pressure_m, tank_level_pct。滞后项取 1h/3h/24h 三档滑窗统计量。',
  '## 会商纪要\n\n设计水量按远期 2035 年 18 万 m3/d 校核；现状 12.4 万。管径复核采用经济流速 1.2m/s 上限。投资估算 2.3 亿元，其中管网改造占 71%。',
  'Spectral analysis of pressure signals shows leak-induced vibro-acoustic energy concentrated at 200-800 Hz. Sensor spacing must satisfy lambda/2 for coherent detection.',
  '注意事项：MATLAB 脚本 run_calibration.m 依赖 Optimization Toolbox；Octave 兼容性未验证。数据文件命名 YYYYMMDD_station.csv。',
  '## 分区计量（DMA）建立要点\n\n1. 边界阀全闭测试（零压法验证密闭性）\n2. 进口恒压控制\n3. 夜间最小流量基线连续观测 ≥14 天\n4. ALARM 阈值=基线+3σ',
  'Review comment: Figure 6 axes unlabeled; Table 2 sample count n=12 too small for the claimed significance (p=0.048). Suggest Mann-Whitney U or bootstrap CI.',
  '管网 graph 存储：nodes.csv（id,folder_id,paper_id）、edges.csv（from,to,label）。投影不变量：node.folder_id≡papers.folder_id——移动文献须随迁节点。',
  '## 应急预案演练\n\n- 假想工况：DN800 输水干管爆管\n- 关阀序列 V12→V15→V22，预计失压区 3.2km2\n- 调度指令下达至执行 SLA ≤8min（演练实测 11min，不达标）',
  'Battery-powered acoustic loggers: duty cycle 1/30 (2s sample every 60s), deployment density 12 units/km for PE pipes vs 8 for metallic.',
  '长观测摘要：基于 2019-2024 年 42 万条工单文本的主题演化分析（LDA k=15），漏损类主题占比由 28% 升至 37%；“水表纠纷”类年度周期性显著（FFT 主频 1/year）。'
]
const ANNOTATION = [
  '[标注] p3highlight|"The minimum night flow (MNF) method assumes constant legitimate night consumption."|假设夜间合法用水恒定——与实际存在 5-8% 波动，值得复核。',
  '[标注] p7highlight|"Acoustic correlation requires velocity and pipe material as inputs."|输入参数现场获取难，金属/非金属速度差 4 倍。',
  '[标注] p12highlight|Table 3 lists MAPE by district, ranging 4.1% to 9.7%.|最好/最差分区差 2.4 倍——分区规模不均衡所致。',
  '[标注] p15highlight|"We fine-tune a pretrained transformer on 1.2M work orders."|语料规模中等；未报告 baseline 对比。',
  '[标注] p2highlight|"Chlorine decay follows first-order kinetics with k_b around 0.5 d^-1."|一阶动力学在高温段偏差大，原文图 4 有系统低估。',
  '[标注] p21highlight|The F1 score improved from 0.71 to 0.83 after data augmentation.|增广策略细节在附录 B，仅旋转/加噪两类。',
  '[标注] p5highlight|"Pressure-driven analysis (PDA) replaces demand-driven when head falls below threshold."|PDA 收敛性依赖初始点，作者未给迭代上限。',
  '[标注] p9highlight|Equation (4) couples the Hazen-Williams headloss with the emitter flow q=C*(h)^gamma.|emitter 指数 gamma 默认 0.5，压力无关假设不成立时需标定。',
  '[标注] p33highlight|"Field validation was conducted on a single DMA over 6 months."|单分区短周期——外推性存疑。',
  '[标注] p11highlight|The sensor sampling rate was set to 10 Hz for transient analysis.|10Hz 对水锤前沿捕捉偏低，Nyquist 损失。',
  '[标注] p18highlight|"Transfer learning mitigates the data scarcity in small utilities."|小水司样本 <1k 条，微调后仍欠拟合（图 7 训练/验证曲线未收敛）。',
  '[标注] p4highlight|Revenue water accounted for 81.3% of total supply in the audit year.|产销差 18.7% 与后文 22% 口径矛盾——统计年份不同。',
  '[标注] p26highlight|"We compare GNN-based surrogate models against physics-based solvers."|代理模型加速 400x 但外推至训练域外误差发散。',
  '[标注] p8highlight|The k-means clustering with k=8 was chosen by the elbow method.|肘点法主观性强，silhouette 轮廓系数未报告。',
  '[标注] p30highlight|"Leak localization error median 47 m across 43 events."|中位 47m 尚可，但 P90 达 210m——长尾未讨论。',
  '[标注] p14highlight|SCADA telemetry uses the MQTT protocol with QoS level 1.|QoS1 可能重复投递，去重逻辑在消费端实现。',
  '[标注] p22highlight|"The hydraulic model was calibrated using 120 pressure sensors."|传感器密度 1/2.3km，空间代表性弱。',
  '[标注] p6highlight|Ablation shows the attention module contributes 61% of the total improvement.|归因方式为逐模块剔除，交互效应未拆分。',
  '[标注] p17highlight|"Water age at the network periphery exceeded 72 hours in summer."|水龄超标的余氯衰减复核——建议末梢加在线余氯计。',
  '[标注] p28highlight|The dataset and code are released under CC BY-NC 4.0.|非商用许可——内部复现可行，产品化需换数据源。'
]
const MEMORY = [
  '[记忆召回:method_note] 夜间最小流量法|MNF 法假定夜间合法用水恒定，实测波动 5-8%；建议以 14 天基线+3σ 设警。',
  '[记忆召回:method_note] 声学相关定位|相关分析法需管材与波速输入；PE 管波速约 400m/s，钢管约 1200m/s。',
  '[记忆召回:data_evidence] 压力信号频谱|漏损振动能量集中于 200-800Hz；传感器间距须 ≤λ/2 保证相干检测。',
  '[记忆召回:data_evidence] 需求预测精度|GRU 对 LSTM 的 MAPE 改善 7.2%→5.8%（小时级）；日级粒度收益消失。',
  '[记忆召回:critique_limit] 单区验证局限|现场验证仅单 DMA 六个月，外推性存疑——跨气候区需复验。',
  '[记忆召回:critique_limit] 采样率不足|10Hz 采样对水锤前沿捕捉不足，Nyquist 损失未量化。',
  '[记忆召回:term_glossary] ILI|Infrastructure Leakage Index，漏损指数=实际漏损/不可避免漏损（CARL 比值）。',
  '[记忆召回:term_glossary] PDA|Pressure Driven Analysis，压力驱动分析——水头低于阈值时以压力-流量耦合替代需求驱动。',
  '[记忆召回:reading_insight] 前馈加氯|前加氯改后加氯使 THMs 生成势降 30%，UV254 可作前体物代理指标。',
  '[记忆召回:reading_insight] 调度经济性|峰谷价差 0.7 元/kWh 下，800m3 调蓄池夜间充水年节约电费约 18 万元。',
  '[记忆召回:method_note] 模型校准起步值|Hazen-Williams C=120 起步再按实测压差微调；EPANET WSHP 大型网收敛慢。',
  '[记忆召回:data_evidence] NRW 拆解|物理漏损 60%/计量误差 15%/偷盗与免费 10%/数据不一致 15%；ILI 4.7→目标 3.0。',
  '[记忆召回:method_note] 边界密闭验证|DMA 建立用零压法测边界密闭性；夜间基线观测 ≥14 天。',
  '[记忆召回:term_glossary] emitter 指数|压力-流量耦合指数 gamma 默认 0.5；压力无关假设不成立时须现场标定。',
  '[记忆召回:critique_limit] 肘点法主观性|k-means 选 k 用肘点法主观；silhouette 系数应作旁证。',
  '[记忆召回:reading_insight] 代理模型边界|GNN 代理对物理求解器加速 400x，但训练域外误差发散——不可外推。',
  '[记忆召回:method_note] 工单主题演化|LDA k=15 跑 42 万条工单：漏损主题 28%→37%；水表纠纷年度周期显著。',
  '[记忆召回:data_evidence] 定位误差分布|43 次事件漏点定位中位误差 47m，P90 达 210m——长尾未讨论。',
  '[记忆召回:term_glossary] QoS1|MQTT 至少一次投递——消费端必须幂等去重。',
  '[记忆召回:reading_insight] 末梢水龄|夏季管网末梢水龄超 72h；余氯衰减复核建议末梢加装在线余氯计。'
]
const CORPUS = [
  { name: '中英混排笔记 markdown 形', samples: NOTES_MARKDOWN },
  { name: '标注 quote+comment 形', samples: ANNOTATION },
  { name: '记忆 title+content 形', samples: MEMORY }
]

// 3) 代理参考：Intl.Segmenter('zh-Hans', word) 非空白段计数（每段 1——词级代理）
const segmenter = new Intl.Segmenter('zh-Hans', { granularity: 'word' })
function refTokens(text) {
  let n = 0
  for (const seg of segmenter.segment(text)) {
    if (seg.segment.trim() !== '') n += 1
  }
  return n
}

// 4) 统计
const rows = []
let anyFail = false
for (const cls of CORPUS) {
  const pairs = cls.samples.map((s) => ({ est: estimateTokens(s), ref: refTokens(s), text: s }))
  const n = pairs.length
  const meanRef = pairs.reduce((s, p) => s + p.ref, 0) / n
  const meanEst = pairs.reduce((s, p) => s + p.est, 0) / n
  const signedPct = ((meanEst - meanRef) / meanRef) * 100
  const meanAbsPct = (pairs.reduce((s, p) => s + Math.abs(p.est - p.ref) / p.ref, 0) / n) * 100
  const fail = meanAbsPct > 20
  if (fail) anyFail = true
  rows.push({ name: cls.name, n, meanRef, meanEst, signedPct, meanAbsPct, fail, pairs })
}

// 5) 输出
console.log('')
console.log('== 估计器校准协议闸（代理参考=Intl.Segmenter zh-Hans 词级，每段 1） ==')
console.log('类别 | n | meanRef | meanEst | 签名偏差% | 平均绝对偏差% | estMax | 判定')
for (const r of rows) {
  const estMax = Math.max(...r.pairs.map((p) => p.est))
  console.log(
    `${r.name} | ${r.n} | ${r.meanRef.toFixed(1)} | ${r.meanEst.toFixed(1)} | ` +
      `${r.signedPct >= 0 ? '+' : ''}${r.signedPct.toFixed(1)} | ${r.meanAbsPct.toFixed(1)} | ${estMax} | ${r.fail ? '超限(>20%)' : '内'}`
  )
}
const all = rows.flatMap((r) => r.pairs.map((p) => ({ ...p, cls: r.name })))
const byAbs = [...all].sort((a, b) => Math.abs(b.est - b.ref) / b.ref - Math.abs(a.est - a.ref) / a.ref)
const worst = byAbs[0]
const best = byAbs[byAbs.length - 1]
const maxEst = [...all].sort((a, b) => b.est - a.est)[0]
console.log('')
console.log('== 极值 ==')
console.log(
  `最大绝对偏差样本：[${worst.cls}] est=${worst.est} ref=${worst.ref} dev=${((worst.est - worst.ref) / worst.ref * 100).toFixed(1)}%`
)
console.log(
  `最小绝对偏差样本：[${best.cls}] est=${best.est} ref=${best.ref} dev=${((best.est - best.ref) / best.ref * 100).toFixed(1)}%`
)
console.log(`最大 est 样本：[${maxEst.cls}] est=${maxEst.est} ref=${maxEst.ref}`)
const totalN = rows.reduce((s, r) => s + r.n, 0)
console.log(`语料合计 ${totalN} 样本（3 类×20）`)
// [r1 R-W3] 码点跨度实测（全样本 [...s].length min/max——长短跨声明以实测为准）
const allLens = CORPUS.flatMap((c) => c.samples.map((s) => [...s].length))
console.log(`码点跨度（全样本实测）：min=${Math.min(...allLens)} / max=${Math.max(...allLens)}`)

if (anyFail) {
  console.log('')
  console.log('判定：存在类平均绝对偏差>20%——协议闸红（exit 1）。')
  console.log('处置=预裁 P-B：系数 a=1.0/b=0.25 维持冻结（过估=安全向），偏差登记')
  console.log('docs/design/2026-10-10_f-dbcamp01-estimator-calibration.md；终校准挂账真实分词器落定批。')
  process.exit(1)
}
console.log('')
console.log('判定：全类平均绝对偏差 ≤20%——协议闸绿（exit 0）。')
