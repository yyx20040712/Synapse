#!/usr/bin/env node
/**
 * [F-TESTREF-00] 测试面指纹门 check-test-surface.mjs（受锁文件）。
 *
 * 职责：抽取 tests/** 契约面（C 面=用例标题多重集+expect 断言规范化文本多重集
 * +guardedDescribe 工单号集+skip/only 标记+体内条件 skip 文本多重集）与基线比对，
 * C_after ⊇ C_before 多重集判定——「测试不可静默削弱」从纪律升级为机检。设计定稿=
 * docs/design/2026-09-11_f-testref00-design-final.md（裁决参数：W1 传播/W2 断言
 * 单元/W4 签名计数/B1 skipSites 双向红/B2 SKIP_ADDED/W5 ACTIVATED/W6 哨兵）；
 * 裁决链=docs/design/2026-09-11_glm-ruling-arch-complexity-and-test-campaign.md §4-2。
 *
 * 抽取器 lib=scripts/test-surface/extract.mjs（两处实现自裁见该件头注：
 * skipSites 文件级多重集、哨兵 AST 形态判定）。
 *
 * exit code：0=通过（delta 绿）/ 1=契约违背或 UNRESOLVABLE / 2=基线缺失或损坏
 * （硬阻断禁自愈——显式执行 `npm run test-surface:baseline` 并全量审计 diff）/
 * 3=豁免清单 schema 非法 / 4=baseline 再生成对账失败（拒写——基线保持原内容；
 * TICKETS_MISSING/ONLY_FORBIDDEN 类无豁免通道，人工裁决后删基线重跑=首装语义）。
 * baseline 子命令仅显式调用（本脚本无任何红了重写分支）。
 * [F-TESTREF-S2] baseline 再生成对账：写盘前先跑两轴（轴一=judge(old,cur)
 * 退役面漏登豁免拦截；轴二=台账−快照差集，新增条目须本轮真实命中）——豁免快照
 * （exemptionsSnapshot）随盘落；check 子命令判定语义零变。
 * [F-TESTREF-S3] FILE 级豁免通道：删整测试文件登 {file, fileScope:true,
 * reason, rulingLink}（显式哨兵、零 matcher 键、与 matcher 形态互斥）——轴一
 * FILE_MISSING 命中豁免即退役留档；轴二身份键含 fileScope，经既有
 * structuredClone 自然入快照（version 1 向后兼容零破）。
 *
 * 用例闸=指纹闸蕴含（caseCount 单调不减是 ⊇ 的推论，delta 汇总行显式打印计数）。
 * [test-refactor][locked-change]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { extractAll, statsOf } from './test-surface/extract.mjs'

const BASELINE_PATH = 'scripts/test-surface.baseline.json'
const EXEMPTIONS_PATH = 'scripts/test-surface.exemptions.json'

function die(code, msg) {
  console.error(msg)
  process.exit(code)
}

function loadBaseline(root) {
  const p = join(root, BASELINE_PATH)
  if (!existsSync(p)) return { missing: true }
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
    if (parsed?.version !== 1 || parsed?.files === null || typeof parsed.files !== 'object' || Array.isArray(parsed.files)) {
      return { corrupt: true }
    }
    // 基线健全性下限（门一 B1b+N7）：空/退化 files 使 C_after ⊇ ∅ 恒真——按
    // corrupt（exit 2 硬阻断）处理；stats 字段同时用活（死字段 N7 收口）。
    const fileCount = Object.keys(parsed.files).length
    if (fileCount < 1 || !parsed.stats || typeof parsed.stats !== 'object' || parsed.stats.fileCount !== fileCount || !(parsed.stats.caseCount >= 1)) {
      return { corrupt: true }
    }
    // exemptionsSnapshot（F-TESTREF-S2）两级校验（R1）：缺失=迁移首启；存在但非
    // Array/元素非合法对象（null/非对象/缺 file）=快照损坏归 corrupt 语义（跳两轴修复
    // 重写）——否则 null 元素在身份键取 e.file 会未捕获 TypeError 撞 UNRESOLVABLE 契约码 1
    // （k1-N1 信任边界：元素仅校验到 file 键字符串级——正常路径元素源自本脚本
    // structuredClone(已过 loadExemptions schema 校验的台账)，深校验冗余；手编注入
    // 的畸形匹配键走 JSON.stringify 序列化（parse 产物无循环引用，无 throw 面））
    const snap = parsed.exemptionsSnapshot
    const snapOk = Array.isArray(snap) && snap.every((el) => el !== null && typeof el === 'object' && !Array.isArray(el) && typeof el.file === 'string')
    if (snap !== undefined && !snapOk) return { files: parsed.files, stats: parsed.stats, snapshot: undefined, snapshotCorrupt: true }
    return { files: parsed.files, stats: parsed.stats, snapshot: snapOk ? snap : undefined }
  } catch {
    return { corrupt: true }
  }
}

/** 豁免清单加载+schema 校验（Kimi §6：reason/rulingLink 非空必填；匹配键≥1） */
function loadExemptions(root) {
  const p = join(root, EXEMPTIONS_PATH)
  const empty = { entries: [] }
  if (!existsSync(p)) return empty
  let parsed
  try {
    parsed = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
  } catch (e) {
    die(3, `[test-surface] 豁免清单损坏：${EXEMPTIONS_PATH} JSON 解析失败（${e.message}）—— schema 非法即红`)
  }
  if (parsed?.version !== 1 || !Array.isArray(parsed?.entries)) {
    die(3, `[test-surface] 豁免清单 schema 非法：须为 {version:1, entries:[...]}（exit 3）`)
  }
  for (const e of parsed.entries) {
    const hasMatcher = e.caseTitle !== undefined || e.assertionText !== undefined || e.skipSiteText !== undefined
    const fileOk = typeof e.file === 'string' && e.file !== ''
    const metaOk = typeof e.reason === 'string' && e.reason !== '' && typeof e.rulingLink === 'string' && e.rulingLink !== ''
    // [F-TESTREF-S3] 两类互斥形态：matcher 形态（file+匹配键≥1）或 FILE 级形态
    // （file+fileScope===true 且零 matcher 键）——显式哨兵防 matcher 键拼错静默
    // 升级为整文件豁免（整文件契约全弃=最大杀伤面）；fileScope 存在但非 true、
    // 或与任一 matcher 键并存均 schema 拒（exit 3）。
    if (e.fileScope !== undefined) {
      if (e.fileScope !== true || hasMatcher || !fileOk || !metaOk) {
        die(3, `[test-surface] 豁免条目 schema 非法（FILE 级形态须为 file+fileScope:true+非空 reason+rulingLink，且不得与 caseTitle/assertionText/skipSiteText 匹配键并存；fileScope 仅接受布尔 true）：${JSON.stringify(e)}`)
      }
    } else if (!fileOk || !hasMatcher || !metaOk) {
      die(3, `[test-surface] 豁免条目 schema 非法（须含 file+匹配键 caseTitle/assertionText/skipSiteText 至少其一+非空 reason+rulingLink；删整测试文件类=FILE 级形态 file+fileScope:true）：${JSON.stringify(e)}`)
    }
  }
  return { entries: parsed.entries }
}

