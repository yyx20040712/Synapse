/**
 * [F-VISFB-43] figure-decode —— image XObject 解码位图展开（纯核，pdfjs-free）。
 * 蓝本=00B 接手单 §一：objs/commonObjs 注册表取数 get().{width,height,kind,data}
 * ——kind 1=GRAYSCALE_1BPP（行字节 ⌈w/8⌉ packed）/2=RGB_24BPP（00B 语料实见
 * 两 kind；kind 3 及其余=本票解码面外，抛错记 per-asset 失败）。
 * 位展与 pdfjs putBinaryImageData 同构：MSB 先行，1=白 0=黑，alpha 恒 255。
 * ── 行为层 ── rawDataView=去重摘要输入视图（byteOffset 对齐精确切片——
 * ClampedArray 常驻更大 buffer，禁直接整 buffer 摘要）。
 * ── 文化层 ── 测试：tests/unit/renderer/figure-decode.test.ts（always-active）。
 */

/** 注册表对象结构子集（PDFImageProxy objs.get 产物——测试桩同形） */
export interface DecodedImageObj {
  width: number
  height: number
  kind: number
  data: Uint8ClampedArray | Uint8Array
}

export interface DecodedRgba {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export class FigureDecodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FigureDecodeError'
  }
}

/** 去重摘要输入视图：data 的精确字节切片（不拷贝内容的视图语义，摘要器消费） */
export function rawDataView(obj: DecodedImageObj): Uint8Array {
  return new Uint8Array(obj.data.buffer, obj.data.byteOffset, obj.data.length)
}

/** kind1 行字节数（⌈w/8⌉ packed） */
function rowBytesOf(width: number): number {
  return (width + 7) >> 3
}

export function decodeToRgba(obj: DecodedImageObj): DecodedRgba {
  const { width, height, kind, data } = obj
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new FigureDecodeError(`图像宽高非法：${String(width)}×${String(height)}`)
  }
  const rgba = new Uint8ClampedArray(width * height * 4)
  if (kind === 1) {
    const rowBytes = rowBytesOf(width)
    if (data.length < rowBytes * height) {
      throw new FigureDecodeError(`kind1 数据不足：${String(data.length)} < ${String(rowBytes * height)}`)
    }
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const byte = data[y * rowBytes + (x >> 3)] ?? 0
        const bitSet = (byte >> (7 - (x & 7))) & 1
        const o = (y * width + x) * 4
        const v = bitSet === 1 ? 255 : 0
        rgba[o] = v
        rgba[o + 1] = v
        rgba[o + 2] = v
        rgba[o + 3] = 255
      }
    }
    return { width, height, rgba }
  }
  if (kind === 2) {
    const need = width * height * 3
    if (data.length < need) {
      throw new FigureDecodeError(`kind2 数据不足：${String(data.length)} < ${String(need)}`)
    }
    for (let i = 0; i < width * height; i += 1) {
      const s = i * 3
      const o = i * 4
      rgba[o] = data[s] ?? 0
      rgba[o + 1] = data[s + 1] ?? 0
      rgba[o + 2] = data[s + 2] ?? 0
      rgba[o + 3] = 255
    }
    return { width, height, rgba }
  }
  throw new FigureDecodeError(`不支持的图像 kind：${String(kind)}（本票解码面=1·2）`)
}
