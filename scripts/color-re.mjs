/**
 * color-re.mjs —— [F-LINT-04 ③] 色值检测正则/剥离器单源（受锁文件）。
 * 消费方（均 import 本件，双写面物理消失）：
 *   - scripts/check-quality.mjs 第 6 段（C-4 CSS 面 postcss walkDecls +
 *     ② 色值域 token 同值守卫 + ③ 哨兵的 META_RE）
 *   - eslint.config.js B-5 rule（tsx inline style 面）
 * import 失败=fail-closed 自然抛错——消费方禁 try/catch 回退内联正则
 * （回退=③静默失效）；check-quality 6b 哨兵段对两消费文件文本 matchAll
 * (META_RE) 计数>0 即红。本件是 COLOR_RE 字面量的唯一合法宿主，不在
 * 哨兵扫描面（哨兵扫描面显式枚举=两消费文件）。
 *
 * 禁令：COLOR_RE 禁 g/y 标志——RegExp 实例被多消费方共享，g/y 的
 * lastIndex 跨调用残留=随机漏报（deepseek 审核硬约束，2026-09-10）。
 * 现行标志=i（CSS 函数名大小写不敏感：RGB(255,0,0) 合法渲染生效——
 * 补审 Kimi p1 B-1；hex 段已含 A-F 加 i 无副作用）。
 *
 * META_RE=③哨兵特征正则（第三副本闭合——识别「内联 hex 正则文本形态」，
 * 即 hex 字符类紧随 {3,8} 量词的无反斜杠文本序列）：正则字面量与
 * new RegExp('...') 字符串形态都命中；自身 source 是带反斜杠形态，
 * 即使被误扫也不自咬。带 g——matchAll 消费所必需，且 matchAll 内部
 * 克隆正则不动原实例 lastIndex；仅限 matchAll 只读遍历，禁挪作 test。
 *
 * stripUrlFunctions=[F-LINT-04 ⑦] url() 剥离（url(#x)=SVG filter/gradient
 * 的 id 引用非色值——`fill: url(#face)` 不红/`color: #face` 红双验收）。
 * 实现选择（申报）：检测使用处剥离而非 COLOR_RE 内负向后顾——url(
 * data:...#abc) 中段 hex 与 url("...#fff") 引号隔断形态，后顾断言
 * 盖不住，剥离为语义正解；引号感知状态机而非 /url\([^)]*\)/ 正则
 * （引号内 ) 截断坑——deepseek 审核 §6；postcss 主包不含独立 value
 * parser，树内无 postcss-value-parser，手写状态机零依赖语义等同）。
 */
export const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i
export const META_RE = /\[0-9a-fA-F]\{3,8\}/g

/** 剥离 value 中全部 url(...) 片段（引号感知；CSS 面 postcss decl.value
 *  与 tsx 面 inline style 字符串共用）。 */
export function stripUrlFunctions(value) {
  let out = ''
  let i = 0
  while (i < value.length) {
    const m = /^url\(/i.exec(value.slice(i))
    if (m) {
      i += m[0].length
      let quote = null
      while (i < value.length) {
        const c = value[i]
        if (quote) {
          if (c === '\\') {
            i += 2
            continue
          }
          if (c === quote) quote = null
          i++
        } else if (c === '"' || c === "'") {
          quote = c
          i++
        } else if (c === ')') {
          i++
          break
        } else i++
      }
      out += 'url()'
    } else {
      out += value[i]
      i++
    }
  }
  return out
}