function caseSignature(c) {
  return JSON.stringify({ a: [...c.assertions].sort(), m: [...c.markers].sort() })
}

function countMultiset(items) {
  const m = new Map()
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1)
  return m
}

/** 豁免匹配（N2 从宽：file 精确+匹配键精确；同 title 重复用例=已知限制，条目宜附细键。
 * [F-TESTREF-S3] kind='file'：FILE 级条目（fileScope:true）命中即整文件豁免
 * （file 已前置精确匹配；无 payload 面）。[R1·门一双席同中 W1] FILE 条目结构性
 * 隔离：短路后续 matcher 分支——防 payload 匹配字段 undefined 时
 * undefined===undefined 及兜底从宽把 FILE 条目误捞为 case/assert 级命中（现无
 * 活路径——调用方 payload 恒真实字符串，防御面加固；守卫非活路径故无 CLI 红证
 * 面，协同/多重集语义由姊妹件 T7/T8 锁）。 */
function exemptionHits(exemptions, kind, file, payload) {
  const hits = []
  for (const e of exemptions.entries) {
    if (e.file !== file) continue
    if (e.fileScope === true) {
      if (kind === 'file') hits.push(e)
      continue
    }
    if (kind === 'case' && e.caseTitle === payload.title && (e.assertionText === undefined || payload.assertions.includes(e.assertionText))) hits.push(e)
    if (kind === 'assert' && e.assertionText === payload.assertionText && (e.caseTitle === undefined || e.caseTitle === payload.title)) hits.push(e)
    if (kind === 'skipsite' && e.skipSiteText === payload.text) hits.push(e)
  }
  return hits
}

