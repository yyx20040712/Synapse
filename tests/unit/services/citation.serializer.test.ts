import { describe, expect, it } from 'vitest'
import {
  serializeApa,
  serializeGbt7714,
  type CitationEntryData
} from '../../../src/main/services/export_/citation.serializer'

/** 基样（全字段——golden 输出逐字锁定） */
const FULL: CitationEntryData = {
  title: 'Water Quality',
  authors: ['Li Wang', 'Tom Lee', 'Ann Sun'],
  year: 2024,
  venue: 'Water Research',
  doi: '10.1/x'
}

// always-active：引用序列化纯函数 golden（B3 批新面——规则单源=serializer 头注）
describe('B3 citation.serializer —— GB/T 7714 顺序编码制单条（golden）', () => {
  it('全字段：≤3 作者全列+[J] 期刊段+年份+DOI 段，句点结尾（不带 [1] 编号——单条复制场景）', () => {
    expect(serializeGbt7714(FULL)).toBe(
      'Li Wang, Tom Lee, Ann Sun. Water Quality[J]. Water Research, 2024. DOI: 10.1/x.'
    )
  })

  it('>3 作者：前三+「, 等」；纯 CJK 作者同名规则', () => {
    expect(
      serializeGbt7714({ ...FULL, authors: ['张三丰', '李四光', '王二三', '赵六'] })
    ).toBe('张三丰, 李四光, 王二三, 等. Water Quality[J]. Water Research, 2024. DOI: 10.1/x.')
    // 恰 3 人=全列不加等
    expect(serializeGbt7714({ ...FULL, authors: ['张三丰', '李四光', '王二三'] })).toBe(
      '张三丰, 李四光, 王二三. Water Quality[J]. Water Research, 2024. DOI: 10.1/x.'
    )
  })

  it('venue 空：省略 [J] 与期刊段（年份独立成段）；year null：省略年份；doi 空：省略 DOI 段', () => {
    expect(serializeGbt7714({ ...FULL, venue: '' })).toBe(
      'Li Wang, Tom Lee, Ann Sun. Water Quality. 2024. DOI: 10.1/x.'
    )
    expect(serializeGbt7714({ ...FULL, year: null })).toBe(
      'Li Wang, Tom Lee, Ann Sun. Water Quality[J]. Water Research. DOI: 10.1/x.'
    )
    expect(serializeGbt7714({ ...FULL, doi: null })).toBe(
      'Li Wang, Tom Lee, Ann Sun. Water Quality[J]. Water Research, 2024.'
    )
  })

  it('极简面：无作者/年份/期刊/DOI=仅题名+句点', () => {
    expect(
      serializeGbt7714({ title: 'Untitled', authors: [], year: null, venue: '', doi: null })
    ).toBe('Untitled.')
  })
})

describe('B3 citation.serializer —— APA 第 7 版（golden）', () => {
  it('西文三作者：姓, 名缩写.+逗号连接+末位 & ；DOI 段=https 前缀无尾句点', () => {
    expect(serializeApa(FULL)).toBe(
      'Wang, L., Lee, T., & Sun, A. (2024). Water Quality. Water Research. https://doi.org/10.1/x'
    )
  })

  it('西文一/二作者：单人无连接符；两人 A & B；多词名逐 token 缩写', () => {
    expect(serializeApa({ ...FULL, authors: ['Li Wang'] })).toBe(
      'Wang, L. (2024). Water Quality. Water Research. https://doi.org/10.1/x'
    )
    expect(serializeApa({ ...FULL, authors: ['Li Wang', 'Tom Lee'] })).toBe(
      'Wang, L., & Lee, T. (2024). Water Quality. Water Research. https://doi.org/10.1/x'
    )
    expect(serializeApa({ ...FULL, authors: ['Jean Claude Van Damme'] })).toContain('Damme, J. C. V. (2024)')
  })

  it('CJK 无空格作者：原样（启发式局限——authors 无姓名结构）；两人 `, & ` 连接（正形统一）', () => {
    expect(serializeApa({ ...FULL, authors: ['张三丰', '李四光'] })).toBe(
      '张三丰, & 李四光 (2024). Water Quality. Water Research. https://doi.org/10.1/x'
    )
  })

  it('year null=(n.d.)；venue 空省略其段；doi 空省略 URL 段且以句点结尾', () => {
    expect(serializeApa({ ...FULL, year: null })).toContain('(n.d.). Water Quality')
    expect(serializeApa({ ...FULL, venue: '' })).toBe(
      'Wang, L., Lee, T., & Sun, A. (2024). Water Quality. https://doi.org/10.1/x'
    )
    expect(serializeApa({ ...FULL, doi: null })).toBe(
      'Wang, L., Lee, T., & Sun, A. (2024). Water Quality. Water Research.'
    )
  })
})
