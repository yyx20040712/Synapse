/**
 * [F-VISFB-43 U2] figure-decode 纯核单测（kind 1·2 → RGBA）。
 * 蓝本=00B 接手单 §一（kind1=GRAYSCALE_1BPP 行字节 ⌈w/8⌉ packed/2=RGB_24BPP）
 * +pdfjs putBinaryImageData 同构位展（MSB 先行，1=白 0=黑，alpha 恒 255）。
 * always-active（不经 guardedDescribe——K3 沿承）。
 */
import { describe, expect, it } from 'vitest'
import {
  decodeToRgba,
  rawDataView,
  type DecodedImageObj
} from '../../../src/renderer/shared/figures/figure-decode'

function obj(patch: Partial<DecodedImageObj>): DecodedImageObj {
  return { width: 1, height: 1, kind: 2, data: new Uint8ClampedArray([1, 2, 3]), ...patch }
}

describe('[F-VISFB-43 U2] figure-decode 纯核', () => {
  it('kind1 位展：MSB 先行，1=白 0=黑，alpha 恒 255（2×2 双行字节）', () => {
    const out = decodeToRgba(obj({ width: 2, height: 2, kind: 1, data: new Uint8ClampedArray([0b10000000, 0b01000000]) }))
    expect(Array.from(out.rgba)).toEqual([
      255, 255, 255, 255,
      0, 0, 0, 255,
      0, 0, 0, 255,
      255, 255, 255, 255
    ])
  })

  it('kind1 行字节=⌈w/8⌉：w=9 两字节行，第 9 像素取第二字节 MSB', () => {
    const out = decodeToRgba(obj({ width: 9, height: 1, kind: 1, data: new Uint8ClampedArray([0b11111111, 0b10000000]) }))
    expect(out.rgba.length).toBe(36)
    expect(Array.from(out.rgba.slice(0, 8))).toEqual([255, 255, 255, 255, 255, 255, 255, 255])
    expect(Array.from(out.rgba.slice(32, 36))).toEqual([255, 255, 255, 255])
  })

  it('kind2 RGB→RGBA：逐像素三字节+alpha 255（1×2 竖条）', () => {
    const out = decodeToRgba(obj({ width: 1, height: 2, kind: 2, data: new Uint8ClampedArray([1, 2, 3, 4, 5, 6]) }))
    expect(Array.from(out.rgba)).toEqual([1, 2, 3, 255, 4, 5, 6, 255])
  })

  it('kind3（RGBA_32BPP）与未知 kind 均拒（本票解码面=kind 1·2——00B 口径）', () => {
    expect(() => decodeToRgba(obj({ kind: 3, data: new Uint8ClampedArray(4) }))).toThrow(/kind/)
    expect(() => decodeToRgba(obj({ kind: 0, data: new Uint8ClampedArray(1) }))).toThrow(/kind/)
  })

  it('零维与数据短少均拒（防短读 UB）', () => {
    expect(() => decodeToRgba(obj({ width: 0, height: 1 }))).toThrow(/宽高/)
    expect(() => decodeToRgba(obj({ width: 4, height: 2, kind: 1, data: new Uint8ClampedArray(1) }))).toThrow(/不足/)
    expect(() => decodeToRgba(obj({ width: 4, height: 2, data: new Uint8ClampedArray(8) }))).toThrow(/不足/)
  })

  it('rawDataView：ClampedArray 带偏移视图→精确字节切片（摘要输入单源）', () => {
    const buf = new ArrayBuffer(10)
    const u8 = new Uint8ClampedArray(buf, 2, 6)
    u8.set([11, 12, 13, 14, 15, 16])
    const view = rawDataView({ width: 1, height: 1, kind: 2, data: u8 })
    expect(view.byteLength).toBe(6)
    expect(Array.from(view)).toEqual([11, 12, 13, 14, 15, 16])
  })
})