function fmtRelLine(file, line) {
  return line === undefined ? file : `${file}:${line}`
}

/** 豁免条目身份键（F-TESTREF-S2 轴二多重集差）：file+匹配键（caseTitle/
 * assertionText/skipSiteText 存在者）。reason/rulingLink=元数据非身份——注释性修订
 * （改 reason/裁决链）同身份零 delta 放行；匹配目标变更=身份变→进 added 受拦。
 * [F-TESTREF-S3] FILE 条目身份={file, fileScope:true}（哨兵键计入身份——与
 * matcher 条目天然不撞，后者恒含 matcher 键）；多重集差语义零变。 */
function exemptionEntryKey(e) {
  const m = { file: e.file }
  if (e.fileScope !== undefined) m.fileScope = e.fileScope
  if (e.caseTitle !== undefined) m.caseTitle = e.caseTitle
  if (e.assertionText !== undefined) m.assertionText = e.assertionText
  if (e.skipSiteText !== undefined) m.skipSiteText = e.skipSiteText
  return JSON.stringify(Object.keys(m).sort().map((k) => [k, m[k]]))
}

/** 豁免多重集差：added=台账−快照（多登面）、removed=快照−台账（孤儿豁免，仅打印不拦） */
function exemptionDiff(entries, snapshot) {
  const snapC = new Map()
  for (const s of snapshot) { const k = exemptionEntryKey(s); snapC.set(k, (snapC.get(k) ?? 0) + 1) }
  const curC = new Map()
  for (const e of entries) { const k = exemptionEntryKey(e); curC.set(k, (curC.get(k) ?? 0) + 1) }
  const added = []
  const removed = []
  for (const e of entries) { const k = exemptionEntryKey(e); const n = snapC.get(k) ?? 0; if (n > 0) snapC.set(k, n - 1); else added.push(e) }
  for (const s of snapshot) { const k = exemptionEntryKey(s); const n = curC.get(k) ?? 0; if (n > 0) curC.set(k, n - 1); else removed.push(s) }
  return { added, removed }
}

/** 报告摘要（超长截断） */
function summarize(text, max) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** 主判定：返回 { failures:[], deltas:[], exemptHits:Set, statsLine, retiringFaces }。
 * exemptHitKeys 存**豁免条目对象**（Kimi 补审 N-1：按条目身份计——同条目多次
 * 命中只计一、一条跨 kind 命中不虚计；stale=零命中条目数）。retiringFaces
 * （F-TESTREF-S2 审计面）=豁免命中面逐条留档——仅报告用，判定语义零变。 */
