/**
 * 事件面 zod 校验单口——main→renderer 五事件（importProgress/
 * exportCorpus/windowState+foldersChanged/lineageChanged）载荷 schema 集合，
 * 供 preload 接收侧 safeParse 兜底消费；与 api-surface.ts 的 PreloadEvents
 * 类型同目录邻近防漂移——新增事件通道 = 接线表 EVENT_CHANNELS + 本件两处
 * 对齐，preload 兜底不漏新通道。
 *
 * 单源纪律：schema 本体定义处 = ./schemas（与 invoke 面入侧校验同源件），
 * 本件仅做 re-export 与判别联合组装，禁在此手写第二份等价定义（类型单一
 * 真相源；漂移锚 = tests/unit/events-schemas.test.ts 的类型断言）。
 *
 * 校验方向（zod = 入侧单向 + 事件面 preload 侧兜底）：
 * - invoke 请求（renderer→main）：main 侧 register.ts strict 入侧校验（既有）；
 * - 事件推送（main→renderer）：main = 受信生产者不重复校验（镜像入侧单向
 *   纪律，防线不增殖——零改 main 发送点）；preload 接收侧 safeParse 兜底，
 *   失败 = console.warn + 丢弃该帧，订阅存活（D-GOV-4：三事件均通知/进度
 *   类，丢帧 = 陈旧一拍自愈；done 帧属正常载荷不经丢弃路径——丢弃仅畸形
 *   帧触发，可信生产者下永不路径防御，事件流不因单帧死亡）。
 */
import { z } from 'zod'
import {
  extractRequestEventSchema,
  exportProgressEventSchema,
  importProgressEventSchema,
  windowStateEventSchema,
  foldersChangedEventSchema,
  lineageChangedEventSchema
} from './schemas'

export { importProgressEventSchema, windowStateEventSchema, foldersChangedEventSchema, lineageChangedEventSchema }

/**
 * exportCorpus 事件载荷（判别键 type：'extract-request' | 'progress'）——
 * schemas.ts 手工 type 联合 ExportCorpusEvent 的运行时校验对应物（一致性由
 * events-schemas.test 的类型漂移锚 + 双分支正反例强制）。
 */
export const exportCorpusEventSchema = z.union([
  extractRequestEventSchema,
  exportProgressEventSchema
])
