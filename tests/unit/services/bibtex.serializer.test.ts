import { expect, it } from 'vitest'
import {
  bibtexEscape,
  makeCitationKey,
  serializeBibtex,
  type BibtexEntryData
} from '../../../src/main/services/export_/bibtex.serializer'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-SVC-07', 'bibtex.serializer —— 转义与序列化（golden）', () => {
  it('bibtexEscape：LaTeX 特殊字符全转义、换行变空格', () => {
    expect(bibtexEscape('a{b}c')).toBe('a\\{b\\}c')
    expect(bibtexEscape('100%_$#&')).toBe('100\\%\\_\\$\\#\\&')
    expect(bibtexEscape('x~y^z')).toBe('x\\textasciitilde{}y\\textasciicircum{}z')
    expect(bibtexEscape('a\\b')).toBe('a\\\\b')
    expect(bibtexEscape('第一行\n第二行')).toBe('第一行 第二行')
  })

  it('makeCitationKey：首作者+年份+标题词，小写去非法字符', () => {
    expect(makeCitationKey('Water Quality Model', 2024, 'Wang')).toBe('wang2024water')
    expect(makeCitationKey('智慧水务：综述与展望', null, '张')).toBe('zhang_smart') // 无年份跳段
  })

  it('serializeBibtex golden：字段顺序/缺省省略/author join(and)', () => {
    const entries: BibtexEntryData[] = [
      {
        key: 'wang2024water',
        type: 'article',
        title: 'Water Quality: Model & Application',
        authors: ['Li Wang', 'Tom Lee'],
        year: 2024,
        venue: 'Water Research',
        doi: '10.1/x'
      },
      {
        key: 'anon',
        type: 'misc',
        title: 'Untitled',
        authors: [],
        year: null,
        venue: '',
        doi: null
      }
    ]
    expect(serializeBibtex(entries)).toBe(
      [
        '@article{wang2024water,',
        '  author = {Li Wang and Tom Lee},',
        '  title = {Water Quality: Model \\& Application},',
        '  journal = {Water Research},',
        '  year = {2024},',
        '  doi = {10.1/x}',
        '}',
        '@misc{anon,',
        '  title = {Untitled}',
        '}',
        ''
      ].join('\n')
    )
  })

  it('inproceedings 用 booktitle 字段名；空数组返回空串', () => {
    const one: BibtexEntryData[] = [
      { key: 'k', type: 'inproceedings', title: 'T', authors: ['A'], year: 2020, venue: 'V', doi: null }
    ]
    expect(serializeBibtex(one)).toContain('booktitle = {V}')
    expect(serializeBibtex([])).toBe('')
  })
})