function judge(baseFiles, cur) {
  const failures = []
  const deltas = []
  const exemptHitKeys = new Set()
  const retiringFaces = []
  const recordFace = (kind, path, line, text, hit) => {
    for (const h of hit) exemptHitKeys.add(h)
    retiringFaces.push({ kind, path, line, text, entries: hit })
  }
  const paths = [...new Set([...Object.keys(baseFiles), ...cur.keys()])].sort()
  let baseCaseTotal = 0
  let curCaseTotal = 0
  let baseAssertTotal = 0
  let curAssertTotal = 0
  let baseSkipTotal = 0
  let curSkipTotal = 0

  for (const path of paths) {
    const b = baseFiles[path]
    const c = cur.get(path)
    if (b && !c) {
      // [F-TESTREF-S3] FILE_MISSING 豁免通道：删整测试文件登 FILE 级条目
      // （fileScope:true）→ 命中走 recordFace 留档（轴二命中面）；未登照旧红。
      // 既有 baseCaseTotal 等累计逻辑保持（stats 口径零变）。
      const hit = exemptionHits(loadExemptionsCache, 'file', path, {})
      if (hit.length > 0) recordFace('FILE_MISSING', path, undefined, path, hit)
      else failures.push({ kind: 'FILE_MISSING', path, line: undefined, text: path })
      baseCaseTotal += b.cases.length
      baseSkipTotal += b.conditionalSkipSites.length + b.hardSkipSites.length
      for (const cs of b.cases) baseAssertTotal += cs.assertions.length
      continue
    }
    if (!b && c) {
      deltas.push(`NEW_FILE ${path}（${c.cases.length} 用例）`)
      curCaseTotal += c.cases.length
      curSkipTotal += c.conditionalSkipSites.length + c.hardSkipSites.length
      for (const cs of c.cases) curAssertTotal += cs.assertions.length
      // 新文件体内 skip 双桶亦=「新增」→红（B1 语义覆盖新文件场景——回炉轮
      // 补面；豁免命中走 recordFace[F-TESTREF-S2 回炉：与两态分支同款——原三处
      // 命中后零记录致轴二对新增豁免判零命中，拦死合规再生成]）
      for (const text of [...c.conditionalSkipSites, ...c.hardSkipSites]) {
        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
        if (hit.length > 0) recordFace('SKIPSITE_ADDED', path, undefined, text, hit)
        else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
      }
      for (const cs of c.cases) {
        // Kimi 补审 B-1：新文件分支缺 only 判定=逃逸通道（新文件 it.only 走
        // NEW delta 绿——only 聚焦语义使全仓测试静默缩水）。only 恒红含新文件。
        if (cs.markers.includes('only')) {
          failures.push({ kind: 'ONLY_FORBIDDEN', path, line: cs.line, text: cs.title })
          continue
        }
        if (cs.markers.includes('skip')) {
          const hit = exemptionHits(loadExemptionsCache, 'case', path, cs)
          if (hit.length > 0) recordFace('SKIP_ADDED', path, cs.line, cs.title, hit)
          else failures.push({ kind: 'SKIP_ADDED', path, line: cs.line, text: cs.title })
        } else {
          deltas.push(`NEW ${path} › ${cs.title} (line ${cs.line}, ${cs.assertions.length} assertions)`)
        }
      }
      continue
    }
    // 两态比对
    baseCaseTotal += b.cases.length
    curCaseTotal += c.cases.length
    baseSkipTotal += b.conditionalSkipSites.length + b.hardSkipSites.length
    curSkipTotal += c.conditionalSkipSites.length + c.hardSkipSites.length
    for (const cs of b.cases) baseAssertTotal += cs.assertions.length
    for (const cs of c.cases) curAssertTotal += cs.assertions.length

    // ticketIds：基线 ⊄ 当前 → 红
    const curTickets = new Set(c.ticketIds)
    for (const id of b.ticketIds) {
      if (!curTickets.has(id)) failures.push({ kind: 'TICKETS_MISSING', path, line: undefined, text: id })
    }

    // only（含 W1 传播）恒红
    for (const cs of c.cases) {
      if (cs.markers.includes('only')) failures.push({ kind: 'ONLY_FORBIDDEN', path, line: cs.line, text: cs.title })
    }

    // conditionalSkipSites：文件级多重集双向红（设计 B1——非字面量条件形态）
    const bCond = countMultiset(b.conditionalSkipSites)
    const cCond = countMultiset(c.conditionalSkipSites)
    for (const [text, n] of bCond) {
      const curN = cCond.get(text) ?? 0
      for (let i = 0; i < n - curN; i++) {
        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
        if (hit.length > 0) recordFace('SKIPSITE_REMOVED', path, undefined, text, hit)
        else failures.push({ kind: 'SKIPSITE_REMOVED', path, line: undefined, text })
      }
    }
    for (const [text, n] of cCond) {
      const baseN = bCond.get(text) ?? 0
      for (let i = 0; i < n - baseN; i++) {
        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
        if (hit.length > 0) recordFace('SKIPSITE_ADDED', path, undefined, text, hit)
        else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
      }
    }

    // hardSkipSites（门一 W8 终案）：新增=红（等价「新增 skip」）；删除=激活
    // 绿+delta（与 markers 激活语义一致）；文本相同两桶间不互抵（桶隔离判定）。
    const bHard = countMultiset(b.hardSkipSites)
    const cHard = countMultiset(c.hardSkipSites)
    for (const [text, n] of bHard) {
      const curN = cHard.get(text) ?? 0
      for (let i = 0; i < n - curN; i++) {
        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
        if (hit.length > 0) recordFace('HARDSKIP_REMOVED', path, undefined, text, hit)
        else deltas.push(`ACTIVATED ${path} 「${text}」（hardSkipSite 删除）`)
      }
    }
    for (const [text, n] of cHard) {
      const baseN = bHard.get(text) ?? 0
      for (let i = 0; i < n - baseN; i++) {
        const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
        if (hit.length > 0) recordFace('SKIPSITE_ADDED', path, undefined, text, hit)
        else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
      }
    }

    // 用例按 key 分组 → 签名多重集计数 ⊆ 判定（W4）
    const bGroups = new Map()
    for (const cs of b.cases) {
      if (!bGroups.has(cs.key)) bGroups.set(cs.key, [])
      bGroups.get(cs.key).push(cs)
    }
    const cGroups = new Map()
    for (const cs of c.cases) {
      if (!cGroups.has(cs.key)) cGroups.set(cs.key, [])
      cGroups.get(cs.key).push(cs)
    }

    for (const [key, bCases] of bGroups) {
      const cCases = cGroups.get(key) ?? []
      const curSigs = countMultiset(cCases.map(caseSignature))
      for (const bcs of bCases) {
        const sig = caseSignature(bcs)
        if ((curSigs.get(sig) ?? 0) > 0) {
          curSigs.set(sig, curSigs.get(sig) - 1)
          continue
        }
        // W5：skip→激活（绿+delta）
        if (bcs.markers.includes('skip')) {
          const activatedSig = JSON.stringify({ a: [...bcs.assertions].sort(), m: bcs.markers.filter((m) => m !== 'skip').sort() })
          if ((curSigs.get(activatedSig) ?? 0) > 0) {
            curSigs.set(activatedSig, curSigs.get(activatedSig) - 1)
            deltas.push(`ACTIVATED ${path} › ${bcs.title} (line ${bcs.line})`)
            continue
          }
        }
        // 基线签名无配对 → MISSING_CASE（先试豁免，再 MISSING_ASSERT 细化）
        const hit = exemptionHits(loadExemptionsCache, 'case', path, bcs)
        if (hit.length > 0) {
          recordFace('MISSING_CASE', path, bcs.line, bcs.title, hit)
          continue
        }
        // MISSING_ASSERT 细化：当前同 key 存在 markers 同、断言为其子集的签名
        const sigObj = JSON.parse(sig)
        let detailed = false
        for (const ccs of cCases) {
          if (JSON.stringify([...ccs.markers].sort()) !== JSON.stringify(sigObj.m)) continue
          const curA = countMultiset(ccs.assertions)
          const missing = []
          for (const a of bcs.assertions) {
            const n = curA.get(a) ?? 0
            if (n > 0) curA.set(a, n - 1)
            else missing.push(a)
          }
          if (missing.length > 0 && missing.length < bcs.assertions.length) {
            for (const a of missing) {
              const ahit = exemptionHits(loadExemptionsCache, 'assert', path, { assertionText: a, title: bcs.title })
              if (ahit.length > 0) recordFace('MISSING_ASSERT', path, bcs.line, a, ahit)
              else failures.push({ kind: 'MISSING_ASSERT', path, line: bcs.line, text: a })
            }
            detailed = true
            break
          }
        }
        if (!detailed) failures.push({ kind: 'MISSING_CASE', path, line: bcs.line, text: bcs.title })
      }
    }

    // 当前超出基线的签名 → NEW（带 skip → SKIP_ADDED，B2 含新用例形态）
    for (const [key, cCases] of cGroups) {
      void key
      const bCases = bGroups.get(key) ?? []
      const bNeed = countMultiset(bCases.map(caseSignature))
      // skip 签名的激活回填位：基线 skip 版可消费当前无 skip 同断言签名（W5 已在上
      // 半场消费并打 ACTIVATED——此处补记可激活位，防其落入 NEW/双报）
      const activatable = new Map()
      for (const bcs of bCases) {
        if (!bcs.markers.includes('skip')) continue
        const s = JSON.stringify({ a: [...bcs.assertions].sort(), m: bcs.markers.filter((m) => m !== 'skip').sort() })
        activatable.set(s, (activatable.get(s) ?? 0) + 1)
      }
      for (const cs of cCases) {
        const sig = caseSignature(cs)
        if ((bNeed.get(sig) ?? 0) > 0) {
          bNeed.set(sig, bNeed.get(sig) - 1)
          continue
        }
        if ((activatable.get(sig) ?? 0) > 0) {
          activatable.set(sig, activatable.get(sig) - 1)
          continue
        }
        if (cs.markers.includes('skip')) {
          const hit = exemptionHits(loadExemptionsCache, 'case', path, cs)
          if (hit.length > 0) recordFace('SKIP_ADDED', path, cs.line, cs.title, hit)
          else failures.push({ kind: 'SKIP_ADDED', path, line: cs.line, text: cs.title })
          continue
        }
        deltas.push(`NEW ${path} › ${cs.title} (line ${cs.line}, ${cs.assertions.length} assertions)`)
      }
    }
  }

  // Kimi 补审 W-1：既有用例加 skip 时上半场 MISSING_CASE 与下半场 SKIP_ADDED
  // 双报（同因复述）——输出级去重（计数感知：一条 SKIP_ADDED 抵一条同
  // path+title 的 MISSING_CASE；判定与 exit 不变，两态比对逻辑零触碰）。
  {
    // 键分隔符=\0（Kimi 复核 N-1 采纳：空格分隔在含空格路径+标题拼接下有理论
    // 碰撞面——\0 不可出现于路径/标题文本，碰撞面归零）
    const keyOf = (f) => `${f.path}\0${f.text}`
    const skipAddedCounts = new Map()
    for (const f of failures) {
      if (f.kind !== 'SKIP_ADDED') continue
      const k = keyOf(f)
      skipAddedCounts.set(k, (skipAddedCounts.get(k) ?? 0) + 1)
    }
    for (let i = failures.length - 1; i >= 0; i--) {
      const f = failures[i]
      if (f.kind !== 'MISSING_CASE') continue
      const k = keyOf(f)
      const n = skipAddedCounts.get(k) ?? 0
      if (n > 0) {
        skipAddedCounts.set(k, n - 1)
        failures.splice(i, 1)
      }
    }
  }

  const statsLine = `files: ${Object.keys(baseFiles).length} base / ${cur.size} cur | cases: ${baseCaseTotal} base / ${curCaseTotal} cur` +
    ` | assertions: ${baseAssertTotal} base / ${curAssertTotal} cur | skipSites: ${baseSkipTotal} base / ${curSkipTotal} cur`
  return { failures, deltas, exemptHitKeys, statsLine, retiringFaces }
}

let loadExemptionsCache = { entries: [] }

function serializeBaseline(surfaces, extraStats, exemptionEntries = []) {
  const files = {}
  for (const [p, s] of [...surfaces.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    files[p] = {
      ticketIds: [...s.ticketIds].sort(),
      conditionalSkipSites: s.conditionalSkipSites,
      hardSkipSites: s.hardSkipSites,
      cases: s.cases.map((c) => ({
        key: c.key,
        describePath: c.describePath,
        title: c.title,
        markers: c.markers,
        line: c.line,
        assertions: c.assertions
      }))
    }
  }
  // exemptionsSnapshot（F-TESTREF-S2）=当前豁免台账深拷贝（下轮再生成的轴二对账基准）
  return JSON.stringify({ version: 1, files, stats: extraStats, exemptionsSnapshot: structuredClone(exemptionEntries) }, null, 2) + '\n'
}

function cmdStats(root) {
  const { surfaces, unresolvable } = extractAll(root)
  const stats = statsOf(surfaces, unresolvable)
  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
  console.log(`[test-surface] stats ${JSON.stringify(stats)}`)
  if (unresolvable.length > 0) die(1, `[test-surface] 抽取含 ${unresolvable.length} 处不可静态判定（exit 1）`)
}

function cmdBaseline(root) {
  const { surfaces, unresolvable } = extractAll(root)
  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
  const stats = statsOf(surfaces, unresolvable)
  // W5（门一回炉）：UNRESOLVABLE 非空先阻断后写盘——禁写脏基线（surfaces 缺
  // 失该用例却落盘，后续 check 复用即静默脏基线）
  if (unresolvable.length > 0) die(1, `[test-surface] 基线生成期含 ${unresolvable.length} 处不可静态判定（exit 1，基线未写入——先改写为静态形态或裁决豁免）`)
  // [F-TESTREF-S2] 再生成对账（先于写盘）：旧基线缺失/损坏=两轴跳过直接写（首装/
  // 修复语义）；豁免快照损坏=轴一照跑（本体 files 可比对，漏登仍拒）+轴二跳（无快
  // 照基准）+clean 后重写即修复；合法=轴一 judge(old,cur) 漏登拦截+轴二多登拦截，
  // 任一轴失败 exit 4 拒写（基线保持原内容）——人肉对账升机检（T3-P2 实证立票）
  // （主控加固批 d1-W4：快照单轴坏不得连带放弃轴一拒写面——真实漂移禁止被重写吞没）
  loadExemptionsCache = loadExemptions(root)
  const bl = loadBaseline(root)
  const writeOut = () => {
    writeFileSync(join(root, BASELINE_PATH), serializeBaseline(surfaces, stats, loadExemptionsCache.entries), 'utf8')
    console.log(`[test-surface] baseline 已写入 ${BASELINE_PATH}（exemptionsSnapshot=${loadExemptionsCache.entries.length} 条）`)
    console.log(`[test-surface] stats ${JSON.stringify(stats)}`)
  }
  if (bl.missing || bl.corrupt) {
    console.log(`[test-surface] baseline 对账跳过：旧基线${bl.missing ? '缺失' : '损坏'}——${bl.missing ? '首装' : '修复'}语义，两轴均不跑`)
    writeOut()
    return
  }
  const { failures, retiringFaces, exemptHitKeys } = judge(bl.files, surfaces)
  // 轴二基准：无快照字段（迁移首启）或快照损坏（loadBaseline 置 snapshot=undefined
  // +snapshotCorrupt 标记）=轴二跳过，本轮写盘即落/修复快照
  const skipAxis2 = bl.snapshot === undefined
  const diff = skipAxis2 ? { added: [], removed: [] } : exemptionDiff(loadExemptionsCache.entries, bl.snapshot)
  if (bl.snapshotCorrupt) console.error('[test-surface] baseline 对账：豁免快照损坏（形态非法）——轴二本轮跳过，轴一照跑；clean 后重写即修复快照')
  else if (skipAxis2) console.log('[test-surface] baseline 对账：豁免快照初始化（旧基线无 exemptionsSnapshot 字段——轴二本轮跳过）')
  for (const face of retiringFaces) {
    console.log(`[test-surface] RETIRING ${face.kind} ${fmtRelLine(face.path, face.line)} 「${face.text}」← 豁免：${summarize(face.entries[0].reason, 60)}`)
  }
  let addedHit = 0
  const zeroHit = []
  for (const e of diff.added) {
    const n = retiringFaces.filter((face) => face.entries.includes(e)).length
    if (n > 0) addedHit++
    else zeroHit.push(e)
    console.log(`[test-surface] ADDED 豁免 ${e.file}「${summarize(e.caseTitle ?? e.assertionText ?? e.skipSiteText ?? '', 40)}」本轮命中 ${n} 处`)
  }
  for (const e of diff.removed) console.log(`[test-surface] REMOVED 豁免（孤儿——快照有台账无，不拦）${e.file}「${summarize(e.caseTitle ?? e.assertionText ?? e.skipSiteText ?? '', 40)}」`)
  if (failures.length > 0 || zeroHit.length > 0) {
    for (const f of failures) console.error(`[test-surface] FAIL ${f.kind} ${fmtRelLine(f.path, f.line)} 「${f.text}」`)
    // 无豁免通道的 failure kind 全集=TICKETS_MISSING/ONLY_FORBIDDEN（主控加固批
    // k1-W1 原列三者——F-TESTREF-S3 起 FILE_MISSING 增 FILE 级豁免通道，judge 内
    // 先查豁免未中才落 failures；TICKETS_MISSING/ONLY_FORBIDDEN 恒不查豁免直落
    // failures——逐 kind 对照豁免调用点核验；其余 kind 均有 exemptionHits 通道）
    const hardKinds = failures.filter((f) => f.kind === 'TICKETS_MISSING' || f.kind === 'ONLY_FORBIDDEN').length
    die(4, `[test-surface] baseline 对账失败（exit 4 拒写，基线保持原内容）：轴一漏登 ${failures.length} 处 + 轴二多登（零命中）${zeroHit.length} 处——退役/收紧面先登 scripts/test-surface.exemptions.json（reason+rulingLink；删整测试文件类=FILE 级条目 file+fileScope:true），多登条目须本轮真实命中${hardKinds > 0 ? `；含工单号消失/only 用例类契约违背 ${hardKinds} 处——无豁免通道，须人工裁决后删除旧基线文件显式重跑 baseline（首装语义重建）` : ''}`)
  }
  console.log(`[test-surface] baseline 对账通过：retiring ${retiringFaces.length}（豁免命中 ${exemptHitKeys.size}）added ${diff.added.length}（命中 ${addedHit}）removed ${diff.removed.length}`)
  writeOut()
}

// cmdCheck（F-TESTREF-S2 隔离声明 k1-N3/d1-W2）：check 子命令只消费 loadBaseline
// 的 files/stats——不读 snapshot/snapshotCorrupt 字段（豁免快照为 baseline 专用轴二
// 基准；「本体合法仅快照坏」在 check 侧=完全正常通过，修复入口=显式 baseline 再生成）
function cmdCheck(root) {
  const bl = loadBaseline(root)
  if (bl.missing || bl.corrupt) {
    die(2, `[test-surface] 基线${bl.missing ? '缺失' : '损坏'}：${BASELINE_PATH}（exit 2 硬阻断禁自愈）——显式执行 \`npm run test-surface:baseline\` 再生成并对基线 diff 做全量审计`)
  }
  loadExemptionsCache = loadExemptions(root)
  const { surfaces, unresolvable } = extractAll(root)
  for (const u of unresolvable) console.error(`UNRESOLVABLE ${u.file}:${u.line} ${u.reason}`)
  const { failures, deltas, exemptHitKeys, statsLine } = judge(bl.files, surfaces)
  console.log(`[test-surface] ${statsLine}`)
  for (const d of deltas) console.log(`[test-surface] ${d}`)
  console.log(`[test-surface] exemptions entries: ${loadExemptionsCache.entries.length} hits: ${exemptHitKeys.size} stale: ${loadExemptionsCache.entries.length - exemptHitKeys.size}`)
  if (unresolvable.length > 0) {
    console.error(`[test-surface] FAIL 抽取含 ${unresolvable.length} 处不可静态判定`)
    die(1, '[test-surface] 检查未通过：UNRESOLVABLE（hint: 动态形态改写为静态，或走 scripts/test-surface.exemptions.json 豁免通道）')
  }
  if (failures.length > 0) {
    for (const f of failures) console.error(`[test-surface] FAIL ${f.kind} ${fmtRelLine(f.path, f.line)} 「${f.text}」`)
    die(1, `[test-surface] 检查未通过：${failures.length} 处契约违背（hint: 若为有意收紧/删改，先取主控裁决，再落 scripts/test-surface.exemptions.json 豁免通道 reason+rulingLink；删整测试文件类=FILE 级条目 file+fileScope:true）`)
  }
  console.log('[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd()
  const cmd = process.argv[2] ?? 'check'
  if (cmd === 'stats') cmdStats(root)
  else if (cmd === 'baseline') cmdBaseline(root)
  else if (cmd === 'check') cmdCheck(root)
  else die(1, `[test-surface] 未知子命令：${cmd}（可用：check（默认）/ baseline / stats）`)
}
